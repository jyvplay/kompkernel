// Z31: PHALANX-A8 (VERITAS-U as VX stage) vs PHALANX-A7 (VERITAS-A best-of-3), o200k, per file, both decoded and checked.
// usage: node a8-eval.cjs <list-file> <out.jsonl> [both|a8]   list-file lines: <group>\t<path>
import fs from 'node:fs';
import { phalanxA7Encode, phalanxA7Decode } from '@/lib/omega/phalanx-a7';
import { phalanxA8Encode, phalanxA8Decode } from '@/lib/omega/phalanx-a8';
const [, , listFile, outFile, mode = 'both'] = process.argv;
const rows = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
fs.writeFileSync(outFile, '');
let fail = 0;
for (const [group, f] of rows) {
  const t = fs.readFileSync(f, 'utf8');
  const rec: Record<string, unknown> = { group, file: f, in: undefined };
  const t8 = Date.now();
  const r8 = phalanxA8Encode(t, 'o200k_base');
  rec.a8 = r8.outTokens; rec.a8_mode = r8.mode; rec.a8_ms = Date.now() - t8;
  rec.a8_exact = phalanxA8Decode(r8.wire) === t; if (!rec.a8_exact) fail++;
  if (mode === 'both') {
    const t7 = Date.now();
    const r7 = phalanxA7Encode(t, 'o200k_base');
    rec.a7 = r7.outTokens; rec.a7_ms = Date.now() - t7;
    rec.a7_exact = phalanxA7Decode(r7.wire) === t; if (!rec.a7_exact) fail++;
  }
  fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
}
console.log('done', rows.length, 'files; exact failures', fail);
