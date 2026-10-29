import * as fs from 'node:fs';
import { kephalaionPlan } from '../../src/lib/omega/kephalaion';
const ENC = 'o200k_base' as const;
const base = [
  ['alpha', 120, 30, 4], ['beta', 85, 12, 3], ['gamma', 200, 41, 6],
  ['delta', 0, 0, 0], ['epsilon', 64, 9, 2], ['zeta', 31, 17, 1], ['eta', 149, 28, 5],
] as const;
const sums = [0, 0, 0];
base.forEach((r) => { sums[0] += r[1]; sums[1] += r[2]; sums[2] += r[3]; });
const text = ['name,sent,opened,failed', ...base.map((r) => r.join(',')), 'TOTAL,' + sums.join(',')].join('\n') + '\n';
const p = kephalaionPlan(text, ENC);
if (!p) throw new Error('no plan');
fs.writeFileSync('bench/x55/payloads/colsum.payload', p.contract + '\n' + p.reducedText);
fs.writeFileSync('bench/x55/payloads/colsum.expected', text);
console.log('rowsum=', !!p.spec.rowsum, 'colsum=', !!p.spec.colsum, '|', p.contract);
