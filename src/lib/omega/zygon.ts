/**
 * src/lib/omega/zygon.ts
 * =============================================================================
 * ZYGON (ζυγόν — the beam of a balance) — weighted-sum (exact linear-law)
 * column elision for delimited tables. X58.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * The {terms × coefficients} grid of same-row linear laws, read from
 * source: (1 term, fitted coefficient) is SYLLOGISMOS `scaleK`; (n terms,
 * all coefficients ±1) is KEPHALAION rowsum/headsum; (2 terms, one binary
 * op) is SYLLOGISMOS `arith`. The general corner — **n terms with fitted
 * rational coefficients**, y = round(Σ wᵢ·xᵢ + b) — is expressible by
 * none of them, and it is where gradebooks, portfolios and cost rollups
 * live: a weighted Final (0.01·survey + 0.02·dba + … + 0.5·exam_avg —
 * the X58 GWU lane verifies 36/36 with the weights printed in its own
 * first row), a portfolio's day value (Σ sharesⱼ × priceⱼ), a BOM's
 * rolled-up cost (Σ qty × unit cost), a GPA numerator (Σ grade-points ×
 * credits), even the humble average (½, ½), which SYLLOGISMOS cannot
 * state either (two ops). Every such printed total is fresh digits a
 * dictionary pays for in full.
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * For each candidate target column, ZYGON solves for exact BigInt-
 * rational weights (Bareiss fraction-free elimination over a full-rank
 * set of rows; intercept fitted as one more unknown, kept only when the
 * data needs it), then verifies **every row** under a stated rounding
 * mode (halves away from zero, or truncate) at the target's printed
 * scale. Up to 3 exception rows may ship verbatim (manual adjustments
 * in real gradebooks). Decimal simplifications of the weight vector are
 * re-verified and preferred when they hold (0.105 beats 21/200); among
 * verified forms the contract groups equal weights — 0.01×({a}+{b}+{c})
 * — which is shorter to ship *and* lighter to execute. All-ones weights
 * are refused (KEPHALAION owns them), as is any single-term law
 * (scaleK owns it). Multiple drops per table (≤4), sources never
 * dropped, plain/German rendering, whole-input byte-exact restore
 * arbitration, house frontier gate (beat AKOLOUTHIA-2 + APOGRAPHE on
 * the source, then the full TAGSTACK+SIBLING frontier strictly, else
 * the measured best parent is returned).
 *
 * READER PROTOCOL
 * -----------------------------------------------------------------------------
 * Stateless per row: a grouped weighted sum of the row's decoded cells,
 * rounded as stated. KEPHALAION with coefficients — additions plus one
 * multiplication per weight-group; a slip damages one cell.
 *
 * Prior art, honestly: exact linear (arithmetic) functional dependencies
 * are part of the FD literature (survey: Kossmann et al., VLDB Journal
 * 2022, DOI 10.1007/s00778-021-00676-3); linear-model column stores
 * exist at bit level. For rational weight-vector fitting with exact
 * per-row re-verification and a grouped natural-language formula taught
 * in-band for one-chat LLM recomputation: no paper stands behind this
 * mechanism; citation: none.
 *
 * Greedy/search: weight fitting is exact linear algebra over a
 * greedily-extended row basis (bounded terms/rows, ZYGON_MAX_WORK),
 * verified exhaustively; drop admission is greedy by true rendered
 * contract + reduced tokens; emission is the measured gate.
 *
 * Time/CPU: CPU-bound; planner bounded by caps; parents/frontier
 * dominate wall-clock, deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const ZYGON_MAX_CHARS = 400_000;
export const ZYGON_MAX_ROWS = 20_000;
export const ZYGON_MAX_COLS = 64;
export const ZYGON_MIN_DATA_ROWS = 10;
export const ZYGON_MAX_DROPS = 4;
export const ZYGON_MAX_TERMS = 16;
export const ZYGON_MAX_SOURCES = 24;
export const ZYGON_MAX_EXCEPTIONS = 3;
export const ZYGON_MAX_WORK = 120_000_000;

// ---------------------------------------------------------------------------
// CSV parsing (house template)
// ---------------------------------------------------------------------------

interface CsvRow { fields: string[]; values: string[] }

function splitCsvLine(line: string, delim: string): CsvRow | null {
  const fields: string[] = [];
  const values: string[] = [];
  let i = 0;
  const n = line.length;
  while (true) {
    let j = i;
    let val = '';
    if (line[j] === '"') {
      j++;
      let closed = false;
      while (j < n) {
        if (line[j] === '"') {
          if (line[j + 1] === '"') { val += '"'; j += 2; } else { j++; closed = true; break; }
        } else val += line[j++];
      }
      if (!closed) return null;
    } else {
      while (j < n && line[j] !== delim) val += line[j++];
    }
    fields.push(line.slice(i, j));
    values.push(val);
    if (j >= n) break;
    if (line[j] !== delim) return null;
    i = j + 1;
    if (i === n) { fields.push(''); values.push(''); break; }
  }
  return { fields, values };
}

interface ParsedTable {
  delimiter: string;
  eols: string[];
  rows: CsvRow[];
}

function parseTable(text: string, delim: string, minDataRows: number, minCols: number): ParsedTable | null {
  const rawLines = text.split('\n');
  const rows: CsvRow[] = [];
  const eols: string[] = [];
  for (let li = 0; li < rawLines.length; li++) {
    const isLast = li === rawLines.length - 1;
    let body = rawLines[li]!;
    let eol = isLast ? '' : '\n';
    if (!isLast && body.endsWith('\r')) { body = body.slice(0, -1); eol = '\r\n'; }
    if (isLast && body === '') break;
    if (body.length === 0) return null;
    const row = splitCsvLine(body, delim);
    if (!row) return null;
    rows.push(row);
    eols.push(eol);
  }
  if (rows.length < minDataRows + 1 || rows.length > ZYGON_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < minCols || cols > ZYGON_MAX_COLS) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Number styles (plain / German), exact scaled BigInt — house template
// ---------------------------------------------------------------------------

export type ZygonStyle = 'plain' | 'de';

const PLAIN_RE = /^-?(\d+)(?:\.(\d+))?$/;
const DE_GROUPED_RE = /^-?(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/;
const DE_PLAIN_RE = /^-?(\d+)(?:,(\d+))?$/;

function parseStyled(s: string, style: ZygonStyle, grouped: boolean): { v: bigint; scale: number } | null {
  if (style === 'plain') {
    const m = PLAIN_RE.exec(s);
    if (!m) return null;
    const frac = m[2] ?? '';
    const mag = BigInt(m[1] + frac);
    return { v: s.startsWith('-') ? -mag : mag, scale: frac.length };
  }
  const m = (grouped ? DE_GROUPED_RE : DE_PLAIN_RE).exec(s) ?? (!grouped ? null : DE_PLAIN_RE.exec(s));
  if (!m) return null;
  const intDigits = m[1]!.replace(/\./g, '');
  const frac = m[2] ?? '';
  const mag = BigInt(intDigits + frac);
  return { v: s.startsWith('-') ? -mag : mag, scale: frac.length };
}

function renderStyled(v: bigint, scale: number, style: ZygonStyle, grouped: boolean): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let intPart = scale === 0 ? a : a.slice(0, a.length - scale);
  const fracPart = scale === 0 ? '' : a.slice(a.length - scale);
  if (style === 'de' && grouped) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sep = style === 'de' ? ',' : '.';
  return (neg ? '-' : '') + intPart + (scale === 0 ? '' : sep + fracPart);
}

function parseColumn(
  values: string[], style: ZygonStyle, grouped: boolean,
): { cells: (bigint | null)[]; scale: number } | null {
  const cells: (bigint | null)[] = [];
  let scale = -1;
  for (const s of values) {
    if (s === '') { cells.push(null); continue; }
    const c = parseStyled(s, style, grouped);
    if (!c) return null;
    if (scale === -1) scale = c.scale;
    if (c.scale !== scale) return null;
    cells.push(c.v);
  }
  if (scale === -1) return null;
  return { cells, scale };
}

// ---------------------------------------------------------------------------
// Exact rational helpers (as in SYZYGIA)
// ---------------------------------------------------------------------------

interface Rat { p: bigint; q: bigint }

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) { const t = a % b; a = b; b = t; }
  return a === 0n ? 1n : a;
}

function rat(p: bigint, q: bigint): Rat {
  if (q < 0n) { p = -p; q = -q; }
  const g = bgcd(p, q);
  return { p: p / g, q: q / g };
}

const radd = (a: Rat, b: Rat): Rat => rat(a.p * b.q + b.p * a.q, a.q * b.q);
const rmul = (a: Rat, b: Rat): Rat => rat(a.p * b.p, a.q * b.q);
const rsub = (a: Rat, b: Rat): Rat => rat(a.p * b.q - b.p * a.q, a.q * b.q);
const rdiv = (a: Rat, b: Rat): Rat | null => (b.p === 0n ? null : rat(a.p * b.q, a.q * b.p));
const pow10 = (k: number): bigint => 10n ** BigInt(k);

/** Round num/den (den>0) to integer; half-up = halves away from zero. */
function roundRat(num: bigint, den: bigint, mode: 'half-up' | 'trunc'): bigint {
  if (mode === 'trunc') return num / den;
  const neg = num < 0n;
  const a = neg ? -num : num;
  const q = a / den;
  const r = a % den;
  const up = r * 2n >= den ? q + 1n : q;
  return neg ? -up : up;
}

function ratToDecimal(r: Rat, maxPlaces: number): string | null {
  let q = r.q;
  let twos = 0; let fives = 0;
  while (q % 2n === 0n) { q /= 2n; twos++; }
  while (q % 5n === 0n) { q /= 5n; fives++; }
  if (q !== 1n) return null;
  const places = Math.max(twos, fives);
  if (places > maxPlaces) return null;
  const scaled = r.p * (2n ** BigInt(places - twos)) * (5n ** BigInt(places - fives));
  return renderStyled(scaled, places, 'plain', false).replace(/\.?0+$/, (m) => (m.startsWith('.') ? '' : m));
}

function ratText(r: Rat): string {
  const d = ratToDecimal(r, 10);
  return d !== null ? d : `${r.p}/${r.q}`;
}

/** Decimal rounding of a whole weight vector at k places (jointly re-verified by caller). */
function decimalRoundVec(ws: Rat[], k: number): Rat[] {
  return ws.map((w) => rat(roundRat(w.p * pow10(k), w.q, 'half-up'), pow10(k)));
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export interface ZygonTerm { col: number; w: { p: string; q: string } }

export interface ZygonDrop {
  col: number;
  headerName: string;
  terms: ZygonTerm[];
  /** intercept (0 when unused) */
  b: { p: string; q: string };
  mode: 'half-up' | 'trunc';
  scale: number;
  exceptions: { row: number; text: string }[];
}

export interface ZygonSpec {
  v: 1;
  delimiter: string;
  style: ZygonStyle;
  grouped: boolean;
  /** 0-based index of the header row; rows above it are lead rows (e.g. a
   * spreadsheet weights row) passed through with dropped cells reinserted */
  headerRow: number;
  /** raw dropped-column fields of lead rows, restored verbatim */
  leadDropped: { row: number; col: number; field: string }[];
  drops: ZygonDrop[];
}

export interface ZygonPlan {
  spec: ZygonSpec;
  reducedText: string;
  contract: string;
}

// ---------------------------------------------------------------------------
// Fitting: exact rational linear solve (Gaussian elimination over Rat)
// ---------------------------------------------------------------------------

interface NumColInfo { col: number; cells: (bigint | null)[]; scale: number }

interface LinFit {
  terms: { col: number; w: Rat }[];
  b: Rat;
  mode: 'half-up' | 'trunc';
  exceptions: { row: number; text: string }[];
  cost: number; // pricing proxy among verified fits
}

/** value of a cell as an exact rational */
const cellRat = (c: bigint, scale: number): Rat => rat(c, pow10(scale));

/** round_mode(sum) at target scale, in target ulps */
function predictLin(ws: Rat[], rowVals: Rat[], b: Rat, yScale: number, mode: 'half-up' | 'trunc'): bigint {
  let acc = b;
  for (let i = 0; i < ws.length; i++) acc = radd(acc, rmul(ws[i]!, rowVals[i]!));
  return roundRat(acc.p * pow10(yScale), acc.q, mode);
}

/** Solve A x = y exactly over Rat with partial pivoting.
 * Returns { x } or { singularAt } (the pivot column that failed). */
function solveLinear(A: Rat[][], y: Rat[], work: { n: number }): { x: Rat[] } | { singularAt: number } {
  const n = y.length;
  const M: Rat[][] = A.map((row, i) => [...row, y[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = -1;
    for (let r = col; r < n; r++) { work.n++; if (M[r]![col]!.p !== 0n) { piv = r; break; } }
    if (piv === -1) return { singularAt: col };
    if (piv !== col) { const t = M[col]!; M[col] = M[piv]!; M[piv] = t; }
    const pv = M[col]![col]!;
    for (let r = 0; r < n; r++) {
      if (r === col || M[r]![col]!.p === 0n) continue;
      const f = rdiv(M[r]![col]!, pv);
      if (!f) return { singularAt: col };
      for (let c = col; c <= n; c++) {
        work.n++;
        if (work.n > ZYGON_MAX_WORK) return { singularAt: -1 };
        M[r]![c] = rsub(M[r]![c]!, rmul(f, M[col]![c]!));
      }
    }
  }
  const x: Rat[] = [];
  for (let i = 0; i < n; i++) {
    const v = rdiv(M[i]![n]!, M[i]![i]!);
    if (!v) return { singularAt: i };
    x.push(v);
  }
  return { x };
}

function verifyLin(
  srcCols: NumColInfo[], tgt: NumColInfo, ws: Rat[], b: Rat,
  render: (v: bigint) => string, work: { n: number },
): { mode: 'half-up' | 'trunc'; exceptions: { row: number; text: string }[] } | null {
  const R = tgt.cells.length;
  const rowVals: Rat[][] = [];
  for (let i = 0; i < R; i++) rowVals.push(srcCols.map((s) => cellRat(s.cells[i]!, s.scale)));
  for (const mode of ['half-up', 'trunc'] as const) {
    const exceptions: { row: number; text: string }[] = [];
    let ok = true;
    for (let i = 0; i < R; i++) {
      work.n++;
      if (work.n > ZYGON_MAX_WORK) return null;
      const pred = predictLin(ws, rowVals[i]!, b, tgt.scale, mode);
      if (pred !== tgt.cells[i]!) {
        exceptions.push({ row: i, text: render(tgt.cells[i]!) });
        if (exceptions.length > ZYGON_MAX_EXCEPTIONS) { ok = false; break; }
      }
    }
    if (ok) return { mode, exceptions };
  }
  return null;
}

function fitLinear(
  srcCols0: NumColInfo[], tgt: NumColInfo, render: (v: bigint) => string, work: { n: number },
): LinFit | null {
  const R = tgt.cells.length;
  if (tgt.cells.some((c) => c === null)) return null;
  // constant-valued sources are collinear with the intercept and useless
  // as terms (e.g. a Shares column in a portfolio grid): exclude them
  const srcCols = srcCols0.filter((s) => !s.cells.some((c) => c === null)
    && new Set((s.cells as bigint[]).map(String)).size >= 2);
  if (srcCols.length < 2 || srcCols.length > ZYGON_MAX_SOURCES) return null;
  if (new Set((tgt.cells as bigint[]).map(String)).size < 3) return null;

  // candidate unknown layouts: with and without intercept
  for (const withB of [false, true]) {
    // Exact normal equations over ALL rows: (A^T A) w = A^T y, solved in
    // rationals. The printed targets are rounded; a square solve through
    // k arbitrary rows amplifies that rounding into the weights, while
    // least-squares averages it down so the snap below lands on clean
    // decimals. Collinear sources (played = wins+draws+losses) make the
    // Gram matrix singular: drop the pivot-failing column and retry.
    let cols = [...srcCols];
    let sol: Rat[] | null = null;
    let solCols: NumColInfo[] | null = null;
    for (let attempt = 0; attempt <= srcCols.length && cols.length >= 2; attempt++) {
      const k = cols.length + (withB ? 1 : 0);
      if (R < k + 2) break;
      const vec = (i: number): Rat[] => {
        const v = cols.map((s2) => cellRat(s2.cells[i]!, s2.scale));
        if (withB) v.push({ p: 1n, q: 1n });
        return v;
      };
      const AtA: Rat[][] = Array.from({ length: k }, () => Array.from({ length: k }, () => ({ p: 0n, q: 1n })));
      const Aty: Rat[] = Array.from({ length: k }, () => ({ p: 0n, q: 1n }));
      for (let i = 0; i < R; i++) {
        const v = vec(i);
        const yv = cellRat(tgt.cells[i]!, tgt.scale);
        for (let a = 0; a < k; a++) {
          Aty[a] = radd(Aty[a]!, rmul(v[a]!, yv));
          for (let bb = a; bb < k; bb++) {
            work.n++;
            AtA[a]![bb] = radd(AtA[a]![bb]!, rmul(v[a]!, v[bb]!));
          }
        }
        if (work.n > ZYGON_MAX_WORK) return null;
      }
      for (let a = 0; a < k; a++) for (let bb = 0; bb < a; bb++) AtA[a]![bb] = AtA[bb]![a]!;
      const res = solveLinear(AtA, Aty, work);
      if ('x' in res) { sol = res.x; solCols = cols; break; }
      if (res.singularAt < 0 || res.singularAt >= cols.length) break; // intercept/work: give up this layout
      cols = cols.filter((_, i) => i !== res.singularAt);
    }
    if (!sol || !solCols) continue;
    const solSrcCols: NumColInfo[] = solCols;
    if (!sol) continue;
    const ws0 = withB ? sol.slice(0, -1) : sol;
    const b0 = withB ? sol[sol.length - 1]! : { p: 0n, q: 1n };
    // The printed target is rounded, so an exact solve through it returns
    // weights with junk digits (0.0100000001...). Recovery = SNAP the
    // vector to k decimals (small weights snap to 0, fixing the support),
    // then verify every row under the stated rounding; also try raw.
    const burden = (r: Rat): number => (ratToDecimal(r, 10) !== null ? 0 : (r.q <= 9n ? 8 : 40));
    let best: LinFit | null = null;
    const finish = (wsAll: Rat[], b: Rat): void => {
      const idxs = wsAll.map((w, i) => (w.p !== 0n ? i : -1)).filter((i) => i >= 0);
      if (idxs.length < 2 || idxs.length > ZYGON_MAX_TERMS) return;
      if (idxs.every((i) => (wsAll[i]!.p === 1n || wsAll[i]!.p === -1n) && wsAll[i]!.q === 1n) && b.p === 0n) return; // KEPHALAION
      const cols2 = idxs.map((i) => solSrcCols[i]!);
      const ws = idxs.map((i) => wsAll[i]!);
      const v = verifyLin(cols2, tgt, ws, b, render, work);
      if (!v) return;
      const cost = ws.reduce((acc, w) => acc + ratText(w).length * 4 + burden(w), 0)
        + (b.p === 0n ? 0 : ratText(b).length * 4 + burden(b))
        + v.exceptions.length * 30;
      if (!best || cost < best.cost) {
        best = {
          terms: cols2.map((c, i) => ({ col: c.col, w: ws[i]! })),
          b, mode: v.mode, exceptions: v.exceptions, cost,
        };
      }
    };
    finish(ws0, b0);
    for (let kDec = 0; kDec <= 6; kDec++) {
      const wsd = decimalRoundVec(ws0, kDec);
      const bPlaces = Math.max(kDec, tgt.scale);
      const bd = b0.p === 0n ? b0 : rat(roundRat(b0.p * pow10(bPlaces), b0.q, 'half-up'), pow10(bPlaces));
      finish(wsd, bd);
      if (work.n > ZYGON_MAX_WORK) break;
    }
    if (best) return best;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reduced text / restore
// ---------------------------------------------------------------------------

function buildReduced(table: ParsedTable, spec: ZygonSpec): string {
  const dropSet = new Set(spec.drops.map((d) => d.col));
  const out: string[] = [];
  for (let r = 0; r < table.rows.length; r++) {
    const fields = table.rows[r]!.fields.filter((_, j) => !dropSet.has(j));
    out.push(fields.join(table.delimiter) + table.eols[r]);
  }
  return out.join('');
}

function renderFieldSimple(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function zygonRestore(reducedText: string, spec: ZygonSpec): string {
  const reduced = parseTable(reducedText, spec.delimiter, 0, 1);
  if (!reduced) throw new Error('ZYGON reduced text is not a parseable table');
  const H = spec.headerRow;
  const R = reduced.rows.length - H - 1;
  const drops = [...spec.drops].sort((x, y) => x.col - y.col);
  const ridx = (c: number): number => {
    let shift = 0;
    for (const d of drops) if (d.col < c) shift++;
    return c - shift;
  };
  const finished: string[][] = reduced.rows.map((r) => [...r.fields]);
  for (const d of drops) {
    const ws: Rat[] = d.terms.map((t) => ({ p: BigInt(t.w.p), q: BigInt(t.w.q) }));
    const b: Rat = { p: BigInt(d.b.p), q: BigInt(d.b.q) };
    const exc = new Map(d.exceptions.map((e) => [e.row, e.text]));
    for (let i = 0; i < R; i++) {
      if (exc.has(i)) {
        finished[i + H + 1]!.splice(d.col, 0, exc.get(i)!);
        continue;
      }
      const rowVals = d.terms.map((t) => {
        const s = reduced.rows[i + H + 1]!.values[ridx(t.col)]!;
        const px = parseStyled(s, spec.style, spec.grouped);
        if (!px) throw new Error('ZYGON unparseable source cell');
        return cellRat(px.v, px.scale);
      });
      const v = predictLin(ws, rowVals, b, d.scale, d.mode);
      finished[i + H + 1]!.splice(d.col, 0, renderStyled(v, d.scale, spec.style, spec.grouped));
    }
    finished[H]!.splice(d.col, 0, renderFieldSimple(d.headerName, spec.delimiter));
    for (const ld of spec.leadDropped) {
      if (ld.col === d.col) finished[ld.row]!.splice(d.col, 0, ld.field);
    }
  }
  const out: string[] = [];
  for (let r = 0; r < reduced.rows.length; r++) out.push(finished[r]!.join(spec.delimiter) + reduced.eols[r]);
  return out.join('');
}

// ---------------------------------------------------------------------------
// Contract (equal weights grouped)
// ---------------------------------------------------------------------------

function delimName(d: string): string {
  return d === ',' ? 'comma' : d === '\t' ? 'tab' : d === ';' ? 'semicolon' : 'pipe';
}

function buildContract(table: ParsedTable, spec: ZygonSpec): string {
  const header = table.rows[spec.headerRow]!.values;
  const nameOk = (col: number): boolean => {
    const name = header[col]!;
    return name !== '' && !/[{}\"]/.test(name) && header.filter((x) => x === name).length === 1;
  };
  const ref = (col: number): string => (nameOk(col) ? `{${header[col]!}}` : `field ${col + 1}`);
  const drops = [...spec.drops].sort((x, y) => x.col - y.col);
  const items = drops.map((d) => {
    // group terms by identical weight text
    const groups = new Map<string, { wTxt: string; w: Rat; cols: number[] }>();
    for (const t of d.terms) {
      const w: Rat = { p: BigInt(t.w.p), q: BigInt(t.w.q) };
      const key = `${w.p}/${w.q}`;
      if (!groups.has(key)) groups.set(key, { wTxt: ratText(w), w, cols: [] });
      groups.get(key)!.cols.push(t.col);
    }
    const parts: string[] = [];
    for (const g of groups.values()) {
      const inner = g.cols.map(ref).join(' + ');
      parts.push(g.cols.length > 1 ? `${g.wTxt}×(${inner})` : `${g.wTxt}×${inner}`);
    }
    const b: Rat = { p: BigInt(d.b.p), q: BigInt(d.b.q) };
    let expr = parts.join(' + ');
    if (b.p !== 0n) expr += ` + (${ratText(b)})`;
    const tgt = d.headerName !== '' ? `field ${d.col + 1} "${d.headerName}"` : `field ${d.col + 1} (empty name)`;
    const dec = d.scale === 0 ? '0 decimals' : `${d.scale} decimals`;
    const truncMark = d.mode === 'trunc' ? 'T' : '';
    const exc = d.exceptions.length
      ? ` [except ${d.exceptions.map((e) => `data row ${e.row + 1} = ${e.text}`).join(', ')}]`
      : '';
    return `${tgt}: ${expr} (${dec})${truncMark}${exc}`;
  });
  const anyTrunc = drops.some((d) => d.mode === 'trunc');
  const truncNote = anyTrunc ? ' Fields marked T truncate toward zero instead of rounding.' : '';
  const styleNote = spec.style === 'de'
    ? ' Numbers are German format (1.234,56: dot-grouped thousands, comma point); compute and write in that format.'
    : '';
  const leadNote = spec.headerRow > 0
    ? ` The header is line ${spec.headerRow + 1}; line(s) above it also regain the inserted fields: ${spec.leadDropped.map((ld) => `line ${ld.row + 1} field ${ld.col + 1} = ${ld.field === '' ? '(empty)' : ld.field}`).join(', ') || '(cells as in the decoded lead lines)'}.`
    : '';
  return `ZYGON: after decoding below, in the ${delimName(spec.delimiter)}-separated table insert as header field and value in every row: ${items.join('; ')}. Round each computed value to the stated decimals, halves away from zero.${truncNote}${leadNote} {x} means that row's decoded {x}.${styleNote} Change nothing else.`;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function zygonPlan(text: string, enc: EncodingName = 'o200k_base'): ZygonPlan | null {
  if (text.length === 0 || text.length > ZYGON_MAX_CHARS) return null;
  const work = { n: 0 };

  for (const delim of [',', '\t', ';', '|']) {
    const table = parseTable(text, delim, ZYGON_MIN_DATA_ROWS, 3);
    if (!table) continue;
    for (const headerRow of [0, 1]) {
    if (table.rows.length < headerRow + ZYGON_MIN_DATA_ROWS + 1) continue;
    const header = table.rows[headerRow]!.values;
    const nCols = header.length;
    const dataVals: string[][] = [];
    for (let c = 0; c < nCols; c++) dataVals.push(table.rows.slice(headerRow + 1).map((r) => r.values[c]!));

    const styleCands: { style: ZygonStyle; grouped: boolean }[] = [{ style: 'plain', grouped: false }];
    if (delim !== ',') styleCands.push({ style: 'de', grouped: true }, { style: 'de', grouped: false });

    for (const { style, grouped } of styleCands) {
      const nums: NumColInfo[] = [];
      for (let c = 0; c < nCols; c++) {
        const pc = parseColumn(dataVals[c]!, style, grouped);
        if (pc && pc.scale <= 6) nums.push({ col: c, cells: pc.cells, scale: pc.scale });
      }
      if (nums.length < 3) continue;

      const fits: ZygonDrop[] = [];
      for (const tgt of nums) {
        if (tgt.cells.some((c) => c === null)) continue;
        if (renderFieldSimple(header[tgt.col]!, delim) !== table.rows[headerRow]!.fields[tgt.col]) continue;
        if (/[{}";]/.test(header[tgt.col]!)) continue;
        const render = (v: bigint): string => renderStyled(v, tgt.scale, style, grouped);
        let renderOk = true;
        for (let i = 0; i < tgt.cells.length; i++) {
          if (render(tgt.cells[i]!) !== dataVals[tgt.col]![i]) { renderOk = false; break; }
        }
        if (!renderOk) continue;
        const srcs = nums.filter((s) => s.col !== tgt.col);
        const f = fitLinear(srcs, tgt, render, work);
        if (work.n > ZYGON_MAX_WORK) return null;
        if (f) {
          fits.push({
            col: tgt.col, headerName: header[tgt.col]!,
            terms: f.terms.map((t) => ({ col: t.col, w: { p: t.w.p.toString(), q: t.w.q.toString() } })),
            b: { p: f.b.p.toString(), q: f.b.q.toString() },
            mode: f.mode, scale: tgt.scale, exceptions: f.exceptions,
          });
        }
      }
      if (fits.length === 0) continue;

      const scoreOf = (drops: ZygonDrop[]): { score: number; plan: ZygonPlan } | null => {
        const leadDropped: ZygonSpec['leadDropped'] = [];
        for (let r = 0; r < headerRow; r++)
          for (const d of drops) leadDropped.push({ row: r, col: d.col, field: table.rows[r]!.fields[d.col]! });
        const spec: ZygonSpec = { v: 1, delimiter: delim, style, grouped, headerRow, leadDropped, drops };
        const reducedText = buildReduced(table, spec);
        let restored: string;
        try { restored = zygonRestore(reducedText, spec); } catch { return null; }
        if (restored !== text) return null;
        const contract = buildContract(table, spec);
        const score = countTokens(contract, enc) + countTokens(reducedText, enc);
        return { score, plan: { spec, reducedText, contract } };
      };

      const chosen: ZygonDrop[] = [];
      const usedSrc = new Set<number>();
      let chosenPlan: ZygonPlan | null = null;
      let chosenScore = countTokens(text, enc);
      while (chosen.length < ZYGON_MAX_DROPS) {
        let roundBest: { score: number; plan: ZygonPlan; drop: ZygonDrop } | null = null;
        for (const drop of fits) {
          if (chosen.some((d) => d.col === drop.col)) continue;
          if (usedSrc.has(drop.col)) continue;
          if (drop.terms.some((t) => chosen.some((d) => d.col === t.col))) continue;
          const cand = scoreOf([...chosen, drop]);
          if (cand && cand.score < chosenScore && (!roundBest || cand.score < roundBest.score)) {
            roundBest = { ...cand, drop };
          }
        }
        if (!roundBest) break;
        chosen.push(roundBest.drop);
        for (const t of roundBest.drop.terms) usedSrc.add(t.col);
        chosenScore = roundBest.score;
        chosenPlan = roundBest.plan;
      }
      if (chosenPlan) return chosenPlan;
    }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (house construction)
// ---------------------------------------------------------------------------

export interface ZygonResult {
  codec: 'zygon';
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
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateParentTokens: number | null;
  candidateParentCodec: string | null;
  candidateParentCosts: Record<string, number> | null;
  comparison: string;
  notes: string;
  ms: number;
}

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
  if (!parent.exact || parent.decoded !== text) {
    // inexact parents are not lossless bars: price them as identity so the
    // gate never throws and never crowns a lossy message (X58 ewf lane)
    const idTokens = countTokens(text, enc);
    return { wire: text, message: text, decoded: text, messageTokens: idTokens, parentCodec: 'identity', parentCosts: { akolouthia2: idTokens } };
  }
  if (directTokens !== parent.messageTokens) {
    throw new Error('ZYGON AKOLOUTHIA-2 parent reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text) {
    const idTokens = countTokens(text, enc);
    return { wire: text, message: text, decoded: text, messageTokens: idTokens, parentCodec: 'identity', parentCosts: { daedalus: idTokens } };
  }
  if (directTokens !== parent.messageTokens) {
    throw new Error('ZYGON DAEDALUS parent reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) {
    const idTokens = countTokens(text, enc);
    return { wire: text, message: text, decoded: text, messageTokens: idTokens, parentCodec: 'identity', parentCosts: { apographe: idTokens } };
  }
  return { wire: parent.wire, message, decoded, messageTokens: directTokens, parentCodec: 'apographe', parentCosts: { apographe: directTokens } };
}

function bestMeasuredParent(text: string, enc: EncodingName): MeasureParent {
  const candidates = [measuredDaedalus(text, enc), measuredAkolouthia2(text, enc), measuredApographe(text, enc)];
  candidates.sort((a, b) => a.messageTokens - b.messageTokens);
  const costs: Record<string, number> = {};
  for (const c of candidates) Object.assign(costs, c.parentCosts);
  return { ...candidates[0]!, parentCosts: costs };
}

function frontierEncode(
  text: string,
  enc: EncodingName,
): { tokens: number; tagstack: TagstackResult; sibling: SiblingTemplateResult; comparison: string } {
  const tagstack = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tagstack);
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('ZYGON frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('ZYGON TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('ZYGON SIBLING reported cost disagreed');
  return {
    tokens: Math.min(frontierTokens, tagTokens, siblingTokens),
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function zygonEncode(text: string, enc: EncodingName = 'o200k_base'): ZygonResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = zygonPlan(text, enc);
  const sourceAkolouthia2 = measuredAkolouthia2(text, enc);
  const sourceApographe = measuredApographe(text, enc);
  const precheckParentTokens = Math.min(sourceAkolouthia2.messageTokens, sourceApographe.messageTokens);
  const measuredFallback = (): MeasureParent => {
    const sourceDaedalus = measuredDaedalus(text, enc);
    const all = [sourceAkolouthia2, sourceApographe, sourceDaedalus].sort((a, b) => a.messageTokens - b.messageTokens);
    const costs: Record<string, number> = {};
    for (const c of all) Object.assign(costs, c.parentCosts);
    return { ...all[0]!, parentCosts: costs };
  };
  const fallbackResult = (
    candidateTokens: number | null,
    candidateExact: boolean | null,
    candidateParent: MeasureParent | null,
    fullFrontierMeasured: boolean,
    parentTokensForResult: number,
    comparison: string,
    notes: string,
  ): ZygonResult => {
    const parent = measuredFallback();
    return {
      codec: 'zygon',
      wire: parent.wire,
      message: parent.message,
      decoded: parent.decoded,
      exact: parent.decoded === text,
      inTokens,
      precheckParentTokens,
      parentTokens: parentTokensForResult,
      messageTokens: parent.messageTokens,
      parentCodec: parent.parentCodec,
      parentCosts: parent.parentCosts,
      fullFrontierMeasured,
      applied: false,
      candidateTokens,
      candidateExact,
      candidateParentTokens: candidateParent?.messageTokens ?? null,
      candidateParentCodec: candidateParent?.parentCodec ?? null,
      candidateParentCosts: candidateParent?.parentCosts ?? null,
      comparison,
      notes,
      ms: Date.now() - started,
    };
  };

  if (!plan) {
    return fallbackResult(null, null, null, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'no weighted-sum drop was found; returned the measured best direct parent');
  }

  const candidateParent = bestMeasuredParent(plan.reducedText, enc);
  const candidateMessage = plan.contract + '\n' + candidateParent.message;
  const candidateDecoded = zygonRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'the ZYGON candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured');
  }

  const frontier = frontierEncode(text, enc);
  if (candidateTokens >= frontier.tokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, true, frontier.tokens, frontier.comparison, 'the ZYGON candidate did not beat the full measured frontier; returned the measured best direct parent');
  }

  const shape = plan.spec.drops.map((d) => `f${d.col + 1}(${d.terms.length}t)`).join(',');
  return {
    codec: 'zygon',
    wire: candidateParent.wire,
    message: candidateMessage,
    decoded: candidateDecoded,
    exact: candidateExact,
    inTokens,
    precheckParentTokens,
    parentTokens: frontier.tokens,
    messageTokens: candidateTokens,
    parentCodec: candidateParent.parentCodec,
    parentCosts: candidateParent.parentCosts,
    fullFrontierMeasured: true,
    applied: true,
    candidateTokens,
    candidateExact,
    candidateParentTokens: candidateParent.messageTokens,
    candidateParentCodec: candidateParent.parentCodec,
    candidateParentCosts: candidateParent.parentCosts,
    comparison: frontier.comparison,
    notes: `dropped weighted-sum columns (${shape}); complete-message M=${candidateTokens} < same-source frontier M=${frontier.tokens}`,
    ms: Date.now() - started,
  };
}
