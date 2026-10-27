import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { kolumnDecode, kolumnEncodeTransform, kolumnSelfTests } from '../../src/lib/omega/kolumn';

const rows: Array<Record<string, unknown>> = [];
let failures = 0;
function record(name: string, pass: boolean, detail: Record<string, unknown> = {}): void {
  if (!pass) failures++;
  rows.push({ name, pass, ...detail });
}
for (const test of kolumnSelfTests()) record(`self-${test.name}`, test.pass, test);

const realPaths = [
  'bench/holdout-tab/aapl-2014.csv',
  'bench/holdout-tab/vix-daily-1990.csv',
  'bench/holdout-tbl/markdown-table.md',
  'bench/holdout-ops/find-listing.txt',
  'bench/holdout-ops/ls-full-iso.txt',
  'bench/holdout-x40/metrics.tsv',
  'bench/holdout-x40/prices.csv',
];
for (const path of realPaths) {
  const text = fs.readFileSync(path, 'utf8');
  const plan = kolumnEncodeTransform(text);
  const exact = !plan || Buffer.compare(Buffer.from(kolumnDecode(plan.wire, plan.delimiters) ?? '', 'utf8'),
    Buffer.from(text, 'utf8')) === 0;
  record(`file-${path}`, exact, {
    path, sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length, sourceTokens: countTokens(text, 'o200k_base'), plan: Boolean(plan),
    rows: plan?.rows ?? 0, cols: plan?.cols ?? 0, modes: plan?.modes ?? [],
    transformedTokens: plan ? countTokens(plan.wire, 'o200k_base') : null,
    proxyTokens: plan?.proxyTokens ?? null, exact: plan ? exact : null,
  });
}

const fixture = 'date,open,high,copy\n2026-01-01,10.00,10.00,10.00\n2026-01-02,10.25,10.25,10.25\n2026-01-03,10.50,10.50,10.50\n2026-01-04,10.75,10.75,10.75\n2026-01-05,11.00,11.00,11.00\n2026-01-06,11.25,11.25,11.25\n2026-01-07,11.50,11.50,11.50\n2026-01-08,11.75,11.75,11.75\n2026-01-09,12.00,12.00,12.00\n';
const plan = kolumnEncodeTransform(fixture);
if (!plan) record('attack-fixture-plan-exists', false);
else {
  const d = plan.delimiters;
  const openAt = plan.wire.indexOf(d.open);
  const meta1 = plan.wire.indexOf(d.meta, openAt + d.open.length + 1);
  const meta2 = plan.wire.indexOf(d.meta, meta1 + d.meta.length);
  const dataStart = meta2 + d.meta.length;
  const closeAt = plan.wire.indexOf(d.close, dataStart);
  const missingClose = plan.wire.slice(0, closeAt) + plan.wire.slice(closeAt + d.close.length);
  const wrongColumn = plan.wire.replace(d.col, d.value);
  const wrongModeScale = plan.wire.replace(/[DPG][0-9]+(?:x[0-9]+)?/, m => `${m[0]}999`);
  for (const [name, wire] of [['missing-close', missingClose], ['column-delimiter-collision', wrongColumn], ['scale-overflow', wrongModeScale]] as const) {
    const decoded = kolumnDecode(wire, d);
    record(`attack-${name}`, decoded === null || decoded !== fixture, { rejected: decoded === null, exact: decoded === fixture });
  }
  const descriptorList = plan.wire.slice(dataStart, closeAt).split(d.col);
  const deltaIndex = descriptorList.findIndex(x => /^[DPG][0-9]+/.test(x));
  let firstDeltaChange = plan.wire;
  if (deltaIndex >= 0) {
    const fields = descriptorList[deltaIndex].split(d.value);
    const last = fields.length - 1;
    fields[last] = (BigInt(fields[last]) + 1n).toString();
    descriptorList[deltaIndex] = fields.join(d.value);
    firstDeltaChange = plan.wire.slice(0, dataStart) + descriptorList.join(d.col) + plan.wire.slice(closeAt);
  }
  const tampered = kolumnDecode(firstDeltaChange, d);
  record('attack-delta-tamper', deltaIndex >= 0 && (tampered === null || tampered !== fixture),
    { deltaIndex, rejected: tampered === null, exact: tampered === fixture });
}

const timestampFixture = 'ts,value\n' + Array.from({ length: 9 }, (_, i) => {
  const ts = new Date(Date.UTC(2024, 1, 28, 23, 59, 58) + i * 2000).toISOString().replace('.000Z', 'Z');
  return `${ts},${100 + i * 2}`;
}).join('\n') + '\n';
const timestampPlan = kolumnEncodeTransform(timestampFixture);
if (!timestampPlan || !timestampPlan.modes.includes('T')) record('attack-T-fixture-plan', false);
else {
  const d = timestampPlan.delimiters;
  const openAt = timestampPlan.wire.indexOf(d.open);
  const meta1 = timestampPlan.wire.indexOf(d.meta, openAt + d.open.length + 1);
  const meta2 = timestampPlan.wire.indexOf(d.meta, meta1 + d.meta.length);
  const dataStart = meta2 + d.meta.length;
  const closeAt = timestampPlan.wire.indexOf(d.close, dataStart);
  const descriptors = timestampPlan.wire.slice(dataStart, closeAt).split(d.col);
  const tIndex = descriptors.findIndex(x => x.startsWith(`T${d.value}`));
  const fields = descriptors[tIndex].split(d.value);
  const invalidBaseFields = [...fields];
  invalidBaseFields[2] = '2023-02-29T00:00:00Z';
  const invalidBaseDescriptors = [...descriptors];
  invalidBaseDescriptors[tIndex] = invalidBaseFields.join(d.value);
  const invalidBaseWire = timestampPlan.wire.slice(0, dataStart) + invalidBaseDescriptors.join(d.col)
    + timestampPlan.wire.slice(closeAt);
  const invalidStepFields = [...fields];
  invalidStepFields[1] = '1500.5';
  const invalidStepDescriptors = [...descriptors];
  invalidStepDescriptors[tIndex] = invalidStepFields.join(d.value);
  const invalidStepWire = timestampPlan.wire.slice(0, dataStart) + invalidStepDescriptors.join(d.col)
    + timestampPlan.wire.slice(closeAt);
  record('attack-T-invalid-calendar', tIndex >= 0 && kolumnDecode(invalidBaseWire, d) === null,
    { tIndex, rejected: kolumnDecode(invalidBaseWire, d) === null });
  record('attack-T-fractional-step', tIndex >= 0 && kolumnDecode(invalidStepWire, d) === null,
    { tIndex, rejected: kolumnDecode(invalidStepWire, d) === null });
}

// Modal-shortcut falsification: semicolon + CRLF + no final EOL must not be
// decoded using the familiar comma/LF/final-newline defaults.
const modalFixture = ['id;value', ...Array.from({ length: 8 }, (_, i) => `r${i};${200 + i}`)].join('\r\n');
const modalPlan = kolumnEncodeTransform(modalFixture);
if (!modalPlan) record('modal-shortcut-plan', false);
else {
  const correct = kolumnDecode(modalPlan.wire, modalPlan.delimiters);
  const firstLf = modalPlan.wire.indexOf('\n');
  const delimiterAt = firstLf + 1 + modalPlan.delimiters.open.length;
  const commaAssumption = modalPlan.wire.slice(0, delimiterAt) + ',' + modalPlan.wire.slice(delimiterAt + 1);
  const crlfAssumption = modalPlan.wire.replace(/\r\n/g, '\n');
  const trailingEolAssumption = modalPlan.wire + '\r\n';
  const commaDecoded = kolumnDecode(commaAssumption, modalPlan.delimiters);
  const crlfDecoded = kolumnDecode(crlfAssumption, modalPlan.delimiters);
  const trailingDecoded = kolumnDecode(trailingEolAssumption, modalPlan.delimiters);
  record('modal-shortcut-delimiter', correct === modalFixture && (commaDecoded === null || commaDecoded !== modalFixture),
    { correctExact: correct === modalFixture, wrongDelimiterRejected: commaDecoded === null, wrongDelimiterExact: commaDecoded === modalFixture });
  record('modal-shortcut-CRLF', correct === modalFixture && crlfDecoded !== modalFixture,
    { correctExact: correct === modalFixture, wrongEolChangesBytes: crlfDecoded !== modalFixture });
  record('modal-shortcut-trailing-EOL', correct === modalFixture && trailingDecoded !== modalFixture,
    { correctExact: correct === modalFixture, wrongTrailingEolChangesBytes: trailingDecoded !== modalFixture });
}

const allMarkers = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];
record('attack-colliding-marker-alphabet', kolumnEncodeTransform(fixture + allMarkers.join('')) === null);
record('attack-over-size-limit', kolumnEncodeTransform('x'.repeat(100_001)) === null);

// BigInt and Unicode are generated-test probes, not claimed as real-world wins.
const big = 'id,value\n' + Array.from({ length: 12 }, (_, i) => `r${i},${123456789012345678901234567890n + BigInt(i)}`).join('\n') + '\n';
const bigPlan = kolumnEncodeTransform(big);
record('generated-bigint-exact', Boolean(bigPlan) && kolumnDecode(bigPlan!.wire, bigPlan!.delimiters) === big,
  { planned: Boolean(bigPlan), rows: bigPlan?.rows ?? 0, modes: bigPlan?.modes ?? [] });
const unicode = 'id,name,value\n' + Array.from({ length: 10 }, (_, i) => `${i},café-🧠-${i},${1000 + i}`).join('\n') + '\n';
const unicodePlan = kolumnEncodeTransform(unicode);
record('generated-unicode-exact', Boolean(unicodePlan) && kolumnDecode(unicodePlan!.wire, unicodePlan!.delimiters) === unicode,
  { planned: Boolean(unicodePlan), rows: unicodePlan?.rows ?? 0, modes: unicodePlan?.modes ?? [] });

let seed = 0x48c011;
const rand = (n: number): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
let fuzzPlans = 0;
let fuzzFailures = 0;
for (let k = 0; k < 200; k++) {
  const n = 8 + rand(13);
  const base = BigInt(1_000_000 + rand(100_000));
  const lines = Array.from({ length: n }, (_, i) => `r${i},${(base + BigInt(i * (1 + rand(5)))).toString()}.00,${i % 4 ? 'flat' : `s${rand(20)}`}`);
  const text = `id,price,label\n${lines.join('\n')}${k % 2 ? '\n' : ''}`;
  const p = kolumnEncodeTransform(text);
  const back = p ? kolumnDecode(p.wire, p.delimiters) : null;
  const exact = !p || Buffer.compare(Buffer.from(back ?? '', 'utf8'), Buffer.from(text, 'utf8')) === 0;
  if (p && exact) fuzzPlans++;
  if (!exact) { fuzzFailures++; failures++; }
}
record('seeded-fuzz-summary', fuzzFailures === 0, { cases: 200, plansExact: fuzzPlans,
  fuzzFailures, kind: 'generated table inputs, not real corpus' });

const summary = { codec: 'KOLUMN', tests: rows.length + 200, authoredChecks: rows.length,
  fuzzCases: 200, fuzzPlansExact: fuzzPlans, failures,
  exactScope: 'parser, per-column transform, and inverse only; complete-message frontier gate is measured in verify.ts' };
fs.mkdirSync('bench/x48/receipts', { recursive: true });
fs.writeFileSync('bench/x48/receipts/kolumn-redteam.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
for (const row of rows) console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.name}`);
if (failures) process.exitCode = 1;
