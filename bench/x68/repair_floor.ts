import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const GLYPHS = 'ɑβϲδɛϝɡɦɨʝƙɫɱɲɔρʠɾʂʈʊʌʍҳʎʐæøœßðþđłħıŧŋĸƀƃƈƌƒ';
export function repairFloor(t: string, minCount = 3, maxIters = 600) {
  const toks = tokenStrings(t, enc).map(x => x.s);
  const idOf = new Map<string, number>();
  const surf: string[] = [];
  const intern = (s: string) => { let v = idOf.get(s); if (v === undefined) { v = surf.length; idOf.set(s, v); surf.push(s); } return v; };
  let seq = toks.map(intern);
  let rules = 0;
  for (let iter = 0; iter < maxIters; iter++) {
    const cnt = new Map<number, number>();
    const M = 4_000_000;
    for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] * M + seq[i + 1]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    let bestK = -1, bestC = 0;
    for (const [k, c] of cnt) if (c > bestC) { bestC = c; bestK = k; }
    if (bestK < 0 || bestC < minCount) break;
    const a = Math.floor(bestK / M), b = bestK % M;
    const g = 'ǀ' + GLYPHS[rules % GLYPHS.length];
    const nid = intern(g); rules++;
    const out: number[] = [];
    for (let i = 0; i < seq.length; i++) {
      if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { out.push(nid); i++; } else out.push(seq[i]);
    }
    seq = out;
  }
  const wire = seq.map(i => surf[i]).join('');
  return { symbols: seq.length, wireTokens: countTokens(wire, enc), rules, chars: wire.length, glyphCount: GLYPHS.length };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const r = repairFloor(t);
  const r2 = repairFloor(t, 2);
  console.log(JSON.stringify({ f, raw, min3: r.wireTokens, rules3: r.rules, min2: r2.wireTokens, rules2: r2.rules, gainPct3: +(((raw - r.wireTokens) / raw) * 100).toFixed(1) }));
}
