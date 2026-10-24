/**
 * X40 step 2 — ABLATION: what does each field of an ops line actually cost the
 * frontier? Replace one field class by a constant, re-encode with the real
 * parent, and read the message delta. This is the marginal cost of carrying that
 * field, under the frontier's own accounting — no proxy, no estimate.
 */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
const enc: any = 'o200k_base';
const TS = /[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?/g;
const NUM = /(?<![0-9A-Za-z_.])[0-9][0-9.]*/g;
const PATH = /[A-Za-z0-9_@.\/-]{4,}\/[A-Za-z0-9_@.\/-]+/g;
const p = process.argv[2];
const text = fs.readFileSync(p, 'utf8');
const base: any = ouraEncode(text, enc);
console.log('lane', p.split('/').pop(), 'rawM', base.messageTokens);
const variants: [string, string][] = [
  ['TS->X', text.replace(TS, 'X')],
  ['NUM->N', text.replace(NUM, 'N')],
  ['PATH->P', text.replace(PATH, 'P')],
];
for (const [name, t] of variants) {
  if (t === text) { console.log(name, 'no-op'); continue; }
  const r: any = ouraEncode(t, enc);
  console.log(name.padEnd(8), 'M=' + String(r.messageTokens).padStart(5),
    'saved=' + String(base.messageTokens - r.messageTokens).padStart(5));
}
