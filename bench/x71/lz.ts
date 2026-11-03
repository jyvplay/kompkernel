/**
 * Oracle probe: how much is actually in the document as long verbatim repeats?
 * Greedy LZ77 over characters (hash on 24-char windows), then measure the token
 * cost of a plausible in-band reference syntax. Not a codec; a ceiling.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);

function lzParse(s: string, minLen = 24, winBits = 15) {
  const H = new Map<string, number[]>();
  const out: Array<{ lit?: string; off?: number; len?: number }> = [];
  let i = 0, litStart = 0;
  const W = 1 << winBits;
  while (i + minLen <= s.length) {
    const key = s.slice(i, i + 12);
    const cands = H.get(key);
    let bestLen = 0, bestOff = 0;
    if (cands) {
      for (let c = cands.length - 1; c >= Math.max(0, cands.length - 12); c--) {
        const j = cands[c];
        if (i - j > W) continue;
        let k = 0;
        while (i + k < s.length && s[j + k] === s[i + k] && k < 4096) k++;
        if (k > bestLen) { bestLen = k; bestOff = i - j; }
      }
    }
    if (bestLen >= minLen) {
      if (i > litStart) out.push({ lit: s.slice(litStart, i) });
      out.push({ off: bestOff, len: bestLen });
      for (let k = 0; k < bestLen; k++) {
        const p = i + k;
        if (p + 12 <= s.length) {
          const kk = s.slice(p, p + 12);
          const arr = H.get(kk); if (arr) { arr.push(p); if (arr.length > 64) arr.shift(); } else H.set(kk, [p]);
        }
      }
      i += bestLen; litStart = i;
    } else {
      const arr = H.get(key); if (arr) { arr.push(i); if (arr.length > 64) arr.shift(); } else H.set(key, [i]);
      i++;
    }
  }
  if (litStart < s.length) out.push({ lit: s.slice(litStart) });
  return out;
}

const SYN = (o: number, l: number) => `⟨${o},${l}⟩`;
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  for (const minLen of [24, 40, 64]) {
    const ops = lzParse(text, minLen);
    let msg = '';
    let refs = 0, litChars = 0, refChars = 0;
    for (const o of ops) {
      if (o.lit !== undefined) { msg += o.lit; litChars += o.lit.length; }
      else { msg += SYN(o.off!, o.len!); refs++; refChars += o.len!; }
    }
    const mt = T(msg);
    console.error(`${p} raw ${raw} | minLen ${minLen}: refs ${refs} refChars ${refChars} lit ${litChars} | synthetic ${mt} (-${raw - mt}, ${((1 - mt / raw) * 100).toFixed(1)}%)`);
  }
}
