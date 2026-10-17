/* Concierge eval: 20 guest questions against a realistic manual.
   15 must resolve to the right section with a citation; 5 are unanswerable
   from the manual and must return null (the UI renders the "I don't know"
   fallback). The AI functions are globals once the app boots. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')
  .replace("'use strict';", ''); // test scaffolding: expose AI fns on window

const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;
w.eval(appJs);

const MANUAL = { sections: {
  rules:         { title: 'House rules', body: 'Quiet hours after 10pm, shoes off at the door.\n\n**Parking & entry:** Park in the driveway, enter via the side door. Code 4410.' },
  wifi:          { title: 'Wifi', body: 'Network HomeNet, password bellevue123' },
  appliances:    { title: 'Kitchen & appliances', body: 'Dishwasher is finicky — use the pods under the sink. Thermostat stays at 68.' },
  emergency:     { title: 'Emergency info', body: 'Water shutoff in the garage. Breaker box in the laundry room. Call Hari: 555-0100.' },
  extended_stay: { title: 'Extended stays', body: 'Trash day is Tuesday. Water the fiddle-leaf fig once a week.' },
  visitor_kit:   { title: 'Visitor kit', items: ['Fresh towels', 'Fresh bedsheets', 'Pillows', 'Napkins / tissues', 'Toilet paper', 'Hand soap'] },
  checkout:      { title: 'Checkout checklist', items: ['Strip the bed linens', 'Take out the trash'] },
}};

// [question, expected section title | null for "must deflect"]
const CASES = [
  ["What's the wifi password?", 'Wifi'],
  ['How do I get internet?', 'Wifi'],
  ['Where should I park?', 'House rules'],
  ['What is the door code?', 'House rules'],
  ['How does the dishwasher work?', 'Kitchen & appliances'],
  ['The house is cold, how do I adjust the heat?', 'Kitchen & appliances'],
  ['Where is the water shutoff?', 'Emergency info'],
  ['Who do I call in an emergency?', 'Emergency info'],
  ['When is trash day?', 'Extended stays'],
  ['Are there extra towels?', 'Visitor kit'],
  ['What time is checkout?', 'Checkout checklist'],
  ['What are the house rules?', 'House rules'],
  ['Can I do laundry?', 'Kitchen & appliances'],
  ['Is there shampoo in the bathroom?', 'Visitor kit'],
  ['Where is the breaker box?', 'Emergency info'],
  // unanswerable — must deflect, never hallucinate
  ['Can I bring my dog?', null],
  ['Book me a flight home', null],
  ["What's the weather this weekend?", null],
  ['Can I extend my stay by two days?', null],
  ['Any restaurant recommendations nearby?', null],
];

const results = [];
let pass = 0;
CASES.forEach(([q, expected], i) => {
  const ans = w.conciergeAnswer(MANUAL, q);
  let ok, detail;
  if (expected === null) {
    ok = ans === null;
    detail = ok ? 'deflected' : 'answered: ' + JSON.stringify(ans && ans.section);
  } else {
    ok = !!ans && ans.section === expected && String(ans.body).trim().length > 0;
    detail = ans ? ans.section : 'null';
  }
  results.push(ok);
  if (ok) pass++;
  console.log((ok ? 'PASS' : 'FAIL') + ' | C' + (i + 1) + ' "' + q + '" → ' + detail);
});
const answered = CASES.filter((c, i) => c[1] !== null && results[i]).length;
console.log('\n==== ' + pass + '/' + CASES.length + ' passed (' + answered + '/15 answerable correct, ' +
  CASES.filter((c, i) => c[1] === null && results[i]).length + '/5 deflected) ====');
process.exit(pass === CASES.length ? 0 : 1);
