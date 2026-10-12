// Z31 fresh real-doc lane: identity vs PHALANX-A5 vs PHALANX-A7 (o200k) on README/CHANGELOG/*.md from 66 npm packages
// fetched this turn with `npm pack` (not used by any earlier codec receipt). Every wire is decoded and compared byte-for-byte.
// Usage: node real-docs.cjs <listfile> <outjsonl>
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA5Encode, phalanxA5Decode } from '@/lib/omega/phalanx-a5';
import { phalanxA7Encode, phalanxA7Decode } from '@/lib/omega/phalanx-a7';
const enc = 'o200k_base' as const;
const [listFile, outFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const inT = countTokens(t, enc);
  const a5 = phalanxA5Encode(t, enc);
  const a5ok = phalanxA5Decode(a5.wire) === t;
  const a7 = phalanxA7Encode(t, enc);
  const a7ok = phalanxA7Decode(a7.wire) === t;
  const rec = { file: f, bytes: Buffer.byteLength(t), inT, a5T: a5.outTokens, a5layer: a5.layer, a5ok, a7T: a7.outTokens, a7layer: a7.layer, a7ok, ms: Date.now() - t0,
    fences: (t.match(/^```/gm) ?? []).length, tableRows: (t.match(/^\s*\|.*\|\s*$/gm) ?? []).length, longLines: t.split('\n').filter((l) => l.length > 60 && l.length < 100).length };
  fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
}
console.log('done', files.length);
