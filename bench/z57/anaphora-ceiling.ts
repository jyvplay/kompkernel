// X12: header-cost ceiling for ANAPHORA. For each line, the best fold (same k/n/m rule as the encoder),
// saving = tokens(literal line) - H, floored at 0. Raw text, no DAEDALUS: an UPPER bound on what a
// header of H tokens could save. Also reports the cost of the current header format.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const T = (s: string) => countTokens(s, 'o200k_base');
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const fields = lines.map(l => l.split(' '));
  const total = T(text);
  const res: Record<string, number> = {};
  const Hs = [2, 3, 7];
  for (const H of Hs) res['H' + H] = 0;
  let foldLines = 0, sumCover = 0;
  for (let i = 0; i < lines.length; i++) {
    const F = fields[i];
    let bestCover = -1, bestMid = '';
    for (let k = 1; k <= Math.min(16, i); k++) {
      const R = fields[i - k];
      let n = 0; while (n < F.length && n < R.length && F[n] === R[n]) n++;
      let m = 0; while (m < F.length - n && m < R.length && F[F.length - 1 - m] === R[R.length - 1 - m]) m++;
      if (n + m === 0) continue;
      const cover = F.slice(0, n).join(' ').length + F.slice(F.length - m).join(' ').length;
      if (cover > bestCover) { bestCover = cover; bestMid = F.slice(n, F.length - m).join(' '); }
    }
    if (bestCover < 0) continue;
    foldLines++;
    sumCover += bestCover;
    const litT = T(lines[i]);
    const midT = T(bestMid);
    for (const H of Hs) res['H' + H] += Math.max(0, litT - midT - H);
  }
  const fmtCost = T('@1,3,0|');
  console.log(JSON.stringify({ lane: f.split('/').pop(), totalRawTokens: total, linesWithAnyFold: foldLines, of: lines.length, headerCostCurrentFormat: fmtCost, ceilingSaveH2: res.H2, ceilingSaveH3: res.H3, ceilingSaveH7: res.H7, ceilingPctH2: +(100 * res.H2 / total).toFixed(1), ceilingPctH3: +(100 * res.H3 / total).toFixed(1) }));
}
