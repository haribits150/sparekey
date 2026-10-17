/* Manual-generator eval: 10 sample host interviews through
   buildManualFromInterview. Checks section completeness, the aligned
   6-item visitor kit, parking folded into rules, and sane fallbacks for
   empty answers. */
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

const KIT = ['Fresh towels', 'Fresh bedsheets', 'Pillows', 'Napkins / tissues', 'Toilet paper', 'Hand soap'];
const SECTION_KEYS = ['rules', 'wifi', 'appliances', 'emergency', 'extended_stay', 'visitor_kit', 'checkout'];
const stay = { id: 'stay_eval' };

let pass = 0, total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) pass++;
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' — ' + detail : ''));
}
function baseChecks(tag, m) {
  const keys = Object.keys(m.sections || {});
  check(tag + ' all sections present', SECTION_KEYS.every(k => keys.includes(k)), keys.join(','));
  check(tag + ' visitor kit = 6 aligned items',
    JSON.stringify((m.sections.visitor_kit || {}).items) === JSON.stringify(KIT));
  check(tag + ' status draft', m.status === 'draft');
  check(tag + ' linked to stay', m.stayId === 'stay_eval');
}

const FULL = {
  rules: 'Quiet hours after 10pm. Shoes off at the door. No smoking.',
  appliances: 'Dishwasher is finicky — use the pods under the sink.',
  wifi: 'Network HomeNet, password bellevue123',
  parking: 'Park in the driveway. Side door, code 4410.',
  extended: 'Trash day Tuesday. Water the fig weekly.',
  emergency: 'Water shutoff in garage. Call Hari 555-0100.',
};

// M1: complete interview
let m = w.buildManualFromInterview(stay, FULL);
baseChecks('M1', m);
check('M1 rules body kept', /Quiet hours/.test(m.sections.rules.body));
check('M1 parking folded into rules', /4410/.test(m.sections.rules.body));
check('M1 wifi kept', /bellevue123/.test(m.sections.wifi.body));

// M2: completely empty interview → sane fallbacks, never blank crash
m = w.buildManualFromInterview(stay, {});
baseChecks('M2', m);
check('M2 rules fallback', m.sections.rules.body === 'Be a good guest.');
check('M2 empty optionals stay empty', m.sections.wifi.body === '' && m.sections.appliances.body === '');

// M3: wifi only
m = w.buildManualFromInterview(stay, { wifi: 'Net X / pw y' });
check('M3 wifi kept, rest default', /pw y/.test(m.sections.wifi.body) && m.sections.rules.body === 'Be a good guest.');

// M4: rules + parking only
m = w.buildManualFromInterview(stay, { rules: 'No parties.', parking: 'Street parking only.' });
check('M4 parking folded into rules', /Street parking/.test(m.sections.rules.body) && /No parties/.test(m.sections.rules.body));

// M5: appliances + emergency only
m = w.buildManualFromInterview(stay, { appliances: 'Oven runs hot.', emergency: 'Call 911, then me.' });
check('M5 sections kept', /Oven runs hot/.test(m.sections.appliances.body) && /Call 911/.test(m.sections.emergency.body));

// M6: extended-stay only
m = w.buildManualFromInterview(stay, { extended: 'Mail pile on the counter is fine.' });
check('M6 extended kept', /Mail pile/.test(m.sections.extended_stay.body));

// M7: long verbose answers preserved verbatim
const long = 'Line one. '.repeat(20);
m = w.buildManualFromInterview(stay, { rules: long });
check('M7 long answer preserved', m.sections.rules.body === long.trim());

// M8: HTML/script in answers stored raw (render layer escapes)
m = w.buildManualFromInterview(stay, { wifi: '<script>alert(1)</script>' });
check('M8 raw stored (render escapes)', m.sections.wifi.body === '<script>alert(1)</script>');

// M9: whitespace-only answers treated as empty
m = w.buildManualFromInterview(stay, { rules: '   ', wifi: '  ' });
check('M9 whitespace = empty', m.sections.rules.body === 'Be a good guest.' && m.sections.wifi.body === '');

// M10: unicode/emoji preserved
m = w.buildManualFromInterview(stay, { rules: 'Aloha 🤙 shoes off please' });
check('M10 unicode preserved', /Aloha 🤙/.test(m.sections.rules.body));

console.log('\n==== ' + pass + '/' + total + ' passed ====');
process.exit(pass === total ? 0 : 1);
