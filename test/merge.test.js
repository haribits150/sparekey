/* Merge + input-preservation tests for the "fix now" round:
   - mergeCircle unions concurrent saves instead of last-write-wins
   - scoreboard total recomputes from entries (self-healing)
   - in-progress form input survives a re-render (cloud sync mid-typing) */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .replace("'use strict';", ''); // test scaffolding: expose fns on window

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;
w.localStorage.setItem('sparekey.device.v1', JSON.stringify({ welcomed: true }));
w.eval(appJs);

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}

const base = () => ({
  v: 1, name: 'C', inviteCode: 'ABCDEF', seq: 1,
  members: { u1: { name: 'Hari', photo: null } },
  listings: [], requests: [], stays: [], manuals: [],
  incidents: [], unanswered: [],
  score: { totalNights: 0, entries: [] },
});

// M1: two phones append different listings -> both survive the merge
{
  const remote = base(); remote.listings = [{ id: 'l1', hostId: 'u1', status: 'open' }];
  const local = base(); local.listings = [{ id: 'l2', hostId: 'u1', status: 'open' }];
  const m = w.mergeCircle(remote, local);
  check('M1 concurrent appends union', m.listings.length === 2 &&
    m.listings.some(l => l.id === 'l1') && m.listings.some(l => l.id === 'l2'));
}

// M2: same item edited on both phones -> the saver (local) wins, per item
{
  const remote = base(); remote.requests = [{ id: 'r1', status: 'pending' }];
  const local = base(); local.requests = [{ id: 'r1', status: 'approved' }];
  const m = w.mergeCircle(remote, local);
  check('M2 same-id conflict prefers local', m.requests.length === 1 && m.requests[0].status === 'approved');
}

// M3: two phones ask the concierge on the same stay -> both Q&As kept
{
  const mk = log => Object.assign(base(), {
    stays: [{ id: 's1', status: 'active', conciergeLog: log }],
  });
  const remote = mk([{ q: 'wifi?', a: { section: 'wifi', body: 'abc123' } }]);
  const local = mk([{ q: 'parking?', a: { section: 'rules', body: 'driveway' } }]);
  const m = w.mergeCircle(remote, local);
  check('M3 nested conciergeLog unions', m.stays.length === 1 && m.stays[0].conciergeLog.length === 2);
}

// M4: concurrent checkouts -> entries union AND total recomputed (no desync)
{
  const remote = base();
  remote.score = { totalNights: 2, entries: [{ stayId: 's1', nights: 2, rate: 150 }] };
  const local = base();
  local.score = { totalNights: 3, entries: [{ stayId: 's2', nights: 3, rate: 150 }] };
  const m = w.mergeCircle(remote, local);
  check('M4 score self-heals', m.score.entries.length === 2 && m.score.totalNights === 5);
}

// M5: interview answers merge key-wise, guestbook unions across devices
{
  const remote = base();
  remote.stays = [{ id: 's1', interviewAnswers: { rules: 'no shoes' } }];
  remote.manuals = [{ id: 'm1', status: 'published', sections: {}, guestbook: [{ by: 'u2', text: 'great stay' }] }];
  const local = base();
  local.stays = [{ id: 's1', interviewAnswers: { wifi: 'abc' } }];
  local.manuals = [{ id: 'm1', status: 'published', sections: {}, guestbook: [{ by: 'u3', text: 'thanks!' }] }];
  const m = w.mergeCircle(remote, local);
  const s = m.stays[0], man = m.manuals[0];
  check('M5 interview answers union', s.interviewAnswers.rules === 'no shoes' && s.interviewAnswers.wifi === 'abc');
  check('M5 guestbook unions', man.guestbook.length === 2);
}

// M6: null remote (first write) -> local passes through; null local -> remote kept
{
  const local = base(); local.listings = [{ id: 'l9' }];
  check('M6a null remote', w.mergeCircle(null, local).listings.length === 1);
  const remote = base(); remote.listings = [{ id: 'l8' }];
  check('M6b null local', w.mergeCircle(remote, null).listings.length === 1);
}

// M7: RTDB-stripped remote (missing arrays) merges cleanly
{
  const remote = { name: 'C', members: { u1: { name: 'Hari' } } }; // arrays stripped
  const local = base(); local.requests = [{ id: 'r1', status: 'pending' }];
  const m = w.mergeCircle(remote, local);
  check('M7 stripped remote merges', m.requests.length === 1 && Array.isArray(m.listings) && m.score.totalNights === 0);
}

// M8: typing in a field, then a re-render (remote sync) -> text + focus kept
{
  const view = w.document.getElementById('view');
  view.innerHTML = '<form data-form="concierge" data-id="s1"><div class="composer">' +
    '<input name="q" type="text" value=""></div></form>';
  const input = view.querySelector('input[name="q"]');
  input.value = 'What is the wifi';
  input.focus();
  try { input.setSelectionRange(5, 5); } catch (e) {}
  const snap = w.snapshotViewFields();
  // simulate the re-render: brand-new DOM nodes, same field identity
  view.innerHTML = '<form data-form="concierge" data-id="s1"><div class="composer">' +
    '<input name="q" type="text" value=""></div></form>';
  w.restoreViewFields(snap);
  const after = view.querySelector('input[name="q"]');
  check('M8 draft text survives re-render', after.value === 'What is the wifi');
  check('M8 focus restored', w.document.activeElement === after);
}

// M9: a just-submitted form is NOT restored (its values were consumed)
{
  const view = w.document.getElementById('view');
  view.innerHTML = '<form data-form="concierge" data-id="s1" data-just-submitted="1">' +
    '<input name="q" type="text" value="already asked"></form>';
  const snap = w.snapshotViewFields();
  view.innerHTML = '<form data-form="concierge" data-id="s1"><input name="q" type="text" value=""></form>';
  w.restoreViewFields(snap);
  check('M9 submitted form stays empty', view.querySelector('input[name="q"]').value === '');
}

// M10: checkbox state (checkout checklist) survives a remote re-render
{
  const view = w.document.getElementById('view');
  view.innerHTML = '<form data-form="checkout" data-id="s1">' +
    '<input type="checkbox" name="c0" checked><input type="checkbox" name="c1"></form>';
  view.querySelector('input[name="c1"]').checked = true;
  const snap = w.snapshotViewFields();
  view.innerHTML = '<form data-form="checkout" data-id="s1">' +
    '<input type="checkbox" name="c0"><input type="checkbox" name="c1"></form>';
  w.restoreViewFields(snap);
  const boxes = view.querySelectorAll('input[type="checkbox"]');
  check('M10 checkbox state survives', boxes[0].checked === true && boxes[1].checked === true);
}

console.log('\n==== ' + pass + '/' + total + ' passed ====');
process.exit(pass === total ? 0 : 1);
