/* Sync-layer unit tests: toRemote/fromRemote round-trip, invite codes,
   uid uniqueness. Seeds via localStorage so the app boots with our fixture
   through its real load() path. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .replace("'use strict';", ''); // test scaffolding: expose AI fns on window

const seedDb = {
  v: 1,
  currentUser: 'uid_aaa',
  name: 'Test circle',
  inviteCode: 'K7Q2MD',
  circle: [
    { id: 'uid_aaa', name: 'Hari', photo: 'https://pic/a' },
    { id: 'uid_bbb', name: 'Prem', photo: null },
  ],
  listings: [{ id: 'listing_x', hostId: 'uid_aaa' }],
  requests: [], stays: [], manuals: [], incidents: [], unanswered: [],
  score: { totalNights: 4, entries: [{ stayId: 's1', nights: 4 }] },
};

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;
w.localStorage.setItem('sparekey.v1', JSON.stringify(seedDb));
w.eval(appJs);

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}

// S1: toRemote strips device keys, maps circle -> members
const remote = w.toRemote();
check('S1 strips currentUser', remote.currentUser === undefined);
check('S1 circle -> members map', remote.members && remote.members.uid_aaa.name === 'Hari' && remote.members.uid_bbb.photo === null && remote.circle === undefined);
check('S1 keeps app data', Array.isArray(remote.listings) && remote.listings[0].id === 'listing_x' && remote.score.totalNights === 4);
check('S1 keeps circle meta', remote.name === 'Test circle' && remote.inviteCode === 'K7Q2MD');

// S2: fromRemote restores the app shape (observed via round-trip)
w.fromRemote(JSON.parse(JSON.stringify(remote)));
const back = w.toRemote();
check('S2 members round-trip', JSON.stringify(back.members) === JSON.stringify(remote.members));
check('S2 listings round-trip', JSON.stringify(back.listings) === JSON.stringify(remote.listings));
check('S2 score round-trip', back.score.totalNights === 4);

// S3: invite codes — 6 chars, unambiguous alphabet
const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
let okCodes = true;
for (let i = 0; i < 200; i++) {
  const c = w.makeInviteCode();
  if (c.length !== 6 || !c.split('').every(ch => abc.includes(ch))) { okCodes = false; break; }
}
check('S3 invite code format', okCodes);

// S4: uids unique across devices (no seq coordination needed)
const seen = new Set();
for (let i = 0; i < 2000; i++) seen.add(w.uid('listing'));
check('S4 2000 uids unique', seen.size === 2000);

console.log('\n==== ' + pass + '/' + total + ' passed ====');
process.exit(pass === total ? 0 : 1);
