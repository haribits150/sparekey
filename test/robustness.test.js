/* Robustness regression: every screen must render without throwing,
   in both demo mode and Firebase mode, including with a PARTIAL circle
   node from RTDB (missing optional keys) — a render throw would freeze
   tab navigation. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .replace("'use strict';", '');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeDom(firebaseMode, seedV1, remoteNode) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
  const w = dom.window;
  w.localStorage.setItem('sparekey.device.v1', JSON.stringify({ welcomed: true }));
  if (seedV1) w.localStorage.setItem('sparekey.v1', JSON.stringify(seedV1));
  if (firebaseMode) {
    w.SPAREKEY_FIREBASE = { apiKey: 'x' };
    w.localStorage.setItem('sparekey.device.v1', JSON.stringify({ welcomed: true, circleId: 'c1' }));
    const auth = {
      user: { uid: 'u1', displayName: 'Hari', photoURL: null }, _cb: null,
      onAuthStateChanged(cb) { this._cb = cb; setTimeout(() => cb(this.user), 0); },
      signInWithPopup() { return Promise.resolve(); },
      signOut() { this.user = null; setTimeout(() => this._cb(null), 0); return Promise.resolve(); },
    };
    const authNs = () => auth;
    authNs.GoogleAuthProvider = function () {};
    const store = { 'users/u1': {}, 'circles/c1': remoteNode };
    const getP = p => store[p];
    const ref = p => ({
      once: () => Promise.resolve({ val: () => getP(p) }),
      on: (ev, cb) => { cb({ val: () => getP(p) }); },
      off: () => {},
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
    });
    w.firebase = { initializeApp: () => ({}), auth: authNs, database: () => ({ ref }) };
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
  }
  w.eval(appJs);
  return w;
}

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}

const ROUTES = ['#/home', '#/requests', '#/stays', '#/score', '#/listing/new',
  '#/requests', '#/stay/nope', '#/interview/nope', '#/manual/nope', '#/concierge/nope', '#/checkout/nope'];

async function sweep(w, label) {
  await sleep(80);
  let ok = true, bad = '';
  // capture render throws via console.error hook
  const errors = [];
  const origErr = w.console.error;
  w.console.error = (...a) => { errors.push(a.join(' ')); };
  for (const r of ROUTES) {
    w.location.hash = r;
    w.dispatchEvent(new w.Event('hashchange'));
    await sleep(15);
    const v = w.document.querySelector('#view').innerHTML;
    if (v.includes('Something went wrong')) { ok = false; bad = r; break; }
  }
  w.console.error = origErr;
  check(label + ' all routes render', ok && errors.length === 0, bad || (errors[0] || '').slice(0, 100));
  // tabs: simulate real anchor clicks
  let tabsOk = true;
  for (const tab of w.document.querySelectorAll('.tab')) {
    tab.click();
    await sleep(15);
    const v = w.document.querySelector('#view').innerHTML;
    if (v.includes('Something went wrong')) { tabsOk = false; break; }
  }
  check(label + ' tab clicks navigate', tabsOk);
  return w;
}

(async () => {
  // G1: demo mode, fresh seed
  await sweep(makeDom(false), 'G1 demo/fresh');
  // G2: demo mode, populated seed (listing + request + stay + manual + score)
  const seed = {
    v: 1, currentUser: 'hari',
    circle: [{ id: 'hari', name: 'Hari' }, { id: 'prem', name: 'Prem' }],
    listings: [{ id: 'l1', hostId: 'hari', start: '2026-11-01', end: '2026-11-05', nightlyRate: 150, note: '', status: 'open' }],
    requests: [{ id: 'r1', listingId: 'l1', guestId: 'prem', start: '2026-11-01', end: '2026-11-03', note: '', status: 'pending' }],
    stays: [{ id: 's1', requestId: 'r1', listingId: 'l1', hostId: 'hari', guestId: 'prem',
      start: '2026-11-01', end: '2026-11-03', nightlyRate: 150, manualId: 'm1', status: 'active', conciergeLog: [] }],
    manuals: [{ id: 'm1', stayId: 's1', status: 'published',
      sections: { rules: { title: 'Rules', body: 'x' }, wifi: { title: 'Wifi', body: 'y' },
        appliances: { title: 'A', body: 'z' }, emergency: { title: 'E', body: 'w' },
        visitor_kit: { title: 'VK', items: ['Towels'] }, checkout: { title: 'C', items: ['Trash'] } } }],
    incidents: [], unanswered: [],
    score: { totalNights: 2, entries: [{ stayId: 's1', nights: 2 }] },
  };
  await sweep(makeDom(false, JSON.parse(JSON.stringify(seed))), 'G2 demo/populated');
  // G3: firebase mode, partial RTDB node (missing optional keys entirely)
  await sweep(makeDom(true, null, {
    v: 1, name: 'C', inviteCode: 'ABC123',
    members: { u1: { name: 'Hari', photo: null } },
    // listings/requests/stays/manuals/incidents/unanswered/score all absent
  }), 'G3 firebase/partial-node');
  // G4: firebase mode, populated RTDB node
  await sweep(makeDom(true, null, {
    v: 1, name: 'C', inviteCode: 'ABC123',
    members: { u1: { name: 'Hari', photo: null }, u2: { name: 'Prem', photo: null } },
    listings: [{ id: 'l1', hostId: 'u1', start: '2026-11-01', end: '2026-11-05', nightlyRate: 150, note: '', status: 'open' }],
    requests: [{ id: 'r1', listingId: 'l1', guestId: 'u2', start: '2026-11-01', end: '2026-11-03', note: '', status: 'pending' }],
    stays: [{ id: 's1', requestId: 'r1', listingId: 'l1', hostId: 'u1', guestId: 'u2',
      start: '2026-11-01', end: '2026-11-03', nightlyRate: 150, manualId: 'm1', status: 'active', conciergeLog: [] }],
    manuals: [{ id: 'm1', stayId: 's1', status: 'published',
      sections: { rules: { title: 'Rules', body: 'x' }, wifi: { title: 'Wifi', body: 'y' },
        appliances: { title: 'A', body: 'z' }, emergency: { title: 'E', body: 'w' },
        visitor_kit: { title: 'VK', items: ['Towels'] }, checkout: { title: 'C', items: ['Trash'] } } }],
    incidents: [], unanswered: [],
    score: { totalNights: 2, entries: [{ stayId: 's1', nights: 2 }] },
  }), 'G4 firebase/populated-node');

  console.log('\n==== ' + pass + '/' + total + ' passed ====');
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
