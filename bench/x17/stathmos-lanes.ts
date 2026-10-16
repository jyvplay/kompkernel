// X17: STATHMOS on the 28 X16 lanes. Per lane: exact decode, transform used or not, o200k message tokens,
// and the LAKONIKOS-D base on the same input (same process, OMEGA_DET=1).
import fs from 'node:fs';
import path from 'node:path';
import { stathmosEncode, stathmosDecode } from '@/lib/omega/stathmos';
const ROOT = '/home/user/kompkernel';
const lanes = fs.readFileSync(path.join(ROOT, 'bench/x16/lanes-all.txt'), 'utf8').split('\n').filter(Boolean);
for (const rel of lanes) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const e = stathmosEncode(text);
  const exact = stathmosDecode(e.wire) === text;
  console.log(JSON.stringify({ lane: path.basename(rel), exact, transformed: e.transformed, dp: e.dp.join(','), stathmosO200k: e.messageTokens.o200k_base, lakonikosDO200k: e.baseTokens.o200k_base, stathmosCl100k: e.messageTokens.cl100k_base, notes: e.notes }));
}
