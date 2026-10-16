/**
 * X20: TYPOS end-to-end measurement.
 * For each lane: identity tokens, LAKONIKOS-D M, TYPOS M, exactness of the TYPOS round trip
 * through the library reader (chironDecode + typosExpand), and the shape sentence.
 * usage: bench/x20/run.sh bench/x20/typos-bench.ts <lanes-file>
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { typosEncode, typosDecode } from '@/lib/omega/typos';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean);
let baseSum = 0, typSum = 0, rawSum = 0, wins = 0, losses = 0, ties = 0, inexact = 0, used = 0;
for (const f of lanes) {
  let text: string;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const raw = countTokens(text, enc);
  const r = typosEncode(text, enc);
  const dec = typosDecode(r.wire, r.shapes, r.rule, r.marks, r.chained);
  const exact = dec === text;
  if (!exact) inexact++;
  const b = r.baseTokens[enc], m = r.messageTokens[enc];
  baseSum += b; typSum += m; rawSum += raw;
  if (r.transformed) used++;
  if (m < b) wins++; else if (m > b) losses++; else ties++;
  console.log(JSON.stringify({
    lane: f, raw, base: b, typos: m, delta: m - b, exact, transformed: r.transformed,
    occurrences: r.occurrences, contractTokens: r.contractTokens, rule: r.rule, shapes: r.shapes, marks: r.marks,
  }));
}
console.log(JSON.stringify({
  TOTAL: true, lanes: lanes.length, rawSum, baseSum, typosSum: typSum,
  delta: typSum - baseSum, pct: Math.round((1 - typSum / baseSum) * 10000) / 100,
  wins, losses, ties, inexact, transformedLanes: used,
}));
