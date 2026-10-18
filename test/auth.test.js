/* Auth-flow test with a mocked Firebase SDK: login -> create circle ->
   header shows identity (not demo selector) -> sign out -> login screen
   WITHOUT the demo "Viewing as" selector. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .replace("'use strict';", ''); // test scaffolding

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- in-memory RTDB mock ----
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
function mockRef(p) {
  return {
    once: () => Promise.resolve({ val: () => getPath(p) }),
    on: (ev, cb) => {
      (rdbListeners[p] = rdbListeners[p] || []).push(cb);
      cb({ val: () => getPath(p) });
    },
    off: () => { delete rdbListeners[p]; },
    set: v => { setPath(p, JSON.parse(JSON.stringify(v))); notify(p); return Promise.resolve(); },
    update: v => { setPath(p, Object.assign({}, getPath(p), v)); notify(p); return Promise.resolve(); },
    transaction: fn => {
      const cur = getPath(p);
      const next = fn(cur === undefined ? null : JSON.parse(JSON.stringify(cur)));
      setPath(p, JSON.parse(JSON.stringify(next))); notify(p);
      return Promise.resolve({ committed: true, snapshot: { val: () => getPath(p) } });
    },
  };
}

// ---- auth mock ----
const authMock = {
  user: null, _cb: null,
  onAuthStateChanged(cb) { this._cb = cb; setTimeout(() => cb(this.user), 0); },
  signInWithPopup() {
    this.user = { uid: 'u_hari', displayName: 'Hari', photoURL: null };
    setTimeout(() => this._cb(this.user), 0);
    return Promise.resolve({ user: this.user });
  },
  signOut() {
    this.user = null;
    setTimeout(() => this._cb(null), 0);
    return Promise.resolve();
  },
};

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;

// welcome already dismissed on this device
w.localStorage.setItem('sparekey.device.v1', JSON.stringify({ welcomed: true }));
// firebase config present -> Firebase mode
w.SPAREKEY_FIREBASE = { apiKey: 'test-key' };
// stub the compat SDK before app.js loads it via injected script tags
const authNs = () => authMock;
authNs.GoogleAuthProvider = function () {};
w.firebase = {
  initializeApp: () => ({}),
  auth: authNs,
  database: () => ({ ref: mockRef }),
};
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

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}

(async () => {
  await sleep(60); // boot + sdk load + first auth callback (signed out)

  const headerHtml = () => w.document.querySelector('#whoamiWrap').innerHTML;
  const viewHtml = () => w.document.querySelector('#view').innerHTML;

  // A1: signed out -> login screen, header must NOT show demo "Viewing as"
  check('A1 login screen shown when signed out', viewHtml().includes('Continue with Google'), viewHtml().slice(0, 80));
  check('A2 no demo "Viewing as" selector in Firebase mode (signed out)', !headerHtml().includes('Viewing as'), headerHtml().slice(0, 120));

  // log in via the real button
  w.document.querySelector('[data-action="google-login"]').click();
  await sleep(60);
  check('A3 circle gate after login', viewHtml().includes('Join a circle'));

  // create a circle through the real form handler
  const cf = w.document.createElement('form');
  cf.setAttribute('data-form', 'circle-create');
  cf.innerHTML = '<input name="cname" value="Test circle">';
  w.document.querySelector('#view').appendChild(cf);
  w.handleForm(cf);
  await sleep(60);
  check('A4 home after circle create', viewHtml().includes('Test circle') || viewHtml().includes('Invite code'));
  check('A5 header shows identity chip, not demo selector', headerHtml().includes('userchip') && !headerHtml().includes('Viewing as'), headerHtml().slice(0, 140));

  // post a listing through the real form handler; hostId must be the firebase uid
  // (fromRemote must not wipe db.currentUser)
  const lf = w.document.createElement('form');
  lf.setAttribute('data-form', 'listing-new');
  lf.innerHTML = '<input name="start" value="2026-11-01"><input name="end" value="2026-11-05">' +
    '<input name="rate" value="150"><input name="note" value="t">';
  w.handleForm(lf);
  await sleep(60);
  const circleId = Object.keys(rdbData.circles || {})[0];
  const listings = ((rdbData.circles || {})[circleId] || {}).listings || [];
  const hostId = listings.length ? listings[listings.length - 1].hostId : undefined;
  check('A6 listing hostId is the firebase uid after sync', hostId === 'u_hari', 'got ' + hostId);

  // sign out via the real button
  w.document.querySelector('[data-action="signout"]').click();
  await sleep(60);
  check('A7 back to login screen after sign out', viewHtml().includes('Continue with Google'));
  check('A8 no demo "Viewing as" selector after sign out', !headerHtml().includes('Viewing as'), headerHtml().slice(0, 120));

  console.log('\n==== ' + pass + '/' + total + ' passed ====');
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
