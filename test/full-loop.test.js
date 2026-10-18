/* Full-loop Firebase regression: two users, one circle —
   listing -> request -> approve -> interview -> draft -> publish manual ->
   concierge -> checkout -> scoreboard. Mocked Firebase SDK + in-memory RTDB. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .replace("'use strict';", '');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const rdbData = {};
const rdbListeners = {};
function getPath(p) {
  return p.split('/').filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), rdbData);
}
function setPath(p, v) {
  const parts = p.split('/').filter(Boolean);
  let o = rdbData;
  parts.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; });
  o[parts[parts.length - 1]] = v;
}
function notify(changed) {
  Object.keys(rdbListeners).forEach(p => {
    if (changed === p || changed.startsWith(p + '/')) {
      rdbListeners[p].forEach(cb => cb({ val: () => getPath(p) }));
    }
  });
}
// RTDB strips empty arrays/nulls on write — replicate faithfully, since the
// app must survive reading back a node with missing keys.
function stripEmpties(v) {
  if (Array.isArray(v)) return v.length ? v.map(stripEmpties) : undefined;
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).forEach(k => {
      const sv = stripEmpties(v[k]);
      if (sv !== undefined) o[k] = sv;
    });
    return o;
  }
  return v;
}
function mockRef(p) {
  return {
    once: () => Promise.resolve({ val: () => getPath(p) }),
    on: (ev, cb) => {
      (rdbListeners[p] = rdbListeners[p] || []).push(cb);
      cb({ val: () => getPath(p) });
    },
    off: () => { delete rdbListeners[p]; },
    set: v => { setPath(p, stripEmpties(JSON.parse(JSON.stringify(v))) || {}); notify(p); return Promise.resolve(); },
    update: v => { setPath(p, Object.assign({}, getPath(p), v)); notify(p); return Promise.resolve(); },
    transaction: fn => {
      const cur = getPath(p);
      const next = fn(cur === undefined ? null : JSON.parse(JSON.stringify(cur)));
      setPath(p, stripEmpties(JSON.parse(JSON.stringify(next))) || {}); notify(p);
      return Promise.resolve({ committed: true, snapshot: { val: () => getPath(p) } });
    },
  };
}

function makeAuth(uid, name) {
  return {
    user: null, _cb: null,
    onAuthStateChanged(cb) { this._cb = cb; setTimeout(() => cb(this.user), 0); },
    signInWithPopup() {
      this.user = { uid, displayName: name, photoURL: null };
      setTimeout(() => this._cb(this.user), 0);
      return Promise.resolve({ user: this.user });
    },
    signOut() {
      this.user = null;
      setTimeout(() => this._cb(null), 0);
      return Promise.resolve();
    },
  };
}

function makePhone(auth) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
  const w = dom.window;
  w.localStorage.setItem('sparekey.device.v1', JSON.stringify({ welcomed: true }));
  w.SPAREKEY_FIREBASE = { apiKey: 'test-key' };
  const authNs = () => auth;
  authNs.GoogleAuthProvider = function () {};
  w.firebase = { initializeApp: () => ({}), auth: authNs, database: () => ({ ref: mockRef }) };
  const origCreate = w.document.createElement.bind(w.document);
  w.document.createElement = tag => {
    const el = origCreate(tag);
    if (tag === 'script') {
      let _src = '';
      Object.defineProperty(el, 'src', {
        get: () => _src,
        set: v => { _src = v; setTimeout(() => el.onload && el.onload(), 0); },
      });
    }
    return el;
  };
  w.eval(appJs);
  return w;
}

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}

// submit a synthetic form through the app's real handleForm; supports
// data-* attrs via dataset opt and checkbox fields via checks opt
function submitForm(w, kind, fields, opts) {
  opts = opts || {};
  const f = w.document.createElement('form');
  f.setAttribute('data-form', kind);
  Object.entries(opts.dataset || {}).forEach(([k, v]) => { f.dataset[k] = v; });
  f.innerHTML = Object.entries(fields).map(([k, v]) => {
    if (opts.checks && opts.checks.includes(k)) {
      return `<input type="checkbox" name="${k}" ${v ? 'checked' : ''}>`;
    }
    return `<input name="${k}" value="${String(v).replace(/"/g, '&quot;')}">`;
  }).join('');
  w.document.querySelector('#view').appendChild(f);
  w.handleForm(f);
  f.remove();
}
const circleOf = () => {
  const ids = Object.keys(rdbData.circles || {});
  return ids.length ? rdbData.circles[ids[0]] : null;
};
function navTo(w, hash) {
  w.location.hash = hash;
  w.dispatchEvent(new w.Event('hashchange'));
}

(async () => {
  const hari = makePhone(makeAuth('u_hari', 'Hari'));
  const prem = makePhone(makeAuth('u_prem', 'Prem'));
  await sleep(80);

  const hv = () => hari.document.querySelector('#view').innerHTML;
  const pv = () => prem.document.querySelector('#view').innerHTML;
  const hClick = sel => {
    const el = hari.document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };

  // --- Hari: login, create circle ---
  hari.document.querySelector('[data-action="google-login"]').click();
  await sleep(80);
  check('R1 hari reaches circle gate', hv().includes('Join a circle'));
  submitForm(hari, 'circle-create', { cname: 'Weekend crew' });
  await sleep(80);
  const c0 = circleOf();
  check('R2 circle created with invite code', !!(c0 && c0.inviteCode && c0.inviteCode.length === 6), c0 && c0.inviteCode);
  check('R3 hari sees home + invite code', hv().includes('Invite code'));
  const code = c0.inviteCode;

  // --- Prem: login, join with code ---
  prem.document.querySelector('[data-action="google-login"]').click();
  await sleep(80);
  submitForm(prem, 'circle-join', { code });
  await sleep(80);
  check('R4 prem joins via invite code', pv().includes('Weekend crew') || pv().includes('Invite code'));
  const members = Object.keys((circleOf().members || {}));
  check('R5 both members in circle', members.includes('u_hari') && members.includes('u_prem'), members.join(','));

  // --- Hari posts a listing; Prem requests it ---
  submitForm(hari, 'listing-new', { start: '2026-11-01', end: '2026-11-05', rate: '150', note: 't' });
  await sleep(80);
  const listing = (circleOf().listings || [])[0];
  check('R6 listing posted with hari as host', !!(listing && listing.hostId === 'u_hari'));
  submitForm(prem, 'request-new', { start: '2026-11-01', end: '2026-11-03', note: 'visit', honor: true },
    { dataset: { id: listing.id }, checks: ['honor'] });
  await sleep(80);
  const req0 = (circleOf().requests || [])[0];
  check('R7 request created by prem', !!(req0 && req0.guestId === 'u_prem' && req0.status === 'pending'));

  // --- Hari approves ---
  navTo(hari, '#/requests');
  await sleep(40);
  check('R8 approve button visible to host', hClick('[data-action="approve"]'));
  await sleep(80);
  const req2 = (circleOf().requests || [])[0];
  const stay = (circleOf().stays || [])[0];
  check('R9 request approved, stay created', req2 && req2.status === 'approved' && !!stay);

  // --- Manual interview, question by question (host) ---
  navTo(hari, '#/interview/' + stay.id);
  await sleep(40);
  const wifiAnswer = 'Network HomeNet password secret123';
  let draftVisible = false;
  for (let i = 0; i < 20 && !draftVisible; i++) {
    const msgs = hari.document.querySelectorAll('#view .chat .msg.ai');
    const qEl = msgs[msgs.length - 1];
    const isWifi = qEl && /wifi/i.test(qEl.textContent);
    submitForm(hari, 'interview-answer', { answer: isWifi ? wifiAnswer : 'some answer ' + i });
    await sleep(30);
    draftVisible = !!hari.document.querySelector('[data-action="draft-manual"]');
  }
  check('R10 interview completes to draft step', draftVisible);
  check('R11 draft-manual button clicked', hClick('[data-action="draft-manual"]'));
  await sleep(80);
  const manDraft = (circleOf().manuals || []).find(m => m.stayId === stay.id);
  check('R12 manual drafted with wifi section', !!(manDraft && manDraft.status === 'draft' &&
    JSON.stringify(manDraft.sections).toLowerCase().includes('homenet')));

  // --- Publish via manual-save with publish intent ---
  const man = manDraft;
  submitForm(hari, 'manual-save',
    { rules: 'Quiet hours 10pm', wifi: 'HomeNet / secret123', appliances: 'Dishwasher quirks',
      emergency: 'Call 911', extended_stay: 'n/a', visitor_kit: 'Towels\nSoap', checkout: 'Strip beds\nTrash out' },
    { dataset: { id: stay.id, submittedIntent: 'publish' } });
  await sleep(80);
  const manPub = (circleOf().manuals || []).find(m => m.stayId === stay.id);
  const stayPub = (circleOf().stays || []).find(s => s.id === stay.id);
  check('R13 manual published, stay active', manPub && manPub.status === 'published' && stayPub && stayPub.status === 'active');

  // --- Concierge answers from the manual; deflects the dog question ---
  prem.eval('askConcierge(' + JSON.stringify(stay.id) + ', "What is the wifi password?")');
  await sleep(40);
  const clog1 = (circleOf().stays.find(s => s.id === stay.id).conciergeLog || []);
  const lastA1 = clog1[clog1.length - 1];
  check('R14 concierge answers wifi from manual', lastA1 && lastA1.a && /homenet/i.test(lastA1.a.body) && !!lastA1.a.section,
    lastA1 && lastA1.a && lastA1.a.body.slice(0, 60));
  prem.eval('askConcierge(' + JSON.stringify(stay.id) + ', "Can I bring my dog?")');
  await sleep(40);
  const clog2 = (circleOf().stays.find(s => s.id === stay.id).conciergeLog || []);
  const lastA2 = clog2[clog2.length - 1];
  const uq = (circleOf().unanswered || []).find(u => /dog/i.test(u.question));
  check('R15 concierge deflects out-of-manual question', lastA2 && lastA2.a === null && !!uq);

  // --- Checkout -> scoreboard counts room nights ---
  const nChecks = (circleOf().manuals.find(m => m.stayId === stay.id).sections.checkout.items || []).length;
  const checks = {};
  for (let i = 0; i < nChecks; i++) checks['c' + i] = true;
  submitForm(hari, 'checkout', Object.assign({ idesc: '', ires: '' }, checks),
    { dataset: { id: stay.id }, checks: Object.keys(checks) });
  await sleep(80);
  const score = circleOf().score;
  check('R16 checkout adds 2 room nights', score && score.totalNights === 2, 'totalNights=' + (score && score.totalNights));

  // --- Tabs navigate cleanly on both phones ---
  let tabsOk = true, tabDetail = '';
  for (const [phone, tag] of [[hari, 'hari'], [prem, 'prem']]) {
    for (const tab of ['home', 'requests', 'stays', 'score']) {
      navTo(phone, '#/' + tab);
      await sleep(25);
      const v = phone.document.querySelector('#view').innerHTML;
      if (v.includes('Something went wrong')) { tabsOk = false; tabDetail = tag + '/' + tab; }
    }
  }
  check('R17 all tabs render on both phones', tabsOk, tabDetail);

  // --- Sign out ---
  navTo(hari, '#/home');
  await sleep(30);
  hari.document.querySelector('[data-action="signout"]').click();
  await sleep(60);
  check('R18 hari signed out cleanly', hari.document.querySelector('#view').innerHTML.includes('Continue with Google') &&
    !hari.document.querySelector('#whoamiWrap').innerHTML.includes('Viewing as'));

  console.log('\n==== ' + pass + '/' + total + ' passed ====');
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
