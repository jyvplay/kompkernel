import * as fs from 'node:fs';
import { chironEncode, chironFindBlocks, enumerateTokenSpans } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';

const enc: any = 'o200k_base';
const failures: string[] = [];
const lines = Array.from({ length: 900 }, (_, i) =>
  `2026-10-27T12:${String(i % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.${String(i * 137 % 1_000_000).padStart(6, '0')} INFO req=${i} status=${200 + i % 5} path=/api/v${i % 9}/items/${i}`);
const stress = lines.join('\n');

const blockMeterA = { n: 0, max: 30_000 };
const blockA = chironFindBlocks(stress, '@', '\n', enc, Number.POSITIVE_INFINITY, blockMeterA);
const blockMeterB = { n: 0, max: 30_000 };
const blockB = chironFindBlocks(stress, '@', '\n', enc, Number.POSITIVE_INFINITY, blockMeterB);
const blockDeterministic = JSON.stringify(blockA) === JSON.stringify(blockB)
  && blockMeterA.n === blockMeterB.n && blockMeterA.n <= blockMeterA.max;
if (!blockDeterministic) failures.push('block search is not deterministic or exceeded its cap');

const macroMeter = { n: 0, max: 2_000 };
const spans = enumerateTokenSpans([stress.slice(0, 8_000)], enc, macroMeter);
const macroBounded = macroMeter.n <= macroMeter.max && spans.size <= 400_000;
if (!macroBounded) failures.push('token-span enumeration exceeded its cap');

// Under OMEGA_DET=1 the wall clock is constant, so this proves the new unit cap,
// rather than a deadline, terminates a normal CHIRON encode. Run twice to verify
// that fixed input + fixed budget produces the same exact wire.
const budget = 18_000;
const first = chironEncode(stress.slice(0, 12_000), enc, { workUnits: budget, budgetMs: 4_000 });
const second = chironEncode(stress.slice(0, 12_000), enc, { workUnits: budget, budgetMs: 4_000 });
const codecDeterministic = first.wire === second.wire
  && first.messageTokens === second.messageTokens
  && first.decoded === stress.slice(0, 12_000)
  && second.decoded === stress.slice(0, 12_000)
  && first.exact && second.exact;
if (!codecDeterministic) failures.push('fixed-work CHIRON runs differ or failed exact decode');

const receipt = {
  test: 'CHIRON deterministic total work budget',
  mode: process.env.OMEGA_DET === '1' ? 'OMEGA_DET=1' : 'normal clock + fixed workUnits option',
  input: { stressChars: stress.length, stressLines: lines.length, testedChars: 12_000 },
  blockSearch: { deterministic: blockDeterministic, candidatesA: blockA.length, candidatesB: blockB.length,
    workA: blockMeterA.n, workB: blockMeterB.n, cap: blockMeterA.max, passed: blockDeterministic },
  macroEnumeration: { work: macroMeter.n, cap: macroMeter.max, entries: spans.size, passed: macroBounded },
  fixedWorkEncode: { deterministic: codecDeterministic, workUnits: budget,
    first: { exact: first.exact, messageTokens: first.messageTokens, mode: first.mode, ms: first.ms, notes: first.notes },
    second: { exact: second.exact, messageTokens: second.messageTokens, mode: second.mode, ms: second.ms, notes: second.notes },
    sourceTokens: countTokens(stress.slice(0, 12_000), enc), passed: codecDeterministic },
  failures,
};
fs.mkdirSync('bench/x48/receipts', { recursive: true });
fs.writeFileSync('bench/x48/receipts/chiron-budget.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (failures.length) process.exitCode = 1;
