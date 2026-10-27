import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { nestRestore, nestSelfTests, nestTransform } from '../../src/lib/omega/nest';
import { countTokens } from '../../src/lib/omega/bpe';

const rows: Array<Record<string, unknown>> = [];
let failed = 0;
function record(name: string, pass: boolean, detail: Record<string, unknown> = {}): void {
  if (!pass) failed++;
  rows.push({ name, pass, ...detail });
}

for (const check of nestSelfTests()) record(`self-${check.name}`, check.pass, check);

// Real checked-in files are probes, not synthetic substitutes for application
// data. A no-plan result is valid; any plan must restore the exact UTF-8 bytes.
const realPaths = [
  'bench/holdout-mk/page.html',
  'bench/holdout-mk/chart.svg',
  'bench/holdout-mk/pom.xml',
  'bench/holdout-mk/component.jsx',
  'bench/holdout-mk/dump.sql',
  'bench/holdout-mk/paper.tex',
  'bench/holdout-mk/agent-history.md',
  'bench/x47/holdouts/apache-maven.pom.xml',
  'bench/x47/holdouts/commons-lang.pom.xml',
];
for (const path of realPaths) {
  const text = fs.readFileSync(path, 'utf8');
  const plan = nestTransform(text);
  const restored = plan ? nestRestore(plan.transformed, plan.delimiters) : null;
  const exact = plan === null || Buffer.compare(Buffer.from(restored ?? '', 'utf8'), Buffer.from(text, 'utf8')) === 0;
  record(`file-${path}`, exact, {
    path,
    sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length,
    rawTokens: countTokens(text, 'o200k_base'),
    plan: Boolean(plan),
    records: plan?.records ?? 0,
    slots: plan?.slots ?? 0,
    depth: plan?.depth ?? 0,
    proxyGain: plan?.proxyGain ?? null,
    exact: plan ? exact : null,
  });
}

// HTML edge cases: voids and raw-text elements are handled structurally; fake
// tags in comments/scripts are not parsed as children. These are authored tests.
const htmlCases: Array<[string, string, boolean]> = [
  ['voids-plus-nested', '<!doctype html><html><body><section><img src="a"><div><p>one</p></div></section><section><img src="b"><div><p>two</p></div></section><section><img src="c"><div><p>three</p></div></section></body></html>', true],
  ['rawtext-fake-tag', '<!doctype html><html><body><section><script>const s="<fake></fake>";</script><p>one</p></section><section><script>const s="<fake></fake>";</script><p>two</p></section><section><script>const s="<fake></fake>";</script><p>three</p></section></body></html>', true],
  ['rawtext-fake-close-prefix', '<!doctype html><html><body><script>const s="</scriptx>";</script><p>x</p></body></html>', false],
  ['unclosed-rawtext', '<!doctype html><script>const x=1;', false],
  ['mismatched-html', '<!doctype html><html><body><p>x</div></body></html>', false],
];
for (const [name, text, expectsPlan] of htmlCases) {
  const plan = nestTransform(text);
  const restored = plan ? nestRestore(plan.transformed, plan.delimiters) : null;
  const exact = !plan || Buffer.compare(Buffer.from(restored ?? '', 'utf8'), Buffer.from(text, 'utf8')) === 0;
  record(`html-${name}`, Boolean(plan) === expectsPlan && exact, {
    plan: Boolean(plan), expectedPlan: expectsPlan, exact: plan ? exact : null,
    records: plan?.records ?? 0, slots: plan?.slots ?? 0, depth: plan?.depth ?? 0,
  });
}

// Collision, malformed-wire and size-bound attacks target this codec's own
// macro grammar, not merely its parser.
const fixture = '<root><record id="a"><meta><name>A</name></meta><data><x>1</x><y>fixed</y></data></record><record id="b"><meta><name>B</name></meta><data><x>2</x><y>fixed</y></data></record><record id="c"><meta><name>C</name></meta><data><x>3</x><y>fixed</y></data></record></root>';
const plan = nestTransform(fixture);
if (!plan) {
  record('attack-fixture-plan-exists', false);
} else {
  const d = plan.delimiters;
  const badField = plan.transformed.replace(d.field, d.row);
  const badClose = plan.transformed.replace(d.close, d.open);
  const duplicateSlot = plan.transformed.replace('{{2}}', '{{1}}');
  const rejects = (candidate: string) => {
    const result = nestRestore(candidate, d);
    return result === null || result !== fixture;
  };
  record('attack-corrupt-field-delimiter', rejects(badField));
  record('attack-corrupt-close-marker', rejects(badClose));
  record('attack-duplicate-slot-id', rejects(duplicateSlot));

  const markerPool = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];
  record('attack-all-delimiters-collide', nestTransform(fixture + markerPool.join('')) === null);
}
record('attack-over-size-limit', nestTransform('x'.repeat(100_001)) === null);

// Seeded synthetic fuzz is reported separately from real-file measurements.
let seed = 0x48e57;
const rand = (n: number): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
let fuzzExact = 0;
for (let k = 0; k < 200; k++) {
  const n = 3 + rand(5);
  const records = Array.from({ length: n }, (_, i) => {
    const a = `${k}-${i}-${rand(1000)}`;
    const b = `${rand(10)}-${i % 3}`;
    return `<r id="${i}"><meta><a>${a}</a><b>fixed</b></meta><data><x>${b}</x><y>${i}</y></data></r>`;
  }).join('\n');
  const text = `<root>\n${records}\n</root>`;
  const p = nestTransform(text);
  const back = p ? nestRestore(p.transformed, p.delimiters) : null;
  const exact = !p || Buffer.compare(Buffer.from(back ?? '', 'utf8'), Buffer.from(text, 'utf8')) === 0;
  if (p && exact) fuzzExact++;
  if (!exact) failed++;
}
record('seeded-fuzz-summary', failed === 0, { cases: 200, plansExact: fuzzExact, kind: 'generated test input, not real corpus' });

const summary = {
  codec: 'NEST', tests: rows.length + 200, authoredChecks: rows.length,
  fuzzCases: 200, fuzzPlansExact: fuzzExact, failures: failed,
  exactScope: 'planner/restore and bounded markup parser only; complete-message frontier cost is a separate gate',
};
fs.mkdirSync('bench/x48/receipts', { recursive: true });
fs.writeFileSync('bench/x48/receipts/nest-redteam.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
for (const row of rows) console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.name}`);
if (failed) process.exitCode = 1;
