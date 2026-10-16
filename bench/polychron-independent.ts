/** Export POLYCHRON wire cases for the independent CPython reader. */
import fs from 'node:fs';
import path from 'node:path';
import { polychronEncode } from '@/lib/omega/polychron';

const ROOT = '/home/user/kompkernel';
const lanes = fs.readFileSync(path.join(ROOT, 'bench/x16/lanes-all.txt'), 'utf8').split('\n').filter(Boolean);
const cases = lanes.map((file) => {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const r = polychronEncode(text, 'o200k_base');
  return { file, text, wire: r.wire, arm: r.arm, transformed: r.transformed, days: r.days, dp: r.dp };
});
const out = path.join(ROOT, 'bench/polychron/receipts/independent-cases.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(cases), 'utf8');
console.error(`POLYCHRON independent cases: ${cases.length}; ${out}`);
