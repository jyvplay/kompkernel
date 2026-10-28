/**
 * src/lib/omega/taxis.ts
 * =============================================================================
 * TAXIS (τάξις, "arrangement in ranks") — derived columns in space-aligned
 * tables, restored by exact re-alignment.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * SYLLOGISMOS (X51) deletes columns that are exact functions of sibling fields,
 * but only in *delimited* tables, where every field boundary is explicit. The
 * ops output pasted into chats every day — `ps aux`, `df`, `ls -l`, `vmstat`,
 * `kubectl get` — is *space-aligned*: boundaries exist only as column
 * geometry, and its most redundant numeric columns are exactly the kind
 * SYLLOGISMOS cannot reach and its binary-arith family cannot express:
 * `ps` %MEM is 100·RSS/total-memory truncated to tenths (a *fitted global
 * constant*, verified 59/59 in X51 and on every ps lane re-checked in X53);
 * `df` Use% is ceil(100·Used/(Used+Avail)) (a share-of-sum form; verified 5/5
 * on live `df -k` in X53). AKOLOUTHIA-2, the ops leader, does no arithmetic;
 * DAEDALUS prices each fresh digit string.
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * (1) Infer the table's column geometry from the text alone: header word
 *     anchors (first/last letter positions), per-column alignment (L/R), and
 *     per-transition minimum gaps, under the rendering rule "an L field starts
 *     at its anchor, an R field ends at its anchor, and a field is pushed
 *     right whole when it would start less than `gap` spaces after the
 *     previous field ends" — accepted only if re-rendering the whole block
 *     from bare cells reproduces the input byte-for-byte (the fit that
 *     survives procps' overflow behaviour, X53 probe7). (2) Search derived
 *     columns over the parsed cells in ops-shaped families — fitted-total
 *     percent (trunc/round to the column's decimals, total solved as an exact
 *     rational interval), percent-of-column, ceil-share A/(A+B), and exact
 *     binary arithmetic at the target's scale — verifying every row with
 *     BigInt rational arithmetic and exact rendered-text equality. (3) Ship
 *     the original header line plus single-space-compacted rows without the
 *     derived columns; the contract states the derivations and the alignment
 *     rule once, so a stock LLM recomputes the columns and re-aligns every
 *     row under the header. Non-table lines pass through verbatim.
 * The reduced text is coded by the cheapest measured of DAEDALUS,
 * AKOLOUTHIA-2 and APOGRAPHE; the complete candidate must beat AKOLOUTHIA-2
 * and APOGRAPHE on the source (both TAGSTACK runtime-parent members) and then
 * the full TAGSTACK + SIBLING-TEMPLATE frontier strictly, or the measured
 * best parent is returned. Kinship, honestly: same entailment genus as
 * SYLLOGISMOS, different table model (inferred geometry + re-alignment, a
 * column-global layout function SYLLOGISMOS' row-local splice never needs)
 * and different relation families (fitted constant, share-of-sum). X51 named
 * whitespace-aligned ops tables as SYLLOGISMOS' documented boundary; this is
 * the codec that crosses it.
 *
 * Prior art: functional-dependency/semantic compression is established
 * (SPARTAN; SQUISH; DeepSqueeze, SIGMOD 2020; Blitzcrank, VLDB 2024; top-k
 * redundancy-ranked FD discovery, arXiv:2601.10130) — all bit-level, none
 * chat-readable, none operating on inferred space-alignment geometry. The
 * claim is only the verified one-chat realization with a frontier gate.
 *
 * Greedy/search: geometry fit is a bounded deterministic DFS over aligns
 * (gaps then determined uniquely), arbitrated by whole-block byte-exact
 * re-rendering; relation enumeration is bounded per column; drop-set
 * selection is greedy by estimated net saving (true rendered clause priced)
 * subject to acyclicity. Emission is a measured gate, never the estimate.
 *
 * Time/CPU: CPU-bound. Planner caps: 200k code units, 20k lines, 40 columns,
 * 20M cell evaluations. Inherited parent/frontier encodes dominate and have
 * no wrapper-wide cap; deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const TAXIS_MAX_CHARS = 200_000;
export const TAXIS_MAX_LINES = 20_000;
export const TAXIS_MAX_COLS = 40;
export const TAXIS_MIN_ROWS = 4;
export const TAXIS_MAX_DROPS = 4;
const MAX_WORK = 20_000_000;

export type TaxisRule =
  | { kind: 'fittedPct'; col: number; src: number; total: string; digits: number; mode: 'trunc' | 'round' }
  | { kind: 'pctOf'; col: number; src: number; den: number; digits: number; mode: 'trunc' | 'round' }
  | { kind: 'ceilShare'; col: number; src: number; other: number; pctSuffix: boolean }
  | { kind: 'arith'; col: number; a: number; b: number; op: '+' | '-' | '*' | '/'; digits: number; mode: 'exact' | 'round' };

export interface TaxisSpec {
  eol: '\n' | '\r\n';
  finalEol: boolean;
  blockStart: number; // header line index
  rowCount: number; // data rows
  headerCells: { text: string; start: number; end: number }[];
  aligns: ('L' | 'R')[];
  gaps: number[]; // length cols-1
  rules: TaxisRule[];
}

export interface TaxisPlan {
  spec: TaxisSpec;
  reducedText: string;
  contract: string;
  cols: number;
  rows: number;
}

export interface TaxisResult {
  codec: 'taxis';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  precheckParentTokens: number;
  parentTokens: number;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
  fullFrontierMeasured: boolean;
  applied: boolean;
  rules: TaxisRule[];
  rows: number;
  cols: number;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateParentTokens: number | null;
  candidateParentCodec: string | null;
  candidateParentCosts: Record<string, number> | null;
  comparison: string;
  notes: string;
  ms: number;
}

// ---------------------------------------------------------------------------
// Exact decimal helpers (BigInt)
// ---------------------------------------------------------------------------

interface Dec { num: bigint; scale: number } // value = num / 10^scale

function parseDec(s: string): Dec | null {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  const frac = m[3] ?? '';
  let num = BigInt(m[2] + frac);
  if (m[1] === '-') num = -num;
  return { num, scale: frac.length };
}
function isIntStr(s: string): boolean { return /^-?\d+$/.test(s); }
const pow10 = (k: number): bigint => 10n ** BigInt(k);

/** Render fraction n/d (d>0) with exactly `digits` decimals; modes exact/half-up/trunc. */
function renderFrac(n: bigint, d: bigint, digits: number, mode: 'exact' | 'round' | 'trunc'): string | null {
  const scaled = n * pow10(digits);
  let q: bigint;
  if (mode === 'exact') {
    if (scaled % d !== 0n) return null;
    q = scaled / d;
  } else if (mode === 'trunc') {
    q = scaled / d; // BigInt division truncates toward zero; our fracs here are >=0 in trunc families
    if (n < 0n && scaled % d !== 0n) q = q; // trunc toward zero already
  } else {
    // half-up (away from zero for .5): floor((2*scaled + d) / (2d)) for scaled>=0
    if (scaled >= 0n) q = (2n * scaled + d) / (2n * d);
    else q = -((2n * (-scaled) + d) / (2n * d));
  }
  return fmtScaled(q, digits);
}
function fmtScaled(q: bigint, digits: number): string {
  const neg = q < 0n;
  let s = (neg ? -q : q).toString();
  if (digits === 0) return (neg ? '-' : '') + s;
  s = s.padStart(digits + 1, '0');
  return (neg ? '-' : '') + s.slice(0, -digits) + '.' + s.slice(-digits);
}

// ---------------------------------------------------------------------------
// Geometry: tokenize a block, fit aligns+gaps, verify byte-exact render
// ---------------------------------------------------------------------------

interface BlockCells {
  headerCells: { text: string; start: number; end: number }[];
  rows: string[][];
  aligns: ('L' | 'R')[];
  gaps: number[];
}

function tokenizeLine(line: string, n: number): { cells: string[]; starts: number[]; ends: number[] } | null {
  const ms = [...line.matchAll(/\S+/g)];
  if (ms.length < n) return null;
  const cells: string[] = []; const starts: number[] = []; const ends: number[] = [];
  for (let j = 0; j < n - 1; j++) {
    cells.push(ms[j]![0]); starts.push(ms[j]!.index); ends.push(ms[j]!.index + ms[j]![0].length);
  }
  const lastStart = ms[n - 1]!.index;
  cells.push(line.slice(lastStart)); starts.push(lastStart); ends.push(line.length);
  return { cells, starts, ends };
}

function renderBlock(hc: { start: number; end: number }[], aligns: ('L' | 'R')[], gaps: number[], rowsCells: string[][]): string[] {
  const n = hc.length;
  const out: string[] = [];
  for (const cells of rowsCells) {
    let buf = ''; let prevEnd = 0;
    for (let j = 0; j < n; j++) {
      const c = cells[j]!;
      let start: number; let end: number;
      if (aligns[j] === 'R') {
        end = Math.max(hc[j]!.end, j > 0 ? prevEnd + gaps[j - 1]! + c.length : hc[j]!.end);
        start = end - c.length;
      } else {
        start = Math.max(hc[j]!.start, j > 0 ? prevEnd + gaps[j - 1]! : hc[j]!.start);
        end = start + c.length;
      }
      buf += ' '.repeat(Math.max(0, start - buf.length)) + c;
      prevEnd = end;
    }
    out.push(buf);
  }
  return out;
}

/** Exported for tests/red-team: fit one block's geometry or return null. */
export function taxisFitBlock(lines: string[], n: number): BlockCells | null { return fitBlock(lines, n); }

function fitBlock(lines: string[], n: number): BlockCells | null {
  // lines[0] = header. n = column count (may be < header word count for merged-last).
  const tok: { cells: string[]; starts: number[]; ends: number[] }[] = [];
  for (const ln of lines) {
    if (ln !== ln.trimEnd()) return null; // trailing spaces unsupported
    const t = tokenizeLine(ln, n);
    if (!t) return null;
    tok.push(t);
  }
  const headerCells = tok[0]!.cells.map((text, j) => ({ text, start: tok[0]!.starts[j]!, end: tok[0]!.ends[j]! }));
  const m = lines.length;
  const S = tok.map(t => t.starts); const E = tok.map(t => t.ends);
  const LEN = tok.map(t => t.cells.map(c => c.length));

  const fitGap = (j: number, a: 'L' | 'R'): number | null => {
    if (j === 0) {
      for (let i = 0; i < m; i++) {
        if (a === 'L' ? S[i]![0] !== headerCells[0]!.start : E[i]![0] !== Math.max(headerCells[0]!.end, LEN[i]![0]!)) return null;
      }
      return 0;
    }
    if (a === 'L') {
      let g = -Infinity; let mn = Infinity; let anyPushed = false;
      for (let i = 0; i < m; i++) {
        const need = S[i]![j]! - E[i]![j - 1]!;
        mn = Math.min(mn, need);
        if (S[i]![j]! > headerCells[j]!.start) { g = Math.max(g, need); anyPushed = true; }
      }
      if (!anyPushed) g = mn;
      if (g < 1 || g > mn) return null;
      for (let i = 0; i < m; i++) if (S[i]![j] !== Math.max(headerCells[j]!.start, E[i]![j - 1]! + g)) return null;
      return g;
    }
    let g = -Infinity; let mn = Infinity; let anyPushed = false;
    for (let i = 0; i < m; i++) {
      const need = E[i]![j]! - E[i]![j - 1]! - LEN[i]![j]!;
      mn = Math.min(mn, need);
      if (E[i]![j]! > headerCells[j]!.end) { g = Math.max(g, need); anyPushed = true; }
    }
    if (!anyPushed) g = mn;
    if (g < 1 || g > mn) return null;
    for (let i = 0; i < m; i++) if (E[i]![j] !== Math.max(headerCells[j]!.end, E[i]![j - 1]! + g + LEN[i]![j]!)) return null;
    return g;
  };

  const aligns: ('L' | 'R')[] = []; const gaps: number[] = [];
  const dfs = (j: number): boolean => {
    if (j === n) return true;
    const cands: ('L' | 'R')[] = j === n - 1 ? ['L'] : ['L', 'R'];
    for (const a of cands) {
      const g = fitGap(j, a);
      if (g === null) continue;
      aligns.push(a); if (j > 0) gaps.push(g);
      if (dfs(j + 1)) return true;
      aligns.pop(); if (j > 0) gaps.pop();
    }
    return false;
  };
  if (!dfs(0)) return null;
  const rendered = renderBlock(headerCells, aligns, gaps, tok.map(t => t.cells));
  for (let i = 0; i < m; i++) if (rendered[i] !== lines[i]) return null;
  return { headerCells, rows: tok.slice(1).map(t => t.cells), aligns, gaps };
}

// ---------------------------------------------------------------------------
// Derived-column families (all verified on every row, exact rendered text)
// ---------------------------------------------------------------------------

interface Frac { n: bigint; d: bigint } // d > 0
const fracCmp = (a: Frac, b: Frac): number => { const l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; };

/** digits of uniform format, or -1 if not a uniform-decimal column. */
function colDigits(vals: string[]): number {
  let d = -1;
  for (const v of vals) {
    const p = parseDec(v);
    if (!p) return -1;
    if (d === -1) d = p.scale; else if (p.scale !== d) return -1;
  }
  return d;
}

function tryFittedPct(rows: string[][], col: number, src: number, work: { n: number }): TaxisRule | null {
  const tvals = rows.map(r => r[col]!);
  const d = colDigits(tvals);
  if (d < 0 || d > 2) return null;
  const distinct = new Set(tvals);
  if (distinct.size < 3) return null;
  const avals: bigint[] = [];
  for (const r of rows) {
    if (!isIntStr(r[src]!)) return null;
    const a = BigInt(r[src]!);
    if (a < 0n) return null;
    avals.push(a);
  }
  const mvals = tvals.map(v => parseDec(v)!);
  if (mvals.some(x => x.num < 0n)) return null;
  let positive = 0;
  for (let i = 0; i < rows.length; i++) if (avals[i]! > 0n && mvals[i]!.num > 0n) positive++;
  if (positive < 2) return null;
  const D = pow10(d);
  for (const mode of ['trunc', 'round'] as const) {
    // Solve T interval. Work in scaled target units: M = m*D integer.
    // trunc: M <= 100*A*D/T < M+1  =>  T in (100*A*D/(M+1), 100*A*D/M]
    // round: M-0.5 <= 100*A*D/T < M+0.5 => T in (100*A*D/(M+0.5), 100*A*D/(M-0.5)] (M>=1; M=0: T > 100*A*D/0.5)
    let lo: Frac = { n: 0n, d: 1n }; let hi: Frac | null = null; let ok = true;
    for (let i = 0; i < rows.length; i++) {
      work.n++; if (work.n > MAX_WORK) return null;
      const A = avals[i]!; const M = mvals[i]!.num * (D / pow10(mvals[i]!.scale));
      if (A === 0n) { if (M !== 0n) { ok = false; break; } continue; }
      const num = 100n * A * D;
      if (mode === 'trunc') {
        const l: Frac = { n: num, d: M + 1n };
        if (fracCmp(l, lo) > 0) lo = l;
        if (M > 0n) { const h: Frac = { n: num, d: M }; if (hi === null || fracCmp(h, hi) < 0) hi = h; }
      } else {
        const l: Frac = { n: 2n * num, d: 2n * M + 1n };
        if (fracCmp(l, lo) > 0) lo = l;
        if (M > 0n) { const h: Frac = { n: 2n * num, d: 2n * M - 1n }; if (hi === null || fracCmp(h, hi) < 0) hi = h; }
      }
      if (hi !== null && fracCmp(lo, hi) >= 0) { ok = false; break; }
    }
    if (!ok || hi === null) continue;
    // smallest integer T > lo with T <= hi (hi open or closed both safe since render-verified next)
    let T = lo.n / lo.d + 1n;
    if (fracCmp({ n: T, d: 1n }, hi) > 0) continue;
    // belt-and-braces: render-verify every row with shipped T
    let good = true;
    for (let i = 0; i < rows.length; i++) {
      const r = renderFrac(100n * avals[i]!, T, d, mode);
      if (r !== tvals[i]) { good = false; break; }
    }
    // T might sit exactly at boundary issues; try T and T+1
    if (!good) {
      T = T + 1n; good = true;
      for (let i = 0; i < rows.length; i++) {
        const r = renderFrac(100n * avals[i]!, T, d, mode);
        if (r !== tvals[i]) { good = false; break; }
      }
    }
    if (good) return { kind: 'fittedPct', col, src, total: T.toString(), digits: d, mode };
  }
  return null;
}

function tryPctOf(rows: string[][], col: number, src: number, den: number, work: { n: number }): TaxisRule | null {
  const tvals = rows.map(r => r[col]!);
  const d = colDigits(tvals);
  if (d < 0 || d > 2) return null;
  if (new Set(tvals).size < 3) return null;
  for (const mode of ['trunc', 'round'] as const) {
    let good = true;
    for (let i = 0; i < rows.length; i++) {
      work.n++; if (work.n > MAX_WORK) return null;
      const a = parseDec(rows[i]![src]!); const b = parseDec(rows[i]![den]!);
      if (!a || !b || b.num === 0n) { good = false; break; }
      // 100*a/b as fraction
      const n = 100n * a.num * pow10(b.scale); const dn = b.num * pow10(a.scale);
      const r = dn > 0n ? renderFrac(n, dn, d, mode) : renderFrac(-n, -dn, d, mode);
      if (r !== tvals[i]) { good = false; break; }
    }
    if (good) return { kind: 'pctOf', col, src, den, digits: d, mode };
  }
  return null;
}

function tryCeilShare(rows: string[][], col: number, src: number, other: number, work: { n: number }): TaxisRule | null {
  const tvals = rows.map(r => r[col]!);
  let suffix: boolean | null = null;
  const tints: bigint[] = [];
  for (const v of tvals) {
    const m = /^(\d+)(%)?$/.exec(v);
    if (!m) return null;
    const s = m[2] === '%';
    if (suffix === null) suffix = s; else if (suffix !== s) return null;
    tints.push(BigInt(m[1]!));
  }
  if (new Set(tvals).size < 2) return null;
  for (let i = 0; i < rows.length; i++) {
    work.n++; if (work.n > MAX_WORK) return null;
    if (!isIntStr(rows[i]![src]!) || !isIntStr(rows[i]![other]!)) return null;
    const A = BigInt(rows[i]![src]!); const B = BigInt(rows[i]![other]!);
    if (A < 0n || B < 0n || A + B === 0n) return null;
    const c = A === 0n ? 0n : (100n * A + (A + B) - 1n) / (A + B);
    if (c !== tints[i]) return null;
  }
  return { kind: 'ceilShare', col, src, other, pctSuffix: suffix === true };
}

function tryArith(rows: string[][], col: number, a: number, b: number, op: '+' | '-' | '*' | '/', work: { n: number }): TaxisRule | null {
  const tvals = rows.map(r => r[col]!);
  const d = colDigits(tvals);
  if (d < 0 || d > 4) return null;
  if (new Set(tvals).size < 3) return null;
  for (const mode of ['exact', 'round'] as const) {
    let good = true;
    for (let i = 0; i < rows.length; i++) {
      work.n++; if (work.n > MAX_WORK) return null;
      const A = parseDec(rows[i]![a]!); const B = parseDec(rows[i]![b]!);
      if (!A || !B) { good = false; break; }
      let n: bigint; let dn: bigint;
      if (op === '+') { const s = Math.max(A.scale, B.scale); n = A.num * pow10(s - A.scale) + B.num * pow10(s - B.scale); dn = pow10(s); }
      else if (op === '-') { const s = Math.max(A.scale, B.scale); n = A.num * pow10(s - A.scale) - B.num * pow10(s - B.scale); dn = pow10(s); }
      else if (op === '*') { n = A.num * B.num; dn = pow10(A.scale + B.scale); }
      else { if (B.num === 0n) { good = false; break; } n = A.num * pow10(B.scale); dn = B.num * pow10(A.scale); if (dn < 0n) { dn = -dn; n = -n; } }
      const r = renderFrac(n, dn, d, mode);
      if (r !== tvals[i]) { good = false; break; }
    }
    if (good) return { kind: 'arith', col, a, b, op, digits: d, mode };
  }
  return null;
}

function computeCell(rule: TaxisRule, row: string[]): string {
  if (rule.kind === 'fittedPct') {
    return renderFrac(100n * BigInt(row[rule.src]!), BigInt(rule.total), rule.digits, rule.mode)!;
  }
  if (rule.kind === 'pctOf') {
    const a = parseDec(row[rule.src]!)!; const b = parseDec(row[rule.den]!)!;
    const n = 100n * a.num * pow10(b.scale); const dn = b.num * pow10(a.scale);
    return (dn > 0n ? renderFrac(n, dn, rule.digits, rule.mode) : renderFrac(-n, -dn, rule.digits, rule.mode))!;
  }
  if (rule.kind === 'ceilShare') {
    const A = BigInt(row[rule.src]!); const B = BigInt(row[rule.other]!);
    const c = A === 0n ? 0n : (100n * A + (A + B) - 1n) / (A + B);
    return c.toString() + (rule.pctSuffix ? '%' : '');
  }
  const A = parseDec(row[rule.a]!)!; const B = parseDec(row[rule.b]!)!;
  let n: bigint; let dn: bigint;
  if (rule.op === '+') { const s = Math.max(A.scale, B.scale); n = A.num * pow10(s - A.scale) + B.num * pow10(s - B.scale); dn = pow10(s); }
  else if (rule.op === '-') { const s = Math.max(A.scale, B.scale); n = A.num * pow10(s - A.scale) - B.num * pow10(s - B.scale); dn = pow10(s); }
  else if (rule.op === '*') { n = A.num * B.num; dn = pow10(A.scale + B.scale); }
  else { n = A.num * pow10(B.scale); dn = B.num * pow10(A.scale); if (dn < 0n) { dn = -dn; n = -n; } }
  return renderFrac(n, dn, rule.digits, rule.mode)!;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

function splitLines(text: string): { lines: string[]; eol: '\n' | '\r\n'; finalEol: boolean } | null {
  if (text.length === 0 || text.length > TAXIS_MAX_CHARS) return null;
  let eol: '\n' | '\r\n';
  if (text.includes('\r\n')) eol = '\r\n';
  else if (!text.includes('\r')) eol = '\n';
  else return null;
  const finalEol = text.endsWith(eol);
  const lines = text.split(eol);
  if (finalEol) lines.pop();
  if (lines.length > TAXIS_MAX_LINES) return null;
  return { lines, eol, finalEol };
}

function colName(cells: { text: string }[], j: number): string {
  const t = cells[j]!.text;
  const dup = cells.filter(c => c.text === t).length > 1;
  return dup ? `column ${j + 1} (${t})` : t;
}

function ruleClause(rule: TaxisRule, cells: { text: string }[]): string {
  const name = (j: number) => colName(cells, j);
  const dec = (d: number) => d === 0 ? 'to a whole number' : `to ${d} decimal${d > 1 ? 's' : ''}`;
  if (rule.kind === 'fittedPct') return `${name(rule.col)} = 100×${name(rule.src)}÷${rule.total}, ${rule.mode === 'trunc' ? 'truncated' : 'rounded'} ${dec(rule.digits)}`;
  if (rule.kind === 'pctOf') return `${name(rule.col)} = 100×${name(rule.src)}÷${name(rule.den)}, ${rule.mode === 'trunc' ? 'truncated' : 'rounded'} ${dec(rule.digits)}`;
  if (rule.kind === 'ceilShare') return `${name(rule.col)} = the ceiling of 100×${name(rule.src)}÷(${name(rule.src)}+${name(rule.other)})${rule.pctSuffix ? ', with a % sign' : ''}`;
  const sym = rule.op === '+' ? '+' : rule.op === '-' ? '−' : rule.op === '*' ? '×' : '÷';
  return `${name(rule.col)} = ${name(rule.a)}${sym}${name(rule.b)}${rule.mode === 'round' ? `, rounded ${dec(rule.digits)}` : ''}`;
}

export function taxisPlan(text: string, enc: EncodingName = 'o200k_base'): TaxisPlan | null {
  const sp = splitLines(text);
  if (!sp) return null;
  const { lines, eol, finalEol } = sp;
  // Find the longest fittable table block.
  let best: { start: number; block: BlockCells; len: number } | null = null;
  for (let h = 0; h < lines.length; h++) {
    const words = lines[h]!.split(/\s+/).filter(Boolean).length;
    if (words < 3 || words > TAXIS_MAX_COLS + 3) continue;
    for (let n = Math.min(words, TAXIS_MAX_COLS); n >= Math.max(3, words - 3); n--) {
      // maximal run of tokenizable lines from h
      let end = h + 1;
      while (end < lines.length && tokenizeLine(lines[end]!, n) && lines[end] === lines[end]!.trimEnd()) end++;
      const rowCount = end - h - 1;
      if (rowCount < TAXIS_MIN_ROWS) continue;
      if (best && rowCount <= best.len) continue;
      const block = fitBlock(lines.slice(h, end), n);
      if (block) best = { start: h, block, len: rowCount };
    }
  }
  if (!best) return null;
  const { headerCells, rows, aligns, gaps } = best.block;
  const n = headerCells.length;
  // Enumerate candidate rules.
  const work = { n: 0 };
  const candidates: TaxisRule[] = [];
  for (let col = 0; col < n; col++) {
    let found: TaxisRule | null = null;
    for (let src = 0; src < n && !found; src++) {
      if (src === col) continue;
      found = tryFittedPct(rows, col, src, work);
    }
    if (!found) {
      outer: for (let src = 0; src < n; src++) {
        if (src === col) continue;
        for (let den = 0; den < n; den++) {
          if (den === col || den === src) continue;
          found = tryPctOf(rows, col, src, den, work) ?? tryCeilShare(rows, col, src, den, work);
          if (found) break outer;
        }
      }
    }
    if (!found) {
      outer2: for (const op of ['+', '-', '*', '/'] as const) {
        for (let a = 0; a < n; a++) {
          if (a === col) continue;
          for (let b = 0; b < n; b++) {
            if (b === col || b === a) continue;
            found = tryArith(rows, col, a, b, op, work);
            if (found) break outer2;
          }
        }
      }
    }
    if (found) candidates.push(found);
  }
  if (candidates.length === 0) return null;

  // Greedy acyclic selection by estimated net saving (true clause priced).
  const srcOf = (r: TaxisRule): number[] => r.kind === 'fittedPct' ? [r.src] : r.kind === 'pctOf' ? [r.src, r.den] : r.kind === 'ceilShare' ? [r.src, r.other] : [r.a, r.b];
  const colMass = (j: number): number => countTokens(rows.map(r => r[j]!).join(' '), enc);
  const scored = candidates.map(r => ({ r, est: colMass(r.col) - countTokens(ruleClause(r, headerCells), enc) }))
    .filter(x => x.est > 0).sort((x, y) => y.est - x.est);
  const drops: TaxisRule[] = []; const usedSrc = new Set<number>(); const droppedCols = new Set<number>();
  for (const { r } of scored) {
    if (drops.length >= TAXIS_MAX_DROPS) break;
    if (usedSrc.has(r.col)) continue;
    if (srcOf(r).some(s => droppedCols.has(s))) continue;
    drops.push(r); droppedCols.add(r.col);
    for (const s of srcOf(r)) usedSrc.add(s);
  }
  if (drops.length === 0) return null;

  const spec: TaxisSpec = {
    eol, finalEol, blockStart: best.start, rowCount: rows.length,
    headerCells, aligns, gaps, rules: drops,
  };
  const reducedLines = [...lines];
  for (let i = 0; i < rows.length; i++) {
    reducedLines[best.start + 1 + i] = rows[i]!.filter((_, j) => !droppedCols.has(j)).join(' ');
  }
  const reducedText = reducedLines.join(eol) + (finalEol ? eol : '');
  // Acceptance: full restore must reproduce the input byte-for-byte.
  if (taxisRestore(reducedText, spec) !== text) return null;

  const head0 = headerCells[0]!.text;
  const hasPassthrough = best.start > 0 || best.start + 1 + rows.length < lines.length;
  const headerRef = hasPassthrough ? `the unchanged header (the line starting "${head0}")` : 'the unchanged header';
  const gapText = gaps.every(g => g <= 9) ? `min gaps digitwise ${gaps.join('')}` : `min gaps ${gaps.join(' ')}`;
  const omitted = drops.map(r => ruleClause(r, headerCells)).join('; ');
  const contract =
    `TAXIS: rows single-spaced under ${headerRef}, minus ${omitted}. ` +
    `Split at spaces (last field may hold spaces), insert the omitted field${drops.length > 1 ? 's' : ''}, re-align under header words (${aligns.join('')}: L/R = word start/end; ${gapText}; shift right whole if needed).`;
  return { spec, reducedText, contract, cols: n, rows: rows.length };
}

/** Inverse of the transform: parent-decoded reduced text -> original text. */
export function taxisRestore(reducedText: string, spec: TaxisSpec): string {
  const finalEol = reducedText.endsWith(spec.eol);
  const lines = reducedText.split(spec.eol);
  if (finalEol) lines.pop();
  const n = spec.headerCells.length;
  const dropped = new Map(spec.rules.map(r => [r.col, r] as const));
  const keptIdx: number[] = [];
  for (let j = 0; j < n; j++) if (!dropped.has(j)) keptIdx.push(j);
  for (let i = 0; i < spec.rowCount; i++) {
    const li = spec.blockStart + 1 + i;
    const line = lines[li]!;
    // split into keptIdx.length fields; last kept field takes the remainder
    const fields: string[] = [];
    let rest = line;
    for (let k = 0; k < keptIdx.length - 1; k++) {
      const sp = rest.indexOf(' ');
      fields.push(sp === -1 ? rest : rest.slice(0, sp));
      rest = sp === -1 ? '' : rest.slice(sp + 1);
    }
    fields.push(rest);
    const full: string[] = new Array<string>(n);
    keptIdx.forEach((j, k) => { full[j] = fields[k]!; });
    for (const r of spec.rules) full[r.col] = computeCell(r, full);
    lines[li] = renderBlock(spec.headerCells, spec.aligns, spec.gaps, [full])[0]!;
  }
  return lines.join(spec.eol) + (spec.finalEol ? spec.eol : '');
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (same construction as DIPTYCHON)
// ---------------------------------------------------------------------------

interface MeasureParent {
  wire: string;
  message: string;
  decoded: string;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
}

function measuredAkolouthia2(text: string, enc: EncodingName): MeasureParent {
  const parent = akolouthia2Encode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('TAXIS AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('TAXIS DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('TAXIS APOGRAPHE parent did not reconstruct');
  return { wire: parent.wire, message, decoded, messageTokens: directTokens, parentCodec: 'apographe', parentCosts: { apographe: directTokens } };
}

function cheapestOf(parents: MeasureParent[]): MeasureParent {
  const costs: Record<string, number> = {};
  for (const p of parents) costs[p.parentCodec] = p.messageTokens;
  const best = [...parents].sort((x, y) => x.messageTokens - y.messageTokens)[0]!;
  return { ...best, parentCosts: costs };
}

function measuredFrontier(text: string, enc: EncodingName): MeasureParent {
  const tag: TagstackResult = tagstackEncode(text, enc);
  if (!tag.frontierComplete || !tag.exact || tag.decoded !== text) {
    throw new Error('TAXIS baseline frontier did not complete exactly');
  }
  const sibling: SiblingTemplateResult = siblingTemplateEncode(text, enc, tag);
  if (!sibling.exact || sibling.decoded !== text) {
    throw new Error('TAXIS SIBLING-TEMPLATE parent did not reconstruct exactly');
  }
  const parentCosts = { ...tag.frontierCosts, 'sibling-template': sibling.messageTokens };
  const siblingWon = sibling.applied && sibling.messageTokens < tag.messageTokens;
  return {
    wire: siblingWon ? sibling.wire : tag.wire,
    message: siblingWon ? sibling.message : tag.message,
    decoded: text,
    messageTokens: Math.min(tag.messageTokens, sibling.messageTokens),
    parentCodec: siblingWon ? 'sibling-template' : tag.parentCodec,
    parentCosts,
  };
}

function fallbackResult(
  text: string,
  inTokens: number,
  parent: MeasureParent,
  plan: TaxisPlan | null,
  candidateTokens: number | null,
  candidateExact: boolean | null,
  comparison: string,
  notes: string,
  ms: number,
  candidateParent: MeasureParent | null = null,
  fullFrontierMeasured = false,
  precheckParentTokens = parent.messageTokens,
): TaxisResult {
  return {
    codec: 'taxis', wire: parent.wire, message: parent.message, decoded: text,
    exact: parent.decoded === text, inTokens, precheckParentTokens,
    parentTokens: parent.messageTokens, messageTokens: parent.messageTokens,
    parentCodec: parent.parentCodec, parentCosts: parent.parentCosts, fullFrontierMeasured,
    applied: false,
    rules: plan?.spec.rules ?? [], rows: plan?.rows ?? 0, cols: plan?.cols ?? 0,
    candidateTokens, candidateExact,
    candidateParentTokens: candidateParent?.messageTokens ?? null,
    candidateParentCodec: candidateParent?.parentCodec ?? null,
    candidateParentCosts: candidateParent?.parentCosts ?? null,
    comparison, notes, ms,
  };
}

/**
 * Encode with a two-member necessary-condition precheck (AKOLOUTHIA-2 and
 * APOGRAPHE are both in the X49 TAGSTACK runtime-parent set), then the full
 * TAGSTACK + SIBLING-TEMPLATE frontier for candidates that clear it.
 */
export function taxisEncode(text: string, enc: EncodingName = 'o200k_base'): TaxisResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const akoParent = measuredAkolouthia2(text, enc);
  const plan = taxisPlan(text, enc);
  if (!plan) {
    return fallbackResult(text, inTokens, akoParent, null, null, null,
      'AKOLOUTHIA-2 fallback only; no verified aligned-table candidate was formed',
      'input has no space-aligned table block that re-renders byte-exactly with a verified derived column; returned the exact AKOLOUTHIA-2 message',
      Date.now() - started);
  }

  let apoParent: MeasureParent;
  try {
    apoParent = measuredApographe(text, enc);
  } catch {
    return fallbackResult(text, inTokens, akoParent, plan, null, null,
      'APOGRAPHE precheck parent failed',
      'returned the exact AKOLOUTHIA-2 message; no candidate was emitted', Date.now() - started);
  }
  const precheck = cheapestOf([akoParent, apoParent]);

  let candidateParent: MeasureParent;
  try {
    candidateParent = cheapestOf([
      measuredDaedalus(plan.reducedText, enc),
      measuredAkolouthia2(plan.reducedText, enc),
      measuredApographe(plan.reducedText, enc),
    ]);
  } catch {
    return fallbackResult(text, inTokens, precheck, plan, null, null,
      'candidate parent exactness/cost check failed',
      'returned the cheapest measured exact precheck parent', Date.now() - started, null, false, precheck.messageTokens);
  }
  const candidateMessage = `${plan.contract}\n${candidateParent.message}`;
  const candidateTokens = countTokens(candidateMessage, enc);
  let decoded: string | null = null;
  try {
    decoded = taxisRestore(candidateParent.decoded, plan.spec);
  } catch {
    decoded = null;
  }
  const candidateExact = decoded === text;
  if (!candidateExact) {
    return fallbackResult(text, inTokens, precheck, plan, candidateTokens, false,
      'candidate exactness rejection',
      'candidate inverse failed byte exactness; returned the cheapest measured exact precheck parent',
      Date.now() - started, candidateParent, false, precheck.messageTokens);
  }

  if (candidateTokens >= precheck.messageTokens) {
    return fallbackResult(text, inTokens, precheck, plan, candidateTokens, true,
      'AKOLOUTHIA-2/APOGRAPHE necessary-condition rejection; full TAGSTACK/SIBLING tournament safely skipped',
      `candidate M=${candidateTokens} >= measured frontier member M=${precheck.messageTokens} (${precheck.parentCodec}); it therefore cannot be below a frontier that includes that member`,
      Date.now() - started, candidateParent, false, precheck.messageTokens);
  }

  let frontier: MeasureParent;
  try {
    frontier = measuredFrontier(text, enc);
  } catch {
    return fallbackResult(text, inTokens, precheck, plan, candidateTokens, true,
      'candidate cleared the precheck but the full TAGSTACK/SIBLING tournament did not complete',
      'returned the cheapest measured exact precheck parent; no full-frontier win is claimed',
      Date.now() - started, candidateParent, false, precheck.messageTokens);
  }
  if (candidateTokens >= frontier.messageTokens) {
    return fallbackResult(text, inTokens, frontier, plan, candidateTokens, true,
      'full TAGSTACK/SIBLING same-source frontier rejection',
      `candidate M=${candidateTokens} >= measured frontier M=${frontier.messageTokens}; returned the measured best parent`,
      Date.now() - started, candidateParent, true, precheck.messageTokens);
  }
  return {
    codec: 'taxis', wire: candidateParent.wire, message: candidateMessage, decoded: decoded!,
    exact: true, inTokens, precheckParentTokens: precheck.messageTokens,
    parentTokens: frontier.messageTokens, messageTokens: candidateTokens,
    parentCodec: frontier.parentCodec, parentCosts: frontier.parentCosts,
    fullFrontierMeasured: true, applied: true,
    rules: plan.spec.rules, rows: plan.rows, cols: plan.cols,
    candidateTokens, candidateExact: true,
    candidateParentTokens: candidateParent.messageTokens,
    candidateParentCodec: candidateParent.parentCodec,
    candidateParentCosts: candidateParent.parentCosts,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
    notes: `re-aligned a ${plan.rows}x${plan.cols} space-aligned table, ${plan.spec.rules.length} derived column(s) [${plan.spec.rules.map(r => r.kind).join(',')}]; complete-message M=${candidateTokens} < same-source frontier M=${frontier.messageTokens}`,
    ms: Date.now() - started,
  };
}
