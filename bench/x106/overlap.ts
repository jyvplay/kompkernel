/**
 * X106 — MEASURE THE OVERLAP DEFECT IN ΧΕΙΡΩΝ'S CANDIDATE SCORE.
 *
 * arXiv:2610.32298 (Chen, 23 Oct 2026), structural property of an optimal SLP:
 * "in an optimal grammar one can choose an occurrence of the expansion of each
 * auxiliary nonterminal such that these intervals are pairwise disjoint. Hence
 * the dictionary can be read off from a partition of the input."
 *
 * ΧΕΙΡΩΝ's macro loop scores a candidate span p with `c*(t-1)-t-1`, where c comes
 * from enumerateTokenSpans (chiron.ts:1073). That loop is
 *
 *     for (let at = 0; at + len <= n; at++)
 *
 * i.e. the window slides ONE token at a time, so c counts OVERLAPPING occurrences.
 * The application is `body.split(p).join(gl)` (and the same for every literal
 * rule), and JS String.prototype.split does not reuse consumed characters, so only
 * NON-OVERLAPPING occurrences are ever replaced. The score therefore charges
 * itself savings it cannot collect, by exactly
 *
 *     (c - c_disj) * (t - 1)
 *
 * per candidate.  This probe measures how big that gap is on the real corpus, at
 * the epoch where ΧΕΙΡΩΝ actually makes its choice, and whether the RANKING of the
 * candidates changes when the disjoint count is used.  It makes no change to the
 * encoder; it is the measurement that decides whether the change is worth making.
 */
import * as fs from 'node:fs';
import { tokenStrings, countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { enumerateTokenSpans } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
const enc: EncodingName = 'o200k_base' as any;
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const LMAX = 8; // ΧΕΙΡΩΝ's LMAX_TOKENS; read back from the module if it changes

/** Maximum number of non-overlapping character-level occurrences of p in s. */
function disj(s: string, p: string): number {
  let n = 0, i = 0;
  for (;;) {
    const j = s.indexOf(p, i);
    if (j < 0) return n;
    n++; i = j + p.length;
  }
}

interface Row { lane: string; cands: number; overl: number; sumGap: number; maxGap: number; rankFlip: number; topChanged: boolean; parts: number; }
const rows: Row[] = [];
for (const path of lanes) {
  const text = fs.readFileSync(path, 'utf8');
  // ΧΕΙΡΩΝ enumerates over [body, ...literal rule texts].  At epoch 0 there are
  // no rules yet, so the parts are just the body; later epochs have more.  To
  // measure the defect where it bites we replay the enumeration over the parts
  // ΧΕΙΡΩΝ would have at its FIRST macro epoch: the block-passed body.
  const parts = [text];
  const counts = enumerateTokenSpans(parts, enc);
  let cands = 0, overl = 0, sumGap = 0, maxGap = 0, rankFlip = 0;
  const scoredRaw: Array<{ p: string; rough: number; disj: number }> = [];
  const scoredDisj: Array<{ p: string; rough: number }> = [];
  for (const [p, c] of counts) {
    if (c < 2 || p.length < 2) continue;
    const t = countTokens(p, enc);
    if (t < 1) continue;
    cands++;
    const cd = disj(text, p);
    const gap = (c - cd) * (t - 1);
    if (gap > 0) { overl++; sumGap += gap; if (gap > maxGap) maxGap = gap; }
    scoredRaw.push({ p, rough: c * (t - 1) - t - 1, disj: cd });
    scoredDisj.push({ p, rough: cd * (t - 1) - t - 1 });
  }
  scoredRaw.sort((a, b) => b.rough - a.rough);
  scoredDisj.sort((a, b) => b.rough - a.rough);
  const topRaw = scoredRaw[0]?.p ?? '', topDisj = scoredDisj[0]?.p ?? '';
  const posRaw = new Map(scoredRaw.map((x, i) => [x.p, i]));
  for (let i = 0; i < scoredDisj.length; i++) {
    const j = posRaw.get(scoredDisj[i]!.p)!;
    if (Math.abs(i - j) > 0) rankFlip++;
  }
  rows.push({ lane: path.split('/').pop()!, cands, overl, sumGap, maxGap, rankFlip, topChanged: topRaw !== topDisj, parts: parts.length });
  console.log(`${path.split('/').pop()!.padEnd(22)} cands ${String(cands).padStart(6)}  withOverlap ${String(overl).padStart(6)} (${(100 * overl / Math.max(1, cands)).toFixed(1)}%)  Σgap ${String(sumGap).padStart(7)}  maxGap ${String(maxGap).padStart(4)}  rankMoves ${String(rankFlip).padStart(6)}  topChanged=${topRaw !== topDisj}`);
}
const T = rows;
console.log(`\nTOTAL candidates ${T.reduce((a, b) => a + b.cands, 0)}  withOverlap ${T.reduce((a, b) => a + b.overl, 0)} (${(100 * T.reduce((a, b) => a + b.overl, 0) / T.reduce((a, b) => a + b.cands, 0)).toFixed(1)}%)  Σgap ${T.reduce((a, b) => a + b.sumGap, 0)}  maxGap ${Math.max(...T.map((r) => r.maxGap))}  lanes with topChanged ${T.filter((r) => r.topChanged).length}/${T.length}`);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/overlap-x106.json', JSON.stringify({ note: "X106 overlap defect in chiron candidate score, epoch-0 enumeration over the raw body", rows }, null, 1) + '\n');
console.log('\nwrote bench/x104/receipts/overlap-x106.json');
