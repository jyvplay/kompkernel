/**
 * X95 — THE RUN-LENGTH COST CURVE, AND THE VOCABULARY'S CAPACITY TO SERVE IT.
 *
 * WHAT IS ALREADY KNOWN, EXACTLY. The ten committed wires carry 1 414 maximal glyph runs in
 * their bodies, costing 2 171 tokens in isolation (1.535 per run) against a tape whose 600
 * glyphs cost 502 (0.84 each). boundary-census.ts showed the cost of a run is essentially
 * independent of what precedes it (boundary total -38 over 1 414 runs; LETTER, DIGIT and
 * NEWLINE all exactly 0.000), and space-bridge-headroom.ts showed the one context that does
 * help -- a single space in front -- is already captured on all 36 runs where it occurs.
 *
 * THE OPEN QUESTION. A run's cost is therefore ct(run) with no contextual help, so the only
 * remaining lever is the run's INTERIOR: whether the glyph sequence the assignment produced
 * spells a single vocabulary token. ariadne.ts already constructs such spellings ("Cyrillic has
 * 1896 three-character, 1329 four-character and 1283 five-or-more-character single tokens, so a
 * five-reference run placed on one of them saves four tokens at a stroke"), and METATHESIS's
 * relabelling search is recorded as saturated at -14 tokens. Saturation of a search, however, is
 * a statement about the objective and the budget, not about the capacity of the vocabulary to
 * serve the runs the body actually contains.
 *
 * THIS MEASURES BOTH SIDES. Left: for every run in every wire, its length and its exact token
 * cost, so the incumbent cost curve is measured rather than assumed. Right: for every length,
 * how many vocabulary tokens are exactly that many non-ASCII characters, and how many of those
 * have all-distinct characters -- the latter is the pool a run can legally be spelled from,
 * because a run is a sequence of DISTINCT glyphs (each glyph names a distinct rule, and a glyph
 * appearing twice in one run would name the same rule twice, which is a different object).
 *
 * The headroom is the gap between the incumbent curve and 1 token per run, and the capacity
 * columns say whether the gap is closable at all.
 *
 * ZERO frontier calls, zero encodes.
 */
import { countTokensExact, decodeIds, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);

// ---- right-hand side: vocabulary capacity by run length ----
const LIMIT = Number(process.env.X95_LIMIT ?? 200100);
const byLen = new Map<number, { tokens: number; distinct: number; examples: string[] }>();
for (let id = 0; id < LIMIT; id++) {
  let s: string;
  try { s = decodeIds([id], ENC); } catch { continue; }
  const chars = [...s];
  if (chars.length < 2 || chars.length > 12) continue;
  if (!chars.every(c => c.codePointAt(0)! > 127)) continue;
  const L = chars.length;
  let e = byLen.get(L);
  if (!e) { e = { tokens: 0, distinct: 0, examples: [] }; byLen.set(L, e); }
  e.tokens++;
  if (new Set(chars).size === L) { e.distinct++; if (e.examples.length < 6) e.examples.push(s); }
}

// ---- left-hand side: the incumbent cost curve on the shipped wires ----
const files = process.argv.slice(2);
const curve = new Map<number, { runs: number; cost: number }>();
let totRuns = 0, totCost = 0;
const receipt: any = { note: 'run-length cost curve vs vocabulary capacity; zero frontier calls', lanes: [] };
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const G = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 127) G.add(ch);
  let i = 0, laneRuns = 0, laneCost = 0;
  while (i < body.length) {
    if (G.has(body[i])) {
      let j = i; while (j < body.length && G.has(body[j])) j++;
      const run = body.slice(i, j), L = j - i, c = ct(run);
      const e = curve.get(L) ?? { runs: 0, cost: 0 };
      e.runs++; e.cost += c; curve.set(L, e);
      laneRuns++; laneCost += c;
      i = j;
    } else i++;
  }
  receipt.lanes.push({ lane: name, runs: laneRuns, runTokens: laneCost });
  totRuns += laneRuns; totCost += laneCost;
}
const L: string[] = [];
L.push(`VOCABULARY CAPACITY (tokens of exactly L non-ASCII chars, and how many have all-distinct chars):`);
L.push('  L   tokens   distinct-char  examples');
for (const [l, e] of [...byLen.entries()].sort((a, b) => a[0] - b[0])) {
  L.push('  ' + String(l).padStart(2) + String(e.tokens).padStart(9) + String(e.distinct).padStart(15) + '  ' + e.examples.slice(0, 3).join(' '));
}
L.push('');
L.push(`INCUMBENT COST CURVE over the ten committed wires (${totRuns} runs, ${totCost} tokens):`);
L.push('  L   runs   tokens   tok/run   IF ALL 1 TOKEN   SAVING   vocab distinct-capacity at this L');
let allOne = 0;
for (const [l, e] of [...curve.entries()].sort((a, b) => a[0] - b[0])) {
  const cap = byLen.get(l)?.distinct ?? 0;
  allOne += e.runs;
  L.push('  ' + String(l).padStart(2) + String(e.runs).padStart(6) + String(e.cost).padStart(8) +
    (e.cost / e.runs).toFixed(3).padStart(10) + String(e.runs).padStart(16) + String(e.cost - e.runs).padStart(9) +
    String(cap).padStart(14) + (cap > 0 && e.runs > cap ? '  <-- CAPACITY BINDS' : ''));
}
L.push('  ' + 'TOT'.padStart(2) + String(totRuns).padStart(6) + String(totCost).padStart(8) + (totCost / totRuns).toFixed(3).padStart(10) +
  String(allOne).padStart(16) + String(totCost - totRuns).padStart(9));
L.push('');
L.push(`reading: the SAVING column is what the body's reference structure would gain if every run`);
L.push(`of length L cost one token instead of ${(totCost / totRuns).toFixed(3)} on average -- an UPPER bound,`);
L.push(`because the glyph sequence of a run is fixed by the rule assignment and cannot be chosen`);
L.push(`freely per run. The capacity column says whether enough distinct-character tokens exist`);
L.push(`at each length for an assignment to aim at, and "CAPACITY BINDS" marks a length where the`);
L.push(`body contains more runs than the vocabulary has distinct-char tokens to serve them.`);
receipt.curve = [...curve.entries()].sort((a, b) => a[0] - b[0]).map(([l, e]) => ({ length: l, ...e }));
receipt.capacity = [...byLen.entries()].sort((a, b) => a[0] - b[0]).map(([l, e]) => ({ length: l, ...e }));
receipt.totals = { runs: totRuns, tokens: totCost, upperBoundSaving: totCost - totRuns };
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/run-curve.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/run-curve.log', log);
console.log(log);
