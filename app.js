/* SpareKey MVP — static single-page app. No backend; state in localStorage.
   Modules: store, router, screens (home/listings/requests/stays/manual/concierge/checkout/score). */
'use strict';

/* ---------- Store ---------- */
const DB_KEY = 'sparekey.v1';

const SEED = {
  v: 1,
  currentUser: 'hari',
  circle: [
    { id: 'hari',   name: 'Hari' },
    { id: 'prem',   name: 'Prem' },
    { id: 'vishal', name: 'vishal' },
    { id: 'viveka', name: 'Viveka' },
    { id: 'priya',  name: 'Priya' },
    { id: 'arjun',  name: 'Arjun' },
  ],
  listings: [],
  requests: [],
  stays: [],
  manuals: [],
  incidents: [],
  unanswered: [],
  score: { totalNights: 0, entries: [] },
  seq: 1,
};

let db = null;

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { const d = JSON.parse(raw); if (d && d.v === 1) { db = d; migrate(); return; } }
  } catch (e) { /* corrupted -> reseed */ }
  db = JSON.parse(JSON.stringify(SEED));
  save();
}
function save() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function migrate() {
  // scoreboard now counts room nights instead of dollars
  if (db.score && db.score.totalNights == null) {
    db.score.totalNights = (db.score.entries || []).reduce((a, e) => a + (e.nights || 0), 0);
    delete db.score.totalSaved;
    save();
  }
}
function resetDemo() {
  const user = db.currentUser, welcomed = db.welcomed;
  db = JSON.parse(JSON.stringify(SEED));
  db.currentUser = user;
  db.welcomed = welcomed;
  save();
}
function uid(prefix) { return prefix + '_' + (db.seq++) + '_' + Date.now().toString(36); }

/* ---------- Helpers ---------- */
const $ = (sel, el) => (el || document).querySelector(sel);
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function person(id) { const p = db.circle.find(c => c.id === id); return p ? p.name : 'Someone'; }
function initials(name) { return name.trim().charAt(0).toUpperCase(); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtRange(a, b) { return fmtDate(a) + ' – ' + fmtDate(b); }
function nightsBetween(a, b) {
  return Math.max(0, Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000));
}
function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
function getListing(id) { return db.listings.find(l => l.id === id); }
function getRequest(id) { return db.requests.find(r => r.id === id); }
function getStay(id) { return db.stays.find(s => s.id === id); }
function getManual(id) { return db.manuals.find(m => m.id === id); }
function statusPill(s) { return '<span class="pill ' + esc(s) + '">' + esc(prettyStatus(s)) + '</span>'; }
function prettyStatus(s) {
  return { open: 'Open', pending: 'Pending', approved: 'Approved', declined: 'Declined',
    interview: 'Manual interview', manual_draft: 'Manual draft', active: 'Active',
    closed: 'Closed', resolved: 'Resolved' }[s] || s;
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Router ---------- */
function route() {
  const h = location.hash || '#/home';
  const parts = h.replace(/^#\//, '').split('/');
  return { name: parts[0] || 'home', param: parts[1] ? decodeURIComponent(parts[1]) : null };
}
function nav(hash) { location.hash = hash; }
window.addEventListener('hashchange', render);

/* ---------- Shared chrome ---------- */
function pendingIncomingCount() {
  const me = db.currentUser;
  const myListingIds = db.listings.filter(l => l.hostId === me && l.status === 'open').map(l => l.id);
  return db.requests.filter(r => myListingIds.includes(r.listingId) && r.status === 'pending').length;
}

function renderChrome() {
  const sel = $('#whoami');
  sel.innerHTML = db.circle.map(c =>
    '<option value="' + esc(c.id) + '"' + (c.id === db.currentUser ? ' selected' : '') + '>' + esc(c.name) + '</option>'
  ).join('');
  sel.onchange = () => { db.currentUser = sel.value; save(); render(); toast('Now viewing as ' + person(sel.value)); };

  const r = route();
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === r.name || (r.name === 'listing' && t.dataset.tab === 'home') || (r.name === 'stay' && t.dataset.tab === 'stays') || (['interview','manual','concierge','checkout'].includes(r.name) && t.dataset.tab === 'stays'))
  );
  const badge = $('#reqBadge');
  const n = pendingIncomingCount();
  badge.hidden = n === 0;
  badge.textContent = n;
}

function avatar(name, cls) {
  return '<span class="avatar' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
}

function listingCard(l) {
  return '<a class="card listing" href="#/listing/' + esc(l.id) + '">' +
    '<div class="row"><div class="row" style="gap:10px">' + avatar(person(l.hostId)) +
    '<div><h3>' + esc(person(l.hostId)) + '’s place</h3>' +
    '<div class="meta">' + esc(fmtRange(l.start, l.end)) + ' · ' + esc(money(l.nightlyRate)) + '/night</div></div></div>' +
    statusPill(l.status) + '</div>' +
    (l.note ? '<p class="sub" style="margin:8px 0 0">' + esc(l.note) + '</p>' : '') +
    '</a>';
}

/* ---------- Screens ---------- */
function screenWelcome() {
  return '<div class="hero">' +
      '<div class="hero-label">Welcome to SpareKey</div>' +
      '<div class="hero-value" style="font-size:28px">Lend your empty home to trusted friends</div>' +
      '<div class="hero-sub">No strangers. No payments. No hotels.</div></div>' +
    '<h2>How it works</h2><div class="card">' +
      '<p><strong>1. Post your away dates.</strong> Only your circle can see the listing.</p>' +
      '<p><strong>2. Friends request, you approve.</strong> Every guest accepts the Honor Code first.</p>' +
      '<p><strong>3. AI drafts your house manual</strong> from a 2-minute interview — rules, wifi, appliances, the visitor-kit checklist. You review before it goes out.</p>' +
      '<p><strong>4. The concierge answers guest questions</strong> from the manual (never guesses), and checkout adds the nights to your scoreboard.</p></div>' +
    '<div class="card"><p class="small" style="margin:0">One rule for everyone: <strong>treat this home like your own.</strong></p></div>' +
    '<button class="btn btn-primary btn-block" data-action="welcome-done" style="margin-top:12px">Get started</button>';
}

function screenHome() {
  const nights = db.score.totalNights != null ? db.score.totalNights
    : db.score.entries.reduce((a, e) => a + e.nights, 0);
  const stays = db.score.entries.length;
  const openListings = db.listings.filter(l => l.status === 'open');
  return '<div class="hero">' +
      '<div class="hero-label">Room nights hosted</div>' +
      '<div class="hero-value">' + nights + '</div>' +
      '<div class="hero-sub">across ' + stays + ' stay' + (stays === 1 ? '' : 's') + '</div>' +
      '<a class="btn btn-primary" href="#/listing/new">Post away dates</a>' +
    '</div>' +
    '<h2>Open listings · circle only</h2>' +
    (openListings.length
      ? openListings.map(listingCard).join('')
      : '<div class="card empty"><p>No open listings yet.<br>Post your next trip and let the circle know.</p></div>') +
    '<h2>Your circle</h2>' +
    '<div class="card"><div class="chips">' +
      db.circle.map(c => '<span class="chip">' + avatar(c.name) + esc(c.name) + '</span>').join('') +
    '</div><p class="small" style="margin:10px 0 0">Only circle members can see listings and request stays. No strangers, ever.</p></div>';
}

function screenListingNew() {
  return '<h1>Post away dates</h1>' +
    '<p class="sub">Mark your home available. Only your circle sees it.</p>' +
    '<form data-form="listing-new" class="card">' +
      '<div class="field"><label for="f-start">Away from</label><input id="f-start" name="start" type="date" required></div>' +
      '<div class="field"><label for="f-end">Back on</label><input id="f-end" name="end" type="date" required></div>' +
      '<div class="field"><label for="f-rate">Nightly hotel rate (USD)</label>' +
        '<input id="f-rate" name="rate" type="number" min="1" step="1" placeholder="180" required>' +
        '<div class="hint">What a hotel nearby would cost — this powers the scoreboard.</div></div>' +
      '<div class="field"><label for="f-note">One line about the place</label>' +
        '<textarea id="f-note" name="note" placeholder="2BR in Bellevue, 10 min to downtown"></textarea></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Post listing</button>' +
    '</form>';
}

function screenListingDetail(id) {
  const l = getListing(id);
  if (!l) return '<div class="card empty"><p>Listing not found.</p></div>';
  const me = db.currentUser;
  const isHost = l.hostId === me;
  let html = '<h1>' + esc(person(l.hostId)) + '’s place</h1>' +
    '<div class="card"><div class="row"><div><div class="meta">Away</div><h3>' + esc(fmtRange(l.start, l.end)) + '</h3></div>' + statusPill(l.status) + '</div>' +
    '<div class="row"><span class="meta">Nightly hotel rate</span><strong>' + esc(money(l.nightlyRate)) + '</strong></div>' +
    (l.note ? '<p style="margin-top:8px">' + esc(l.note) + '</p>' : '') + '</div>';

  if (isHost) {
    const incoming = db.requests.filter(r => r.listingId === l.id);
    html += '<h2>Requests</h2>';
    html += incoming.length ? incoming.map(r => requestRow(r, true)).join('')
      : '<div class="card empty"><p>No requests yet.</p></div>';
  } else {
    const mine = db.requests.filter(r => r.listingId === l.id && r.guestId === me);
    const active = mine.find(r => r.status === 'pending' || r.status === 'approved');
    if (active) {
      html += '<h2>Your request</h2>' + requestRow(active, false);
    } else if (l.status === 'open') {
      html += '<h2>Request a stay</h2>' +
        '<form data-form="request-new" data-id="' + esc(l.id) + '" class="card">' +
          '<div class="field"><label for="r-start">From</label><input id="r-start" name="start" type="date" min="' + esc(l.start) + '" max="' + esc(l.end) + '" value="' + esc(l.start) + '" required></div>' +
          '<div class="field"><label for="r-end">To</label><input id="r-end" name="end" type="date" min="' + esc(l.start) + '" max="' + esc(l.end) + '" value="' + esc(l.end) + '" required></div>' +
          '<div class="field"><label for="r-note">Note for your host <span class="small">(optional)</span></label><textarea id="r-note" name="note" placeholder="Visiting for a long weekend…"></textarea></div>' +
          '<div class="field"><label class="check"><input type="checkbox" name="honor" required> <span><strong>The Honor Code:</strong> <em>“Treat this home like your own.”</em> I agree to it for this stay.</span></label></div>' +
          '<button class="btn btn-primary btn-block" type="submit">Send request</button>' +
        '</form>';
    }
  }
  return html;
}

function requestRow(r, showActions) {
  const stay = db.stays.find(s => s.requestId === r.id);
  let html = '<div class="card tight"><div class="row"><div class="row" style="gap:10px">' + avatar(person(r.guestId)) +
    '<div><strong>' + esc(person(r.guestId)) + '</strong>' +
    '<div class="meta">' + esc(fmtRange(r.start, r.end)) + ' · ' + nightsBetween(r.start, r.end) + ' nights' + (r.note ? ' · “' + esc(r.note) + '”' : '') + '</div></div></div>' +
    statusPill(r.status) + '</div>';
  if (r.status === 'approved' && stay) {
    html += '<div style="margin-top:8px"><a class="btn btn-secondary btn-block" href="#/stay/' + esc(stay.id) + '">Open stay</a></div>';
  }
  if (showActions && r.status === 'pending') {
    html += '<div class="btn-row" style="margin-top:10px">' +
      '<button class="btn btn-primary" data-action="approve" data-id="' + esc(r.id) + '">Approve</button>' +
      '<button class="btn btn-secondary" data-action="decline" data-id="' + esc(r.id) + '">Decline</button></div>';
  }
  return html + '</div>';
}

function screenRequests() {
  const me = db.currentUser;
  const myListingIds = db.listings.filter(l => l.hostId === me).map(l => l.id);
  const incoming = db.requests.filter(r => myListingIds.includes(r.listingId));
  const outgoing = db.requests.filter(r => r.guestId === me);
  return '<h1>Requests</h1>' +
    '<h2>For you to review</h2>' +
    (incoming.length ? incoming.map(r => requestRow(r, true)).join('')
      : '<div class="card empty"><p>Nothing to review.</p></div>') +
    '<h2>Your requests</h2>' +
    (outgoing.length ? outgoing.map(r => requestRow(r, false)).join('')
      : '<div class="card empty"><p>You haven’t requested any stays.</p></div>');
}

function stayCard(s) {
  const l = getListing(s.listingId);
  return '<a class="card listing" href="#/stay/' + esc(s.id) + '">' +
    '<div class="row"><div class="row" style="gap:10px">' + avatar(person(s.guestId === db.currentUser ? s.hostId : s.guestId)) +
    '<div><h3>' + esc(s.guestId === db.currentUser ? person(s.hostId) + '’s place' : person(s.guestId) + ' staying over') + '</h3>' +
    '<div class="meta">' + esc(fmtRange(s.start, s.end)) + ' · ' + esc(money(s.nightlyRate)) + '/night</div></div></div>' +
    statusPill(s.status) + '</div></a>';
}

function screenStays() {
  const me = db.currentUser;
  const mine = db.stays.filter(s => s.hostId === me || s.guestId === me);
  return '<h1>Stays</h1>' +
    (mine.length ? mine.map(stayCard).join('')
      : '<div class="card empty"><p>No stays yet.<br>Request a stay from an open listing to begin.</p></div>');
}

/* ----- Interview (M4) ----- */
const INTERVIEW_QS = [
  { key: 'rules',       q: 'What are your house rules? Think quiet hours, shoes on/off, smoking, overnight guests…' },
  { key: 'appliances',  q: 'Any kitchen or appliance quirks? (tricky dishwasher, finicky stove, coffee maker ritual…)' },
  { key: 'wifi',        q: 'What’s the wifi network name and password?' },
  { key: 'parking',     q: 'How do guests get in, and where should they park?' },
  { key: 'extended',    q: 'Anything for longer stays — mail, plants, trash day?' },
  { key: 'emergency',   q: 'Emergency info — water shutoff, breaker box, a local contact, nearest urgent care?' },
];
let interviewState = null; // {stayId, idx, answers}

function screenInterview(stayId) {
  const s = getStay(stayId);
  if (!s || s.hostId !== db.currentUser) return '<div class="card empty"><p>Only the host runs the manual interview.</p></div>';
  if (!interviewState || interviewState.stayId !== stayId) {
    interviewState = { stayId, idx: 0, answers: s.interviewAnswers || {} };
  }
  const st = interviewState;
  if (st.idx >= INTERVIEW_QS.length) {
    return '<h1>Manual ready to draft</h1><div class="card"><p>I’ve got everything I need. I’ll draft your house manual now — house rules, wifi, appliances, emergency info, the visitor-kit checklist, and the checkout list. You’ll review and edit before it goes to your guest.</p>' +
      '<button class="btn btn-primary btn-block" data-action="draft-manual" data-id="' + esc(stayId) + '">Draft my manual</button></div>';
  }
  const q = INTERVIEW_QS[st.idx];
  const prior = st.answers[q.key] || '';
  let html = '<h1>House manual interview</h1><div class="progress">Question ' + (st.idx + 1) + ' of ' + INTERVIEW_QS.length + '</div><div class="chat" id="chat">';
  INTERVIEW_QS.slice(0, st.idx).forEach(pq => {
    html += '<div class="msg ai">' + esc(pq.q) + '</div>';
    if (st.answers[pq.key]) html += '<div class="msg me">' + esc(st.answers[pq.key]) + '</div>';
  });
  html += '<div class="msg ai">' + esc(q.q) + '</div></div>';
  html += '<form data-form="interview-answer"><div class="field"><label for="ia">Your answer</label>' +
    '<textarea id="ia" name="answer" placeholder="Skip anything that doesn\u2019t apply">' + esc(prior) + '</textarea></div>' +
    '<div class="btn-row"><button class="btn btn-secondary" type="button" data-action="interview-back"' + (st.idx === 0 ? ' disabled' : '') + '>Back</button>' +
    '<button class="btn btn-primary" type="submit">' + (st.idx === INTERVIEW_QS.length - 1 ? 'Finish' : 'Next') + '</button></div></form>';
  return html;
}

function buildManualFromInterview(s, answers) {
  const a = {};
  Object.keys(answers || {}).forEach(k => { a[k] = (answers[k] || '').trim(); });
  const parkingLine = a.parking ? '\n\n**Parking & entry:** ' + a.parking : '';
  return {
    id: uid('manual'), stayId: s.id, status: 'draft',
    sections: {
      rules:       { title: 'House rules',       body: (a.rules || 'Be a good guest.') + parkingLine },
      wifi:        { title: 'Wifi',              body: a.wifi || '' },
      appliances:  { title: 'Kitchen & appliances', body: a.appliances || '' },
      emergency:   { title: 'Emergency info',    body: a.emergency || '' },
      extended_stay:{ title: 'Extended stays',   body: a.extended || '' },
      visitor_kit: { title: 'Visitor kit', items: ['Fresh towels', 'Fresh bedsheets', 'Pillows', 'Napkins / tissues', 'Toilet paper', 'Hand soap'] },
      checkout:    { title: 'Checkout checklist', items: ['Strip the bed linens', 'Take out the trash', 'Run the dishwasher if it’s full', 'Lock up and return the key as agreed'] },
    },
    guestbook: [],
  };
}

function screenManual(stayId) {
  const s = getStay(stayId);
  if (!s) return '<div class="card empty"><p>Stay not found.</p></div>';
  const m = getManual(s.manualId);
  if (!m) return '<div class="card empty"><p>No manual yet.</p></div>';
  const isHost = s.hostId === db.currentUser;
  const editable = isHost && m.status === 'draft';

  let html = '<h1>House manual</h1><p class="sub">' + esc(person(s.hostId)) + '’s place · ' + esc(fmtRange(s.start, s.end)) + '</p>';

  if (editable) {
    html += '<form data-form="manual-save" data-id="' + esc(stayId) + '">';
    const order = ['rules', 'wifi', 'appliances', 'emergency', 'extended_stay'];
    order.forEach(k => {
      const sec = m.sections[k];
      html += '<div class="card" style="margin-bottom:10px"><div class="field"><label for="ms-' + k + '">' + esc(sec.title) + '</label>' +
        '<textarea id="ms-' + k + '" name="' + k + '">' + esc(sec.body) + '</textarea></div></div>';
    });
    html += '<div class="card" style="margin-bottom:10px"><div class="field"><label for="ms-visitor_kit">Visitor kit <span class="small">(one item per line)</span></label>' +
      '<textarea id="ms-visitor_kit" name="visitor_kit">' + esc(m.sections.visitor_kit.items.join('\n')) + '</textarea></div></div>';
    html += '<div class="card" style="margin-bottom:10px"><div class="field"><label for="ms-checkout">Checkout checklist <span class="small">(one item per line)</span></label>' +
      '<textarea id="ms-checkout" name="checkout">' + esc(m.sections.checkout.items.join('\n')) + '</textarea></div></div>';
    html += '<div class="btn-row"><button class="btn btn-secondary" type="submit" name="intent" value="save" data-intent="save">Save draft</button>' +
      '<button class="btn btn-primary" type="submit" name="intent" value="publish" data-intent="publish">Publish to guest</button></div></form>';
    return html;
  }

  const secOrder = ['rules', 'wifi', 'appliances', 'emergency', 'extended_stay'];
  html += '<div class="card">';
  secOrder.forEach(k => {
    const sec = m.sections[k];
    if (!sec.body) return;
    html += '<div class="section"><h4>' + esc(sec.title) + '</h4><p>' + esc(sec.body).replace(/\n/g, '<br>') + '</p></div>';
  });
  html += '<div class="section"><h4>Visitor kit — ready for you</h4><ul>' +
    m.sections.visitor_kit.items.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>';
  html += '<div class="section"><h4>Checkout checklist</h4><ul>' +
    m.sections.checkout.items.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div>';
  html += '</div>';

  html += '<h2>Living guestbook</h2><div class="card">';
  html += m.guestbook.length
    ? m.guestbook.map(g => '<div class="guestbook-line">“' + esc(g.text) + '” <span class="small">— ' + esc(person(g.by)) + '</span></div>').join('')
    : '<p class="small">No entries yet. Guests can leave one line for the next guest.</p>';
  if (s.guestId === db.currentUser && s.status === 'active') {
    html += '<form data-form="guestbook" data-id="' + esc(stayId) + '" style="margin-top:10px"><div class="field"><label for="gb">Add your line</label>' +
      '<input id="gb" name="text" type="text" maxlength="140" placeholder="The sunset from the deck is unreal…"></div>' +
      '<button class="btn btn-secondary btn-block" type="submit">Add to guestbook</button></form>';
  }
  return html + '</div>';
}

/* ----- Concierge (M5): retrieval over the manual only. Never generates. ----- */
const CONCIERGE_INDEX = [
  { key: 'rules',         keywords: ['rule','rules','quiet','noise','shoe','smoke','smoking','guest','guests','party','park','parking','entry','key','keys','get in','door','lock'] },
  { key: 'wifi',          keywords: ['wifi','wi-fi','internet','network','password','router'] },
  { key: 'appliances',    keywords: ['kitchen','dishwasher','stove','oven','microwave','coffee','washer','dryer','laundry','thermostat','heat','heating','ac ','air condition','fridge','refrigerator'] },
  { key: 'emergency',     keywords: ['emergency','fire','leak','water','shutoff','shut off','urgent','hospital','doctor','police','breaker','power','electric'] },
  { key: 'visitor_kit',   keywords: ['towel','towels','sheet','sheets','bed','pillow','kit','toiletries','soap','shampoo','linen'] },
  { key: 'checkout',      keywords: ['checkout','check-out','check out','leave','leaving','clean','trash','garbage','strip','depart'] },
  { key: 'extended_stay', keywords: ['mail','plant','plants','trash day','long','extended','week','weeks','month'] },
  { key: 'guestbook',     keywords: ['guestbook','guest book','tip','tips','previous','recommend'] },
];

function conciergeAnswer(manual, query) {
  const q = ' ' + query.toLowerCase() + ' ';
  const wordRe = kw => new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
  let best = null, bestScore = 0;
  CONCIERGE_INDEX.forEach(entry => {
    const sec = manual.sections[entry.key];
    if (!sec) return;
    let score = 0;
    entry.keywords.forEach(kw => {
      if (wordRe(kw).test(q)) score += kw.indexOf(' ') >= 0 ? 4 : (kw.length > 4 ? 2 : 1);
    });
    if (score > bestScore) { bestScore = score; best = entry.key; }
  });
  if (!best || bestScore === 0) return null;
  const sec = manual.sections[best];
  const body = sec.items ? sec.items.join('\n') : sec.body;
  if (!body || !body.trim()) return null;
  return { section: sec.title, body: body.trim() };
}

function screenConcierge(stayId) {
  const s = getStay(stayId);
  if (!s) return '<div class="card empty"><p>Stay not found.</p></div>';
  const m = getManual(s.manualId);
  if (!m || m.status !== 'published') return '<div class="card empty"><p>The concierge wakes up once the host publishes the manual.</p></div>';
  const history = s.conciergeLog || [];
  let html = '<h1>Concierge</h1><p class="sub">Ask about the home — I answer only from the house manual.</p>' +
    '<div class="chat" id="chat" aria-live="polite">';
  history.forEach(hh => {
    html += '<div class="msg me">' + esc(hh.q) + '</div>';
    if (hh.a) html += '<div class="msg ai">' + esc(hh.a.body).replace(/\n/g, '<br>') + '<span class="cite">From the house manual · ' + esc(hh.a.section) + '</span></div>';
    else html += '<div class="msg ai">I don’t know — let me ask your host.<span class="cite">Not in the house manual</span></div>';
  });
  html += '</div><div class="suggest" role="group" aria-label="Suggested questions">' +
    ['What’s the wifi password?', 'Where do I park?', 'What time is checkout?', 'How does the dishwasher work?']
      .map(q => '<button type="button" data-action="ask" data-q="' + esc(q) + '" data-id="' + esc(stayId) + '">' + esc(q) + '</button>').join('') +
    '</div><form data-form="concierge" data-id="' + esc(stayId) + '"><div class="composer">' +
    '<input name="q" type="text" placeholder="Ask about the home…" aria-label="Ask the concierge" required autocomplete="off">' +
    '<button class="btn btn-primary" type="submit">Ask</button></div></form>';
  return html;
}

function askConcierge(stayId, query) {
  const s = getStay(stayId);
  const m = getManual(s.manualId);
  const ans = conciergeAnswer(m, query);
  s.conciergeLog = s.conciergeLog || [];
  s.conciergeLog.push({ q: query, a: ans });
  if (!ans) {
    db.unanswered.push({ id: uid('uq'), stayId, question: query, askedBy: db.currentUser, createdAt: new Date().toISOString() });
  }
  save();
}

/* ----- Stay detail ----- */
function screenStay(stayId) {
  const s = getStay(stayId);
  if (!s) return '<div class="card empty"><p>Stay not found.</p></div>';
  const me = db.currentUser;
  const isHost = s.hostId === me, isGuest = s.guestId === me;
  const m = getManual(s.manualId);
  const inc = db.incidents.find(i => i.stayId === s.id);

  let html = '<h1>' + esc(isGuest ? person(s.hostId) + '’s place' : person(s.guestId) + '’s stay') + '</h1>' +
    '<div class="card"><div class="row"><div><div class="meta">Dates</div><h3>' + esc(fmtRange(s.start, s.end)) + '</h3></div>' + statusPill(s.status) + '</div>' +
    '<div class="row"><span class="meta">Nightly rate</span><strong>' + esc(money(s.nightlyRate)) + '</strong></div>' +
    '<div class="row"><span class="meta">' + (isHost ? 'Guest' : 'Host') + '</span><strong>' + esc(person(isHost ? s.guestId : s.hostId)) + '</strong></div></div>';

  if (s.status === 'interview' && isHost) {
    html += '<div class="card"><p>Your guest is confirmed. Let’s build the house manual — a 2-minute interview, then you review before it goes out.</p>' +
      '<a class="btn btn-primary btn-block" href="#/interview/' + esc(s.id) + '">Start the manual interview</a></div>';
  } else if (s.status === 'interview' && isGuest) {
    html += '<div class="card empty"><p>Your host is preparing the house manual.</p></div>';
  } else if (s.status === 'manual_draft' && isHost) {
    html += '<div class="card"><p>The manual draft is ready for your review.</p>' +
      '<a class="btn btn-primary btn-block" href="#/manual/' + esc(s.id) + '">Review & publish manual</a></div>';
  } else if (s.status === 'manual_draft' && isGuest) {
    html += '<div class="card empty"><p>Your host is putting the finishing touches on the house manual.</p></div>';
  } else if (s.status === 'active') {
    html += '<div class="card"><div class="btn-row">' +
      '<a class="btn btn-secondary" href="#/manual/' + esc(s.id) + '">Manual</a>' +
      (isGuest ? '<a class="btn btn-secondary" href="#/concierge/' + esc(s.id) + '">Concierge</a>' : '') +
      '</div>';
    if (isGuest) html += '<a class="btn btn-primary btn-block" style="margin-top:10px" href="#/checkout/' + esc(s.id) + '">Check out</a>';
    html += '</div>';
    if (isHost) {
      const uq = db.unanswered.filter(u => u.stayId === s.id);
      if (uq.length) {
        html += '<h2>Questions the concierge couldn’t answer</h2><div class="card">' +
          uq.map(u => '<p>“' + esc(u.question) + '” <span class="small">— ' + esc(person(u.askedBy)) + '</span></p>').join('') + '</div>';
      }
    }
  } else if (s.status === 'closed') {
    const entry = db.score.entries.find(e => e.stayId === s.id);
    html += '<div class="card"><div class="row"><span class="meta">Stay complete</span><strong>' + (entry ? entry.nights + ' night' + (entry.nights === 1 ? '' : 's') + ' hosted' : '') + '</strong></div>' +
      '<div style="margin-top:10px"><a class="btn btn-secondary btn-block" href="#/manual/' + esc(s.id) + '">View manual & guestbook</a></div></div>';
  }

  if (inc) {
    html += '<h2>Incident report</h2><div class="card"><p><strong>What happened:</strong> ' + esc(inc.description) + '</p>' +
      '<p><strong>Agreed resolution:</strong> ' + esc(inc.resolution) + '</p>' +
      '<div class="row"><span class="meta">Status</span>' + statusPill(inc.status) + '</div>' +
      (inc.status === 'open' && isHost
        ? '<button class="btn btn-primary btn-block" style="margin-top:10px" data-action="resolve-incident" data-id="' + esc(inc.id) + '">Confirm resolution</button>'
        : '') + '</div>';
  }
  return html;
}

/* ----- Checkout (M6) ----- */
function screenCheckout(stayId) {
  const s = getStay(stayId);
  if (!s || s.guestId !== db.currentUser || s.status !== 'active')
    return '<div class="card empty"><p>Checkout isn’t available right now.</p></div>';
  const m = getManual(s.manualId);
  const items = m.sections.checkout.items;
  return '<h1>Check out</h1><p class="sub">Run the checklist, then close out the stay.</p>' +
    '<form data-form="checkout" data-id="' + esc(stayId) + '"><div class="card">' +
    '<ul class="checklist">' + items.map((it, i) =>
      '<li><label class="check" data-check><input type="checkbox" name="c' + i + '"> <span>' + esc(it) + '</span></label></li>'
    ).join('') + '</ul></div>' +
    '<h2>Anything to report?</h2><div class="card">' +
    '<p class="small">The rule is simple: <strong>notify and cover</strong>. Say what happened and how you’ll make it right — no deposits, no drama.</p>' +
    '<div class="field"><label for="i-desc">What happened <span class="small">(optional)</span></label><textarea id="i-desc" name="idesc" placeholder="Chipped a mug…"></textarea></div>' +
    '<div class="field"><label for="i-res">How you’ll make it right <span class="small">(optional)</span></label><textarea id="i-res" name="ires" placeholder="I’ll replace it this week…"></textarea></div>' +
    '</div><button class="btn btn-primary btn-block" type="submit" id="checkoutBtn" disabled>Complete checkout</button></form>';
}

function screenScore() {
  const e = db.score.entries;
  const totalN = db.score.totalNights != null ? db.score.totalNights
    : e.reduce((a, x) => a + (x.nights || 0), 0);
  return '<div class="hero"><div class="hero-label">Total room nights hosted</div>' +
      '<div class="hero-value">' + totalN + '</div>' +
      '<div class="hero-sub">Every completed stay adds its nights to the count.</div></div>' +
    '<h2>Stay history</h2>' +
    (e.length ? '<div class="card">' + e.map(x => {
        const s = getStay(x.stayId);
        return '<div class="row"><div><strong>' + esc(s ? person(s.guestId) : '—') + '</strong>' +
          '<div class="meta">' + esc(s ? fmtRange(s.start, s.end) : '') + '</div></div>' +
          '<strong>' + x.nights + ' night' + (x.nights === 1 ? '' : 's') + '</strong></div>';
      }).join('<hr class="divider">') + '</div>'
      : '<div class="card empty"><p>No completed stays yet.</p></div>') +
    '<h2>Demo</h2><div class="card"><p class="small">Reset all listings, requests, stays, and the scoreboard to start the demo script fresh.</p>' +
    '<button class="btn btn-secondary btn-block" data-action="reset">Reset demo data</button></div>';
}

/* ---------- Actions ---------- */
function closeStay(s, incidentData) {
  const nights = nightsBetween(s.start, s.end);
  if (incidentData && incidentData.description.trim()) {
    db.incidents.push({ id: uid('inc'), stayId: s.id, description: incidentData.description.trim(),
      resolution: incidentData.resolution.trim() || 'To be agreed with host', status: 'open' });
  }
  s.status = 'closed';
  db.score.totalNights = (db.score.totalNights || 0) + nights;
  db.score.entries.push({ stayId: s.id, nights, rate: s.nightlyRate });
  save();
}

const Actions = {
  approve(id) {
    const r = getRequest(id);
    if (!r || r.status !== 'pending') return;
    r.status = 'approved';
    const l = getListing(r.listingId);
    const stay = { id: uid('stay'), requestId: r.id, listingId: r.listingId, hostId: l.hostId,
      guestId: r.guestId, start: r.start, end: r.end, nightlyRate: l.nightlyRate,
      manualId: null, status: 'interview', conciergeLog: [] };
    db.stays.push(stay);
    save();
    toast('Stay approved — time to build the manual');
    nav('#/stay/' + stay.id);
  },
  decline(id) {
    const r = getRequest(id);
    if (!r) return;
    r.status = 'declined';
    save(); render(); toast('Request declined');
  },
  'interview-back'() {
    if (interviewState && interviewState.idx > 0) { interviewState.idx--; render(); }
  },
  'draft-manual'(stayId) {
    const s = getStay(stayId);
    const m = buildManualFromInterview(s, interviewState.answers);
    db.manuals.push(m);
    s.manualId = m.id;
    s.status = 'manual_draft';
    s.interviewAnswers = interviewState.answers;
    interviewState = null;
    save();
    toast('Manual drafted — review before publishing');
    nav('#/manual/' + s.id);
  },
  ask(stayId, q) {
    askConcierge(stayId, q);
    render();
    const chat = $('#chat');
    if (chat) chat.scrollTop = chat.scrollHeight;
  },
  'resolve-incident'(incId) {
    const inc = db.incidents.find(i => i.id === incId);
    if (!inc) return;
    inc.status = 'resolved';
    save(); render(); toast('Incident resolved');
  },
  reset() {
    if (confirm('Reset all demo data?')) { resetDemo(); toast('Demo reset'); nav('#/home'); }
  },
  'welcome-done'() { db.welcomed = true; save(); nav('#/home'); render(); },
};

/* ---------- Forms ---------- */
function handleForm(form) {
  const kind = form.dataset.form;
  const fd = new FormData(form);
  const val = k => (fd.get(k) || '').toString().trim();

  if (kind === 'listing-new') {
    const start = val('start'), end = val('end'), rate = parseInt(val('rate'), 10);
    if (!start || !end || end <= start) { toast('Pick a valid date range'); return; }
    if (!rate || rate <= 0) { toast('Enter a nightly rate'); return; }
    db.listings.push({ id: uid('listing'), hostId: db.currentUser, start, end,
      nightlyRate: rate, note: val('note'), status: 'open' });
    save(); toast('Listing posted — your circle can see it'); nav('#/home');
  }

  if (kind === 'request-new') {
    const l = getListing(form.dataset.id);
    const start = val('start'), end = val('end');
    if (!start || !end || end <= start) { toast('Pick a valid date range'); return; }
    if (start < l.start || end > l.end) { toast('Dates must fall inside the listing window'); return; }
    if (!form.querySelector('[name="honor"]').checked) { toast('Please accept the Honor Code'); return; }
    db.requests.push({ id: uid('req'), listingId: l.id, guestId: db.currentUser, start, end,
      note: val('note'), honorCode: true, status: 'pending' });
    save(); toast('Request sent to ' + person(l.hostId)); nav('#/requests');
  }

  if (kind === 'interview-answer') {
    const answer = val('answer');
    const q = INTERVIEW_QS[interviewState.idx];
    interviewState.answers[q.key] = answer;
    interviewState.idx++;
    const s = getStay(interviewState.stayId);
    s.interviewAnswers = interviewState.answers;
    save(); render();
    const ta = $('#ia'); if (ta) ta.focus();
  }

  if (kind === 'manual-save') {
    const s = getStay(form.dataset.id);
    const m = getManual(s.manualId);
    const intent = form.dataset.submittedIntent || 'save';
    delete form.dataset.submittedIntent;
    ['rules', 'wifi', 'appliances', 'emergency', 'extended_stay'].forEach(k => { m.sections[k].body = val(k); });
    m.sections.visitor_kit.items = val('visitor_kit').split('\n').map(x => x.trim()).filter(Boolean);
    m.sections.checkout.items = val('checkout').split('\n').map(x => x.trim()).filter(Boolean);
    if (intent === 'publish') {
      m.status = 'published';
      s.status = 'active';
      save(); toast('Manual published — your guest has everything'); nav('#/stay/' + s.id);
    } else { save(); toast('Draft saved'); render(); }
  }

  if (kind === 'guestbook') {
    const s = getStay(form.dataset.id);
    const m = getManual(s.manualId);
    const text = val('text');
    if (!text) return;
    m.guestbook.push({ by: db.currentUser, text });
    save(); toast('Added to the guestbook'); render();
  }

  if (kind === 'concierge') {
    const q = val('q');
    if (!q) return;
    askConcierge(form.dataset.id, q);
    render();
  }

  if (kind === 'checkout') {
    const s = getStay(form.dataset.id);
    const boxes = form.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(boxes).every(b => b.checked);
    if (!allChecked) { toast('Please complete every checklist item'); return; }
    closeStay(s, { description: val('idesc'), resolution: val('ires') });
    const inc = db.incidents.find(i => i.stayId === s.id);
    toast(inc ? 'Checked out — incident reported (notify & cover)' : 'Checked out — scoreboard updated');
    nav('#/stay/' + s.id);
  }
}

/* ---------- Render ---------- */
function render() {
  renderChrome();
  const view = $('#view');
  if (!db.welcomed) {
    view.innerHTML = screenWelcome();
    window.scrollTo(0, 0);
    return;
  }
  const r = route();
  let html = '';
  try {
    switch (r.name) {
      case 'home': html = screenHome(); break;
      case 'listing': html = r.param === 'new' ? screenListingNew() : screenListingDetail(r.param); break;
      case 'requests': html = screenRequests(); break;
      case 'stays': html = screenStays(); break;
      case 'stay': html = screenStay(r.param); break;
      case 'interview': html = screenInterview(r.param); break;
      case 'manual': html = screenManual(r.param); break;
      case 'concierge': html = screenConcierge(r.param); break;
      case 'checkout': html = screenCheckout(r.param); break;
      case 'score': html = screenScore(); break;
      default: html = screenHome();
    }
  } catch (e) {
    html = '<div class="card empty"><p>Something went wrong rendering this screen.</p></div>';
    console.error(e);
  }
  view.innerHTML = html;
  window.scrollTo(0, 0);
  wireCheckoutChecklist();
}

function wireCheckoutChecklist() {
  const form = document.querySelector('[data-form="checkout"]');
  if (!form) return;
  const btn = $('#checkoutBtn', form);
  const boxes = form.querySelectorAll('input[type="checkbox"]');
  const update = () => {
    const done = Array.from(boxes).every(b => b.checked);
    btn.disabled = !done;
    boxes.forEach(b => b.closest('[data-check]').classList.toggle('done', b.checked));
  };
  boxes.forEach(b => b.addEventListener('change', update));
  update();
}

/* ---------- Global events ---------- */
document.addEventListener('click', e => {
  const intentBtn = e.target.closest('[data-intent]');
  if (intentBtn) {
    const form = intentBtn.closest('form');
    if (form) form.dataset.submittedIntent = intentBtn.dataset.intent;
  }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = Actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el.dataset.id, el.dataset.q); }
});
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  handleForm(form);
});

/* ---------- Boot ---------- */
load();
if (!location.hash) location.hash = '#/home';
render();
