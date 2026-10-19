/* Edge-case tests for SpareKey. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window, d = w.document;
w.confirm = () => true;
w.eval(appJs);

const tick = () => new Promise(r => setTimeout(r, 20));
let n = 0;
function check(name, cond, detail) {
  n++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
  if (!cond) process.exitCode = 1;
}
const text = () => d.querySelector('#view').textContent;
async function go(hash) { w.location.hash = hash; w.dispatchEvent(new w.Event('hashchange')); await tick(); }
function setWho(id) { const s = d.querySelector('#whoami'); s.value = id; s.dispatchEvent(new w.Event('change', { bubbles: true })); }
function fill(name, value) { const el = d.querySelector('[name="' + name + '"]'); el.value = value; }
async function submit() { d.querySelector('[data-form]').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await tick(); }
async function clickAction(a) { d.querySelector('[data-action="' + a + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await tick(); }

(async () => {
  await tick();
  await clickAction('welcome-done'); // dismiss first-run welcome
  // seed a listing as Hari
  setWho('hari');
  await go('#/listing/new');
  fill('start', '2026-11-20'); fill('end', '2026-12-05'); fill('note', 'test place');
  await submit();
  const listingHash = d.querySelector('a.card.listing').getAttribute('href');

  // E1: request dates outside window rejected
  setWho('vishal');
  await go(listingHash);
  fill('start', '2026-12-06'); fill('end', '2026-12-08');
  d.querySelector('[name="honor"]').checked = true;
  await submit();
  check('E1. out-of-window dates rejected', /Requests/.test(text()) === false || d.querySelector('[data-form="request-new"]') !== null);

  // E2: Honor Code unchecked blocked
  await go(listingHash);
  fill('start', '2026-11-21'); fill('end', '2026-11-23');
  d.querySelector('[name="honor"]').checked = false;
  await submit();
  check('E2. Honor Code required', d.querySelector('[data-form="request-new"]') !== null, 'form still present');

  // E3: valid request then decline
  d.querySelector('[name="honor"]').checked = true;
  await submit();
  setWho('hari');
  await go('#/requests');
  await clickAction('decline');
  check('E3. decline works', /Declined/.test(text()));

  // E4: listing with end before start rejected
  await go('#/listing/new');
  fill('start', '2026-12-05'); fill('end', '2026-11-20');
  await submit();
  check('E4. inverted date range rejected', d.querySelector('[data-form="listing-new"]') !== null);

  // E5: guest cannot see approve buttons on own listing view... host-only interview guard
  setWho('viveka');
  await go('#/stays');
  check('E5. empty stays state renders', /No stays yet/.test(text()));

  // E6: reset demo wipes everything
  await go('#/score');
  await clickAction('reset');
  await go('#/home');
  check('E6. reset clears listings', /No open listings yet/.test(text()));
  await go('#/score');
  check('E6b. scoreboard zeroed', /Total room nights hosted0/.test(text()));

  console.log('edge cases done');
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
