// z56: INDUCTION-COPY probe (gross). A word w_i is marked when w_i equals the word that followed the
// most recent earlier occurrence of w_{i-1}. Words = maximal non-whitespace runs; whitespace is kept.
// Measures DAEDALUS one-chat M of the substituted text vs the original (no contract, no decoder).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const MARK = '⟲';
export function inductSub(text: string): { out: string; hits: number } {
  // tokenise: alternating runs
  const parts = text.match(/\s+|\S+/g) ?? [];
  const wordIdx: number[] = []; // indices in parts of words
  for (let i = 0; i < parts.length; i++) if (!/^\s/.test(parts[i])) wordIdx.push(i);
  const words = wordIdx.map(i => parts[i]);
  const occ = new Map<string, number[]>(); // word -> indices (in words) of its occurrences, ascending
  let hits = 0;
  for (let w = 0; w < words.length; w++) {
    if (w >= 2) {
      const list = occ.get(words[w - 1]) ?? [];
      // most recent occurrence of the previous word strictly before w-1
      let j = -1;
      for (let q = list.length - 1; q >= 0; q--) if (list[q] < w - 1) { j = list[q]; break; }
      if (j >= 0 && words[j + 1] === words[w]) { parts[wordIdx[w]] = MARK; hits++; }
    }
    const l = occ.get(words[w]) ?? []; l.push(w); occ.set(words[w], l);
  }
  return { out: parts.join(''), hits };
}
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const s = inductSub(t);
  const m0 = daedalusEncode(t, 'o200k_base').messageTokens;
  const m1 = daedalusEncode(s.out, 'o200k_base').messageTokens;
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: t.length, hits: s.hits, plain: m0, substituted: m1, gross: m1 - m0 }));
}
