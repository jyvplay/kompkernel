import fs from 'node:fs';
import { bifrontPlan, bifrontRestore, BIFRONT_MAX_CHARS, BIFRONT_MAX_LINES } from '../../src/lib/omega/bifront';

const checks: { name: string; pass: boolean; kind: string; detail: string }[] = [];
function caseCheck(name: string, source: string, expected: 'fold' | 'identity') {
  const plan = bifrontPlan(source);
  const actual = plan ? 'fold' : 'identity';
  const back = plan ? bifrontRestore(plan.transformed, plan.suffix) : source;
  checks.push({ name, pass: actual === expected && back === source,
    kind: expected === 'fold' ? 'positive-control' : 'negative-space',
    detail: `expected=${expected}; actual=${actual}; exact=${back === source}; suffix=${plan?.suffix ?? '-'}` });
}

caseCheck('01 homogeneous extension control',
  't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts\nt 4 src/d.ts', 'fold');
caseCheck('02 only three rows',
  't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts', 'identity');
caseCheck('03 one-character common suffix',
  't 1 dir/aa\nt 2 dir/ba\nt 3 dir/ca\nt 4 dir/da', 'identity');
caseCheck('04 mixed .ts and .js (only one-character common suffix)',
  't 1 src/a.ts\nt 2 src/b.js\nt 3 src/c.ts\nt 4 src/d.js', 'identity');
caseCheck('05 shared partial suffix js across .cjs and .mjs is exact',
  't 1 src/a.cjs\nt 2 src/b.mjs\nt 3 src/c.cjs\nt 4 src/d.mjs', 'fold');
caseCheck('06 one ordinary non-path row',
  't 1 src/a.ts\nt 2 src/b.ts\nthis row is prose\nt 4 src/d.ts', 'identity');
caseCheck('07 final field is not a path although an earlier field is',
  'src/a.ts ordinary\nsrc/b.ts ordinary\nsrc/c.ts ordinary\nsrc/d.ts ordinary', 'identity');
caseCheck('08 bare filenames without slash or backslash',
  'a.ts\nb.ts\nc.ts\nd.ts', 'identity');
caseCheck('09 every path equals the common suffix; empty residual forbidden',
  '/same/path\n/same/path\n/same/path\n/same/path', 'identity');
caseCheck('10 blank line and blank-paragraph preservation',
  't 1 src/a.ts\n\nt 2 src/b.ts\nt 3 src/c.ts\nt 4 src/d.ts\n', 'fold');
caseCheck('11 CRLF byte preservation',
  't 1 src/a.ts\r\nt 2 src/b.ts\r\nt 3 src/c.ts\r\nt 4 src/d.ts\r\n', 'fold');
caseCheck('12 final LF preservation',
  't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts\nt 4 src/d.ts\n', 'fold');
caseCheck('13 trailing spaces preserved',
  't 1 src/a.ts  \nt 2 src/b.ts  \nt 3 src/c.ts  \nt 4 src/d.ts  ', 'fold');
caseCheck('14 tab-delimited prefix preserved',
  't\t1\tsrc/a.ts\nt\t2\tsrc/b.ts\nt\t3\tsrc/c.ts\nt\t4\tsrc/d.ts', 'fold');
caseCheck('15 Windows backslash paths',
  't 1 C:\\src\\a.ts\nt 2 C:\\src\\b.ts\nt 3 C:\\src\\c.ts\nt 4 C:\\src\\d.ts', 'fold');
caseCheck('16 Unicode path fields',
  't 1 src/東京/a.ts\nt 2 src/大阪/b.ts\nt 3 src/京都/c.ts\nt 4 src/神戸/d.ts', 'fold');
caseCheck('17 punctuation and quote characters remain in suffix',
  't 1 src/a"x]\nt 2 src/b"x]\nt 3 src/c"x]\nt 4 src/d"x]', 'fold');
caseCheck('18 suffix of 65 code points is outside bound',
  ['t 1 src/a' + 'x'.repeat(65), 't 2 src/b' + 'x'.repeat(65), 't 3 src/c' + 'x'.repeat(65), 't 4 src/d' + 'x'.repeat(65)].join('\n'), 'identity');
caseCheck('19 over line bound',
  Array.from({ length: BIFRONT_MAX_LINES + 1 }, (_, i) => `t ${i} src/${i}.ts`).join('\n'), 'identity');
caseCheck('20 empty input', '', 'identity');
caseCheck('21 over character bound', 't 1 src/a.ts\n' + 'x'.repeat(BIFRONT_MAX_CHARS), 'identity');
caseCheck('22 mixed path and URL-only suffix rows',
  't 1 src/a.ts\nt 2 https://example.test/b.ts\nt 3 src/c.ts\nt 4 src/d.ts', 'fold');
caseCheck('23 shared suffix but a path would be emptied',
  't 1 .ts\nt 2 src/a.ts\nt 3 src/b.ts\nt 4 src/c.ts', 'identity');
caseCheck('24 no common terminal suffix',
  't 1 src/a.ts\nt 2 src/b.js\nt 3 src/c.css\nt 4 src/d.json', 'identity');
caseCheck('25 one suffix-outlier row prevents universal rule',
  't 1 src/a.ts\nt 2 src/b.ts\nt 3 src/c.ts\nt 4 src/d', 'identity');
caseCheck('26 final fields are ordinary words, not path fields',
  'src/a.ts status\nsrc/b.ts status\nsrc/c.ts status\nsrc/d.ts status', 'identity');
const malformedWire = 'row with no path\nt 2 src/b.ts';
const malformedBack = bifrontRestore(malformedWire, '.ts');
checks.push({ name: '27 malformed transformed input fails closed', pass: malformedBack === malformedWire,
  kind: 'negative-space', detail: `unchanged=${malformedBack === malformedWire}` });
caseCheck('28 long divergent prefix with short shared suffix (quadratic-scan stress)',
  `t 1 src/${'x'.repeat(46_000)}tail.ts\nt 2 src/a.ts\nt 3 src/b.ts\nt 4 src/c.ts`, 'fold');

// Modal-shortcut falsification: two distinct source classes deliberately map
// to the same transformed path body. Only the in-band suffix parameter keeps
// the encoding injective; a decoder that silently assumes the familiar .js
// suffix must fail on the .jsx source.
const js = ['t 1 src/a.js','t 2 src/b.js','t 3 src/c.js','t 4 src/d.js'].join('\n');
const jsx = ['t 1 src/a.jsx','t 2 src/b.jsx','t 3 src/c.jsx','t 4 src/d.jsx'].join('\n');
const jsPlan = bifrontPlan(js), jsxPlan = bifrontPlan(jsx);
const modalPass = Boolean(jsPlan && jsxPlan && jsPlan.transformed === jsxPlan.transformed
  && jsPlan.suffix !== jsxPlan.suffix
  && bifrontRestore(jsPlan.transformed, jsPlan.suffix) === js
  && bifrontRestore(jsxPlan.transformed, jsxPlan.suffix) === jsx
  && bifrontRestore(jsxPlan.transformed, jsPlan.suffix) !== jsx);
checks.push({ name: '29 MODAL-SHORTCUT FALSIFICATION: familiar .js must not be guessed for .jsx',
  pass: modalPass, kind: 'modal-shortcut-falsification',
  detail: `sameBody=${Boolean(jsPlan && jsxPlan && jsPlan.transformed === jsxPlan.transformed)}; `
    + `params=${jsPlan?.suffix ?? '-'} vs ${jsxPlan?.suffix ?? '-'}; wrongParameterRejected=${Boolean(jsxPlan && bifrontRestore(jsxPlan.transformed, jsPlan?.suffix ?? '') !== jsx)}` });

const failures = checks.filter(x => !x.pass);
const summary = { total: checks.length, pass: checks.length - failures.length, fail: failures.length,
  negativeCases: checks.filter(x => x.kind === 'negative-space').length,
  modalShortcutPass: modalPass, checks };
fs.mkdirSync('bench/x46/receipts', { recursive: true });
fs.writeFileSync('bench/x46/receipts/redteam.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ total: summary.total, pass: summary.pass, fail: summary.fail,
  negativeCases: summary.negativeCases, modalShortcutPass: summary.modalShortcutPass,
  failures }, null, 2));
if (failures.length) process.exitCode = 1;
