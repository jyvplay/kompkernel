/**
 * X27 probe 11: how much repetition survives the grammar?
 *
 * Every prior probe asked whether some SEARCH could do better. None asked
 * whether there is anything left to find. If the post-grammar body still
 * contains repeated spans, the parent stopped early and the headroom is real
 * and measurable; if it does not, the wire really is exhausted and the only
 * honest places left are the tape and the contract.
 *
 * Counts repeated token n-grams in the body (the wire after the grammar), priced
 * with the real o200k count rather than a model.
 */
import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

for (const f of (process.env.F || '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = symplokeEncode(text, enc);
  if (!r.wire.startsWith(CHIRON_START)) { console.log(f.split('/').pop(), 'no tape'); continue; }
  const cut = r.wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const body = r.wire.slice(cut + CHIRON_SEP.length);
  const toks = tokenStrings(body, enc).map((x: any) => x.s ?? x);
  console.log(`\n=== ${f.split('/').pop()} === body tokens ${toks.length}`);
  let total = 0;
  for (const n of [2, 3, 4, 5, 6]) {
    const seen = new Map<string, number[]>();
    for (let i = 0; i + n <= toks.length; i++) {
      const k = toks.slice(i, i + n).join('');
      (seen.get(k) ?? seen.set(k, []).get(k)!).push(i);
    }
    let groups = 0, spare = 0, bestGain = 0, bestPhrase = '';
    for (const [k, idx] of seen) {
      if (idx.length < 2) continue;
      // non-overlapping occurrences only
      let cnt = 0, last = -1e9;
      const parts = k.split('');
      for (const i of idx) { if (i >= last + n) { cnt++; last = i; } }
      if (cnt < 2) continue;
      const phrase = parts.join('');
      const gain = cnt * (T(phrase) - 0.3) - (T(phrase) + 1.3);
      groups++; spare += cnt - 1;
      if (gain > bestGain) { bestGain = gain; bestPhrase = phrase; }
    }
    console.log(`  n=${n}: repeated groups ${String(groups).padStart(4)}  redundant occurrences ${String(spare).padStart(5)}  best single gain ${bestGain.toFixed(1).padStart(7)}  ${JSON.stringify(bestPhrase.slice(0, 34))}`);
    total += spare;
  }
  console.log(`  TOTAL redundant occurrences across all n: ${total}`);
}
