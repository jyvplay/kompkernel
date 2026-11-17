/**
 * X133 — GLYPH RUN CENSUS.
 *
 * X129 fused ADJACENT PAIRS of glyphs and reported the idea dead because "the
 * adjacent pairs already merge token-wise". That is a statement about PAIRS.
 * It says nothing about a RUN of three or more: BPE fuses pairs bottom-up, so a
 * five-glyph run like `енихя` costs ceil-ish(k/2) tokens, not 1. If the run
 * recurs c times, collapsing it into one rule is worth
 *
 *      gain = c*(k-1) - (1 + k)        k = tokens the run costs today
 *
 * which is positive for k=3,c>=3 or k=2,c>=5. That is a different move from
 * Re-Pair's pairwise fusion, and it is not covered by it.
 *
 * This census reports, per lane, every recurring maximal glyph run: how long it
 * is, how often it occurs, what it costs today, and what the move would be worth.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { glyphSetFor, parseTape, buildTape, expandContent } from '../../src/lib/omega/euros';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';

let TOTAL = 0;
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const M = a.message as string;
  const G = glyphSetFor(text, M);
  const i1 = M.indexOf('§'); const i2 = M.indexOf('¶', i1);
  if (i1 < 0 || i2 < 0) { console.log(`${p.split('/').pop()!.padEnd(20)} no tape`); continue; }
  const body = M.slice(i2);
  const rules = parseTape(M.slice(i1, i2), G);
  if (!rules.length) { console.log(`${p.split('/').pop()!.padEnd(20)} no rules`); continue; }

  // maximal runs of consecutive glyph characters in the BODY
  const runs: { s: string; at: number }[] = [];
  let i = 0;
  while (i < body.length) {
    if (G.has(body[i]!)) {
      let j = i;
      while (j < body.length && G.has(body[j]!)) j++;
      if (j - i >= 2) runs.push({ s: body.slice(i, j), at: i });
      i = j;
    } else i++;
  }
  const groups = new Map<string, number>();
  for (const r of runs) groups.set(r.s, (groups.get(r.s) ?? 0) + 1);

  // token cost of each run, measured inside the real body
  const rows: { s: string; c: number; k: number; gain: number }[] = [];
  for (const [s, c] of groups) {
    const k = countTokens(s, enc);
    if (k < 2) continue;                       // already collapses to one token
    const gain = c * (k - 1) - (1 + k);
    rows.push({ s, c, k, gain });
  }
  rows.sort((x, y) => y.gain - x.gain);
  const win = rows.filter(r => r.gain > 0);
  const sum = win.reduce((s, r) => s + r.gain, 0);
  TOTAL += sum;
  console.log(`${p.split('/').pop()!.padEnd(20)} body=${countTokens(body, enc)} glyphRuns=${runs.length} distinct=${groups.size} | recurring k>=2: ${rows.length}, profitable: ${win.length}, worth ${sum} tok`);
  for (const r of rows.slice(0, 6)) {
    const toks = encode(r.s).map(x => decode([x]));
    console.log(`     c=${r.c} k=${r.k} gain=${String(r.gain).padStart(3)}  ${JSON.stringify(r.s.slice(0, 30))} -> [${toks.map(t => JSON.stringify(t)).join(' ')}]`);
  }
}
console.log(`\nRUN-MERGE upper bound across these lanes: ${TOTAL} tokens`);
