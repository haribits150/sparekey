/* Black-box acceptance test: runs the MVP demo script against the real app in jsdom. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window, d = w.document;
w.confirm = () => true;
w.eval(appJs); // boot the app (script src 404s silently; this is the real boot)

const tick = () => new Promise(r => setTimeout(r, 20));
const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail || '' });
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}
const text = () => d.querySelector('#view').textContent;

async function go(hash) {
  w.location.hash = hash;
  w.dispatchEvent(new w.Event('hashchange'));
  await tick();
}
function setWho(id) {
  const sel = d.querySelector('#whoami');
  sel.value = id;
  sel.dispatchEvent(new w.Event('change', { bubbles: true }));
}
function fill(name, value) {
  const el = d.querySelector('[name="' + name + '"]');
  if (!el) throw new Error('missing field ' + name);
  el.value = value;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
}
async function submit() {
  const f = d.querySelector('[data-form]');
  if (!f) throw new Error('no form on screen');
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
}
async function clickAction(action) {
  const el = d.querySelector('[data-action="' + action + '"]');
  if (!el) throw new Error('missing action ' + action);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
}
function checkAllBoxes() {
  d.querySelectorAll('[data-form="checkout"] input[type="checkbox"]').forEach(b => {
    b.checked = true;
    b.dispatchEvent(new w.Event('change', { bubbles: true }));
  });
}

(async () => {
  await tick();
  // first-run welcome → dismiss to reach the app
  check('0. welcome screen shows', /How it works/.test(text()));
  await clickAction('welcome-done');
  check('0b. welcome dismissed', /Your circle/.test(text()));

  // STEP 1: Hari posts listing
  setWho('hari');
  await go('#/listing/new');
  fill('start', '2026-11-20'); fill('end', '2026-12-05');
  fill('rate', '180'); fill('note', '2BR in Bellevue, 10 min to downtown');
  await submit();
  check('1. listing posted', /Bellevue/.test(text()), 'on home screen');

  // STEP 2: Prem requests 4 nights + Honor Code
  setWho('prem');
  const listingLink = d.querySelector('a.card.listing').getAttribute('href');
  await go(listingLink);
  fill('start', '2026-11-21'); fill('end', '2026-11-25');
  fill('note', 'Visiting for the long weekend');
  d.querySelector('[name="honor"]').checked = true;
  await submit();
  check('2. request sent w/ Honor Code', /Your requests/.test(text()) && /Pending/.test(text()));

  // STEP 3: Hari approves + interview + publish
  setWho('hari');
  await go('#/requests');
  await clickAction('approve');
  check('3a. approved, stay created', /Start the manual interview/.test(text()));
  const stayHash = w.location.hash;
  await go('#/interview/' + stayHash.split('/')[2]);
  const answers = [
    'Quiet hours after 10pm, shoes off at the door',
    'Dishwasher is finicky — use the pods under the sink',
    'Network HomeNet, password bellevue123',
    'Park in the driveway, second spot',
    'Water the plants weekly, trash day is Tuesday',
    'Water shutoff in the garage, call me first',
  ];
  for (const a of answers) { fill('answer', a); await submit(); }
  await clickAction('draft-manual');
  check('3b. manual drafted', /House manual/.test(text()) && /Publish to guest/.test(text()));
  check('3c. visitor-kit checklist in draft', /Fresh towels/.test(text()) && /Fresh bedsheets/.test(text()));
  // publish via the publish button
  const pubBtn = d.querySelector('button[value="publish"]');
  pubBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
  check('3d. manual published, stay active', /Active/.test(text()), 'stay detail');

  // STEP 4: concierge as Prem — 4 answered, 1 deflected
  setWho('prem');
  await go('#/concierge/' + stayHash.split('/')[2]);
  async function ask(q) {
    fill('q', q);
    await submit();
    const msgs = d.querySelectorAll('#chat .msg.ai');
    return msgs[msgs.length - 1].textContent;
  }
  const a1 = await ask("What's the wifi password?");
  const a2 = await ask('Where do I park?');
  const a3 = await ask('What time is checkout?');
  const a4 = await ask('How does the dishwasher work?');
  const a5 = await ask('Can I bring my dog?');
  check('4a. wifi answered w/ citation', /bellevue123/.test(a1) && /house manual/i.test(a1), a1.slice(0, 60));
  check('4b. parking answered w/ citation', /driveway/.test(a2) && /house manual/i.test(a2), a2.slice(0, 60));
  check('4c. checkout answered w/ citation', /house manual/i.test(a3), a3.slice(0, 60));
  check('4d. dishwasher answered w/ citation', /pods/.test(a4) && /house manual/i.test(a4), a4.slice(0, 60));
  check('4e. dog question deflected', /don.t know/i.test(a5) && /ask your host/i.test(a5), a5.slice(0, 60));

  // STEP 5: checkout + incident, host resolves
  await go('#/checkout/' + stayHash.split('/')[2]);
  checkAllBoxes();
  fill('idesc', 'Chipped a mug');
  fill('ires', "I'll replace it this week");
  await submit();
  check('5a. checked out w/ incident', /Closed/.test(text()) && /Chipped a mug/.test(text()));
  setWho('hari');
  await go(stayHash);
  await clickAction('resolve-incident');
  check('5b. incident resolved', /Resolved/.test(text()));

  // STEP 6: scoreboard = 4 nights
  await go('#/score');
  check('6. scoreboard 4 nights', /4 nights/.test(text()));

  const failed = results.filter(r => !r.pass);
  console.log('\n==== ' + (results.length - failed.length) + '/' + results.length + ' passed ====');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(2); });
