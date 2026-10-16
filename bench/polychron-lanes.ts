/** Run POLYCHRON on the 28-lane X16 corpus. Each row is a fresh encode and a fresh reader check. */
import fs from 'node:fs';
import path from 'node:path';
import { polychronEncode, polychronDecode } from '@/lib/omega/polychron';
import { countTokens } from '@/lib/omega/bpe';

const ROOT = '/home/user/kompkernel';
const lanes = fs.readFileSync(path.join(ROOT, 'bench/x16/lanes-all.txt'), 'utf8').split('\n').filter(Boolean);
const outPath = path.join(ROOT, 'bench/polychron/receipts/lanes.jsonl');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const out: string[] = [];
for (const rel of lanes) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const r = polychronEncode(text, 'o200k_base');
  const decoded = polychronDecode(r.wire);
  const exact = decoded === text && Buffer.from(decoded, 'utf8').equals(Buffer.from(text, 'utf8')) && r.decoded === text && r.exact;
  out.push(JSON.stringify({
    file: rel,
    raw: countTokens(text, 'o200k_base'),
    polychron: r.messageTokens.o200k_base,
    lakonikosD: r.baseTokens.o200k_base,
    deltaVsBase: r.messageTokens.o200k_base - r.baseTokens.o200k_base,
    arm: r.arm,
    transformed: r.transformed,
    exact,
    days: r.days,
    dp: r.dp,
    notes: r.notes,
  }));
}
fs.writeFileSync(outPath, out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
console.error(`POLYCHRON lanes: ${out.length}; receipt=${outPath}`);
