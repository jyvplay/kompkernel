/**
 * X95 — THE BOUNDARY CENSUS: what does the character in front of a reference run actually cost?
 *
 * space-bridge-headroom.ts found that only 36 of 1 414 runs in the ten committed wires are
 * preceded by a space, and that all 36 of those already merge -- so the space bridge is fully
 * captured and worth nothing more. The number that mattered was the other one: 1 378 runs sit
 * behind some OTHER character. Every one of those is a boundary the tokenizer may or may not
 * merge, and X94 measured the aggregate effect as ~1-2 tokens of severance per inserted
 * reference without ever saying which boundaries pay it.
 *
 * This probe attributes the boundary cost. For every maximal glyph run in every wire it measures
 * the marginal cost of the run GIVEN its left context, ct(prev + run) - ct(prev), against the
 * cost of the run in isolation, ct(run), and buckets the difference by the class of the preceding
 * character. A positive difference is what the boundary costs; a negative one is a merge the
 * assignment already wins.
 *
 * It then asks the only question that could produce an arm: for each boundary class, does the
 * VOCABULARY contain bridge tokens that would make the merge possible at all? A class with a large
 * boundary cost and zero bridges is closed by the tokenizer. A class with a large boundary cost and
 * many bridges is open, and the gap is what a bridge-seeking glyph assignment could recover.
 *
 * ZERO frontier calls, zero encodes.
 */
import { countTokensExact, decodeIds, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);

function cls(c: string): string {
  if (c === '') return 'START';
  if (c === ' ') return 'SPACE';
  if (c === '\n') return 'NEWLINE';
  if (c === '\t') return 'TAB';
  if (/[0-9]/.test(c)) return 'DIGIT';
  if (/[A-Za-z]/.test(c)) return 'LETTER';
  if (c.codePointAt(0)! > 127) return 'GLYPH';
  return 'PUNCT';
}

// ---- part 1: which ASCII classes have bridge tokens at all? ----
const LIMIT = Number(process.env.X95_LIMIT ?? 200100);
const bridgeByClass = new Map<string, number>();
const bridgeGlyphsByClass = new Map<string, Set<string>>();
for (let id = 0; id < LIMIT; id++) {
  let s: string;
  try { s = decodeIds([id], ENC); } catch { continue; }
  const chars = [...s];
  let hasA = false, hasN = false;
  for (const c of chars) { if (c.codePointAt(0)! <= 127) hasA = true; else hasN = true; }
  if (!hasA || !hasN) continue;
  for (const c of chars) {
    if (c.codePointAt(0)! > 127) continue;
    const k = cls(c);
    bridgeByClass.set(k, (bridgeByClass.get(k) ?? 0) + 1);
    let set = bridgeGlyphsByClass.get(k);
    if (!set) { set = new Set(); bridgeGlyphsByClass.set(k, set); }
    for (const g of chars) if (g.codePointAt(0)! > 127) set.add(g);
  }
}

// ---- part 2: attribute the boundary cost on the shipped wires ----
const files = process.argv.slice(2);
const perClass = new Map<string, { runs: number; marginal: number; isolated: number; boundary: number }>();
const L: string[] = [];
let totalRuns = 0, totalMarginal = 0, totalIsolated = 0, totalBoundary = 0;
const receipt: any = { note: 'boundary cost attribution + vocabulary bridge availability; zero frontier calls', lanes: [] };
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const GLYPH = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 127) GLYPH.add(ch);
  let i = 0, laneRuns = 0;
  const laneByClass: Record<string, number> = {};
  while (i < body.length) {
    if (GLYPH.has(body[i])) {
      let j = i; while (j < body.length && GLYPH.has(body[j])) j++;
      const run = body.slice(i, j);
      const prev = i > 0 ? body[i - 1] : '';
      const k = cls(prev);
      const marg = prev === '' ? ct(run) : ct(prev + run) - ct(prev);
      const iso = ct(run);
      const e = perClass.get(k) ?? { runs: 0, marginal: 0, isolated: 0, boundary: 0 };
      e.runs++; e.marginal += marg; e.isolated += iso; e.boundary += marg - iso;
      perClass.set(k, e);
      laneByClass[k] = (laneByClass[k] ?? 0) + (marg - iso);
      totalRuns++; totalMarginal += marg; totalIsolated += iso; totalBoundary += marg - iso;
      laneRuns++;
      i = j;
    } else i++;
  }
  receipt.lanes.push({ lane: name, runs: laneRuns, boundaryCostByClass: laneByClass });
  L.push(name.padEnd(14) + 'runs ' + String(laneRuns).padStart(4) + '  boundary ' + JSON.stringify(laneByClass));
}
L.push('');
L.push('BOUNDARY COST BY CLASS OF THE PRECEDING CHARACTER (marginal - isolated, over all ten wires):');
L.push('  class'.padEnd(12) + 'runs   marginal  isolated  BOUNDARY  per-run   vocab bridges for this class  distinct bridge glyphs');
for (const [k, e] of [...perClass.entries()].sort((a, b) => b[1].boundary - a[1].boundary)) {
  L.push('  ' + k.padEnd(10) + String(e.runs).padStart(5) + String(e.marginal).padStart(11) + String(e.isolated).padStart(10) +
    String(e.boundary).padStart(10) + (e.boundary / e.runs).toFixed(3).padStart(9) +
    String(bridgeByClass.get(k) ?? 0).padStart(20) + String(bridgeGlyphsByClass.get(k)?.size ?? 0).padStart(18));
}
L.push('  ' + 'TOTAL'.padEnd(10) + String(totalRuns).padStart(5) + String(totalMarginal).padStart(11) + String(totalIsolated).padStart(10) +
  String(totalBoundary).padStart(10) + (totalBoundary / totalRuns).toFixed(3).padStart(9));
L.push('');
L.push(`reading: a POSITIVE boundary column is what the left context costs beyond the run in isolation;`);
L.push(`a class with a large positive boundary and MANY vocabulary bridges is an open lever, and one with`);
L.push(`zero bridges is closed by the tokenizer itself and no assignment can recover it.`);
receipt.perClass = [...perClass.entries()].map(([k, e]) => ({ class: k, ...e, bridges: bridgeByClass.get(k) ?? 0, bridgeGlyphs: bridgeGlyphsByClass.get(k)?.size ?? 0 }));
receipt.totals = { runs: totalRuns, marginal: totalMarginal, isolated: totalIsolated, boundary: totalBoundary };
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/boundary-census.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/boundary-census.log', log);
console.log(log);
