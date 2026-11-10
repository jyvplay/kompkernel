/**
 * X97 — ECONOMICS OF THE BIGRAM TRANSLITERATION (ΑΝΤΙΣΤΟΙΧΊΑ).
 *
 * The lever: 1 659 body bigram occurrences across the ten wires are NOT single vocabulary tokens
 * (bench/x97/receipts/bigram.json) and there are 8 789 two-character vocabulary tokens made of two
 * non-ASCII characters to receive them.  A rule cannot capture them profitably (ADD pays 1 key +
 * 2 value tokens per bigram and needs >= 4 occurrences), but a SHARED map in the contract can:
 * every entry serves all its occurrences, so the per-occurrence cost collapses.
 *
 * This measures the two numbers that decide it:
 *   F(K) = total occurrences saved by the K most frequent missing bigrams
 *   C(K) = tokens the map costs in the contract, at several spellings per entry
 * and reports net(K) = F(K) - C(K) at the best K, per wire and pooled.  It is an UPPER BOUND on
 * the codec: it assumes the map is transmitted for free at the contract's price and that the
 * reader applies it exactly.  Nothing here is an admission.
 */
import * as fs from 'node:fs';
import { countTokens, decodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const twoChar = new Set<string>();
for (let id = 0; id < 200007; id++) {
  let s: string; try { s = decodeIds([id], enc); } catch { continue; }
  const c = [...s];
  if (c.length === 2 && c.every(x => x.codePointAt(0)! >= 0x20 && x.codePointAt(0)! < 0x7F)) twoChar.add(s);
}
/** every maximal printable-ASCII run of the body, plus the tape's values */
function asciiRuns(msg: string): string[] {
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const src = [msg.slice(0, w), msg.slice(w + 1, t), msg.slice(t + 1)].join('\n');
  const out: string[] = [];
  let cur = '';
  for (const ch of src) {
    if (ch >= ' ' && ch <= '~') cur += ch; else { if (cur) out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}
const price = (s: string): number => countTokens(s, enc);
const rows: any[] = [];
let poolF = 0, poolBestNet = -1e9, poolK = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires')) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const freq = new Map<string, number>();
  for (const run of asciiRuns(msg)) {
    // the tokenizer's own greedy segmentation of the run: a missing bigram is one the tokenizer
    // must split, so count non-overlapping windows the tokenizer would NOT cover with one token
    for (let i = 0; i + 1 < run.length; i++) {
      const b = run[i] + run[i + 1];
      if (!twoChar.has(b)) freq.set(b, (freq.get(b) ?? 0) + 1);
    }
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  // cumulative gain
  let best = { K: 0, F: 0, net: 0 };
  for (let K = 1; K <= sorted.length; K++) {
    const F = sorted.slice(0, K).reduce((a, e) => a + e[1], 0);
    for (const c of [2, 3, 4]) {
      const net = F - c * K;
      if (net > best.net) best = { K, F, net: net, c };
    }
  }
  const { net, K, F } = best as any;
  poolF += sorted.reduce((a, e) => a + e[1], 0);
  rows.push({ lane: f, distinct: sorted.length, totalMissing: sorted.reduce((a, e) => a + e[1], 0),
              bestK: K, F, net, top: sorted.slice(0, 5).map(e => `${e[0]}x${e[1]}`).join(' ') });
  if (net > poolBestNet) { poolBestNet = net; poolK = K; }
}
console.log(`${'lane'.padEnd(20)} ${'distinct'.padStart(8)} ${'missing'.padStart(8)} ${'bestK'.padStart(6)} ${'F(K)'.padStart(6)} ${'net'.padStart(6)}  top`);
for (const r of rows) console.log(`${r.lane.padEnd(20)} ${String(r.distinct).padStart(8)} ${String(r.totalMissing).padStart(8)} ${String(r.bestK).padStart(6)} ${String(r.F).padStart(6)} ${String(r.net).padStart(6)}  ${r.top}`);
const poolNet = rows.reduce((a, r) => a + Math.max(0, r.net), 0);
console.log(`\npooled positive net (map cost 2-4 tok/entry, per-wire optimum) = ${poolNet} tokens over the ten wires`);
console.log(`pooled missing occurrences = ${poolF}`);
console.log(`\nMAP-COST SENSITIVITY, pooled best-K net by per-entry cost:`);
for (const c of [1, 2, 3, 4, 5]) {
  let n = 0;
  for (const r of rows) {
    // recompute at fixed c
    let b = 0;
    for (let K = 1; K <= r.distinct; K++) { const F = r.F; b = Math.max(b, F - c * K); }
    n += Math.max(0, b);
  }
  console.log(`  c=${c} tok/entry -> pooled net ${n}`);
}
fs.writeFileSync('bench/x97/receipts/antistoichia.json', JSON.stringify({ rows, poolF, poolNet }, null, 1));
