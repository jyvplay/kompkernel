// Z48 probe: what does DAEDALUS's message cost become when a constant line prefix/field is removed?
// Usage: bench/tmp/run.sh bench/z48/probe-elide.ts <file> <json-array of [regex, replacement]>
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const f = process.argv[2];
const subs: Array<[string, string]> = JSON.parse(process.argv[3] || '[]');
const text = fs.readFileSync(f, 'utf8');
let reduced = text, changed = 0;
for (const [re, rep] of subs) {
  const r = new RegExp(re, 'gm');
  reduced = reduced.replace(r, (...m) => { changed++; return rep; });
}
const t0 = Date.now();
const d0 = daedalusEncode(text, enc);
const t1 = Date.now();
const d1 = daedalusEncode(reduced, enc);
console.log(`${f.split('/').pop()} raw=${countTokens(text, enc)} M=${d0.messageTokens} (${t1 - t0}ms) | reduced raw=${countTokens(reduced, enc)} M=${d1.messageTokens} (${Date.now() - t1}ms) | changed=${changed} | gross saving=${d0.messageTokens - d1.messageTokens}`);
console.log('D notes:', d0.notes.slice(0, 200));
if (process.env.SHOW) console.log(d1.wire.slice(0, 600));
