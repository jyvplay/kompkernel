// Z31 VX-policy measurement on the fresh real-doc corpus (npm READMEs/CHANGELOGs, not used by any earlier receipt).
// Variants on the same text: W=3 (single window), W=2, W=4, and the current 3-way minimum (veritasABest).
// Every wire is decoded and compared byte-for-byte. Output: one JSON line per file.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasAEncode, veritasABest, veritasADecode, VXA_LEGEND_V2 } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const [listFile, outFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const rec: Record<string, unknown> = { file: f, inT: countTokens(t, enc) };
  const run = (name: string, fn: () => { wire: string; outTokens: number }) => {
    const t0 = performance.now();
    const r = fn();
    const ms = performance.now() - t0;
    rec[name + '_T'] = r.outTokens;
    rec[name + '_ms'] = Math.round(ms);
    rec[name + '_ok'] = veritasADecode(r.wire) === t;
  };
  run('best', () => veritasABest(t, enc, VXA_LEGEND_V2));
  run('w2', () => veritasAEncode(t, enc, 2, VXA_LEGEND_V2));
  run('w3', () => veritasAEncode(t, enc, 3, VXA_LEGEND_V2));
  run('w4', () => veritasAEncode(t, enc, 4, VXA_LEGEND_V2));
  fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
}
console.log('done', files.length);
