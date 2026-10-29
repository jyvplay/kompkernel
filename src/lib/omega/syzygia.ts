/**
 * src/lib/omega/syzygia.ts
 * =============================================================================
 * SYZYGIA (συζυγία — a yoking together, a conjugate pair) — affine-twin
 * elision for delimited tables, with ±1-ulp residual correction. X57.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * Read the dependency unions from source: SYLLOGISMOS offers one binary op
 * (A+B, A−B, A×B, A÷B, 100A/B), a pure proportional law (scaleK: y = K·x),
 * copies and lookups; TAXIS adds fitted-total percents; APOGRAPHE offers
 * one-step predictors {above, col, days, workdays, int (above+b), lin
 * (affine in the row INDEX), clock}; ATHROISMOS/KEPHALAION cover recurrences
 * and sums. The affine map between two COLUMNS, y = a·x + b with a ≠ 1 and
 * b ≠ 0, is expressible by none of them: scaleK has no intercept, arith
 * cannot chain two ops, lin's slope multiplies the row index rather than a
 * sibling column. Everyday expressions live exactly in that corner: dual-
 * unit exports (WeatherAPI and every weather API's CSV dumps print temp_c
 * AND temp_f, wind_mph AND wind_kph, pressure_mb AND pressure_in, …),
 * °C/°F/K triples, calibrated sensor pairs (value = raw·gain + offset),
 * net/gross price columns with a fixed fee.
 *
 * THE TWIN-ROUNDING TWIST
 * -----------------------------------------------------------------------------
 * Measuring real dual-unit exports kills the naive exact form: the API
 * computes BOTH columns from one unrounded quantity and rounds each for
 * print, so round(1.8·printed_C + 32) disagrees with printed_F by one
 * last-digit unit on 15–45% of rows (X57 fixture: temp pair 38/124 rows).
 * The printed twin is therefore not redundant — but it is *almost*: its
 * entire information beyond the affine law is a ternary rounding residual
 * (−1, 0, +1 last-place units). SYZYGIA fits (a, b, rounding mode) exactly
 * in BigInt rational arithmetic such that every row's residual lies in
 * {−1, 0, +1} ulp, drops the target column, and ships one residual
 * character per data row (+ add one ulp, − subtract, . none) on a `§N`
 * line under the reduced table. When a pair is exactly affine (conversion
 * tables computed-then-rounded once), all residuals are zero and no § line
 * ships. No existing mechanism ships bounded residuals against a fitted
 * law: APOGRAPHE's `int` writes each exact delta in full; ATHROISMOS
 * exceptions are sparse full-value overrides; this is the rounding
 * disagreement of two roundings of one hidden exact value, priced at one
 * character per cell instead of the whole printed float.
 *
 * READER PROTOCOL
 * -----------------------------------------------------------------------------
 * Stateless per row: compute a·x + b from the row's decoded source cell,
 * round as stated (half away from zero, or toward zero), then nudge by
 * the row's residual character. The multiply-add is the same burden class
 * as SYLLOGISMOS' scaleK; the residual consumption is one character per
 * row in order, like a KOLUMN stream. No carried state: a slip damages
 * one cell. Whole-input byte-exact restore arbitrates in the encoder; the
 * reduced text is coded by the cheapest measured of DAEDALUS /
 * AKOLOUTHIA-2 / APOGRAPHE and the candidate must beat AKOLOUTHIA-2 +
 * APOGRAPHE on the source, then the full TAGSTACK + SIBLING frontier
 * strictly, else the measured best parent is returned.
 *
 * Prior art, honestly: affine/functional dependencies are database
 * classics (Kossmann et al., VLDB Journal 2022); approximate functional
 * dependencies measure exception rates but still ship exceptions verbatim
 * in bit-level systems nobody reads in a chat. For fitted affine twins
 * with a ±1-ulp residual alphabet taught in-band for one-chat LLM
 * recomputation: no paper stands behind this mechanism; citation: none.
 *
 * Greedy/search: per ordered column pair, (a, b, mode) candidates are
 * enumerated from exact two-point rational fits and their decimal
 * roundings, verified over every row with the ≤1-ulp residual bound;
 * drops are added greedily by true rendered contract + reduced-text
 * tokens (≤8 drops, sources never dropped); emission is the measured
 * gate. Time/CPU: CPU-bound; planner bounded by caps and SYZYGIA_MAX_WORK;
 * parents/frontier dominate wall-clock, deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const SYZYGIA_MAX_CHARS = 400_000;
export const SYZYGIA_MAX_ROWS = 20_000;
export const SYZYGIA_MAX_COLS = 64;
export const SYZYGIA_MIN_DATA_ROWS = 8;
export const SYZYGIA_MAX_DROPS = 8;
export const SYZYGIA_MAX_WORK = 120_000_000;

// ---------------------------------------------------------------------------
// CSV parsing (single-line records; raw spans preserved) — house template
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
  if (rows.length < minDataRows + 1 || rows.length > SYZYGIA_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < minCols || cols > SYZYGIA_MAX_COLS) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Number styles (plain / German), exact scaled BigInt — house template
// ---------------------------------------------------------------------------

export type SyzygiaStyle = 'plain' | 'de';

const PLAIN_RE = /^-?(\d+)(?:\.(\d+))?$/;
const DE_GROUPED_RE = /^-?(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/;
const DE_PLAIN_RE = /^-?(\d+)(?:,(\d+))?$/;

function parseStyled(s: string, style: SyzygiaStyle, grouped: boolean): { v: bigint; scale: number } | null {
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

function renderStyled(v: bigint, scale: number, style: SyzygiaStyle, grouped: boolean): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let intPart = scale === 0 ? a : a.slice(0, a.length - scale);
  const fracPart = scale === 0 ? '' : a.slice(a.length - scale);
  if (style === 'de' && grouped) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sep = style === 'de' ? ',' : '.';
  return (neg ? '-' : '') + intPart + (scale === 0 ? '' : sep + fracPart);
}

function parseColumn(
  values: string[], style: SyzygiaStyle, grouped: boolean,
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
// Exact rational helpers
// ---------------------------------------------------------------------------

interface Rat { p: bigint; q: bigint } // q > 0, reduced

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

const pow10 = (k: number): bigint => 10n ** BigInt(k);

/** Round the rational num/den (den>0) to an integer. 'half-up' = halves away from zero; 'trunc' = toward zero. */
function roundRat(num: bigint, den: bigint, mode: 'half-up' | 'trunc'): bigint {
  if (mode === 'trunc') return num / den;
  const neg = num < 0n;
  const a = neg ? -num : num;
  const q = a / den;
  const r = a % den;
  const up = r * 2n >= den ? q + 1n : q;
  return neg ? -up : up;
}

/** Decimal string for a rational when it terminates within maxPlaces, else null. */
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

/** Contract rendering of a rational: decimal if it terminates shortly, else p/q. */
function ratText(r: Rat): string {
  const d = ratToDecimal(r, 10);
  if (d !== null) return d;
  return `${r.p}/${r.q}`;
}

/** All decimal roundings/truncations of r at 0..maxPlaces places (deduped). */
function decimalCandidates(r: Rat, maxPlaces: number): Rat[] {
  const out = new Map<string, Rat>();
  for (let k = 0; k <= maxPlaces; k++) {
    const scaledNum = r.p * pow10(k);
    for (const mode of ['half-up', 'trunc'] as const) {
      const v = roundRat(scaledNum, r.q, mode);
      const cand = rat(v, pow10(k));
      out.set(`${cand.p}/${cand.q}`, cand);
    }
  }
  return [...out.values()];
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export interface SyzygiaDrop {
  /** finished-table index of the dropped (target) column */
  col: number;
  headerName: string;
  /** finished-table index of the kept source column */
  src: number;
  /** slope a (rational) */
  a: { p: string; q: string };
  /** intercept b (rational) */
  b: { p: string; q: string };
  mode: 'half-up' | 'trunc';
  /** target scale (decimals) */
  scale: number;
  /** residual string over {'.','-','+'} per data row, or null when exact */
  residuals: string | null;
}

export interface SyzygiaSpec {
  v: 1;
  delimiter: string;
  style: SyzygiaStyle;
  grouped: boolean;
  drops: SyzygiaDrop[];
}

export interface SyzygiaPlan {
  spec: SyzygiaSpec;
  reducedText: string;
  contract: string;
}

// ---------------------------------------------------------------------------
// Fitting one ordered pair (src -> tgt)
// ---------------------------------------------------------------------------

interface NumColInfo { col: number; cells: (bigint | null)[]; scale: number }

interface PairFit {
  a: Rat; b: Rat; mode: 'half-up' | 'trunc';
  residuals: string | null; // null = exact
  clauseChars: number;      // pricing proxy: constant text length + residual length
  nonzero: number;
}

/** Predict target ulp value: round_mode(a*x + b) at target scale. */
function predict(a: Rat, b: Rat, x: bigint, xScale: number, yScale: number, mode: 'half-up' | 'trunc'): bigint {
  // value = a * (x / 10^xScale) + b ; want round(value * 10^yScale)
  // num/den = a.p*x*10^yScale / (a.q*10^xScale) + b.p*10^yScale / b.q
  const d1 = a.q * pow10(xScale) * b.q;
  const n = a.p * x * pow10(yScale) * b.q + b.p * pow10(yScale) * a.q * pow10(xScale);
  return roundRat(n, d1, mode);
}

function evalPair(
  src: NumColInfo, tgt: NumColInfo, a: Rat, b: Rat, work: { n: number },
): { mode: 'half-up' | 'trunc'; residuals: string; nonzero: number } | null {
  for (const mode of ['half-up', 'trunc'] as const) {
    let chars = '';
    let nonzero = 0;
    let ok = true;
    for (let i = 0; i < tgt.cells.length; i++) {
      work.n++;
      if (work.n > SYZYGIA_MAX_WORK) return null;
      const pred = predict(a, b, src.cells[i]!, src.scale, tgt.scale, mode);
      const res = tgt.cells[i]! - pred;
      if (res === 0n) chars += '.';
      else if (res === 1n) { chars += '+'; nonzero++; }
      else if (res === -1n) { chars += '-'; nonzero++; }
      else { ok = false; break; }
    }
    if (ok) return { mode, residuals: chars, nonzero };
  }
  return null;
}

function fitPair(src: NumColInfo, tgt: NumColInfo, work: { n: number }): PairFit | null {
  const R = tgt.cells.length;
  if (src.cells.some((c) => c === null) || tgt.cells.some((c) => c === null)) return null;
  const xs = src.cells as bigint[];
  const ys = tgt.cells as bigint[];
  // distinct-x probe rows
  const probe: number[] = [];
  const seenX = new Set<string>();
  for (let i = 0; i < R && probe.length < 10; i++) {
    const k = xs[i]!.toString();
    if (!seenX.has(k)) { seenX.add(k); probe.push(i); }
  }
  if (probe.length < 3) return null;
  if (new Set(ys.map((v) => v.toString())).size < 3) return null;

  // exact two-point slopes as rationals in true value space:
  // a = (dy / 10^yScale) / (dx / 10^xScale) = dy*10^xScale / (dx*10^yScale)
  const slopeSet = new Map<string, Rat>();
  for (let i = 0; i < probe.length; i++) {
    for (let j = i + 1; j < probe.length; j++) {
      const dx = xs[probe[j]!]! - xs[probe[i]!]!;
      if (dx === 0n) continue;
      const dy = ys[probe[j]!]! - ys[probe[i]!]!;
      const s = rat(dy * pow10(src.scale), dx * pow10(tgt.scale));
      slopeSet.set(`${s.p}/${s.q}`, s);
    }
  }
  const aCands = new Map<string, Rat>();
  for (const s of slopeSet.values()) {
    if (s.p === 0n) continue;
    // exact fraction when presentable
    if (s.q <= 10000n && s.p.toString().replace('-', '').length <= 9) aCands.set(`${s.p}/${s.q}`, s);
    for (const d of decimalCandidates(s, 8)) if (d.p !== 0n) aCands.set(`${d.p}/${d.q}`, d);
  }

  const holder: { best: PairFit | null } = { best: null };
  const considerFit = (a: Rat, b: Rat) => {
    if (a.p === 1n && a.q === 1n && b.p === 0n) return; // duplicate column: APOGRAPHE 'col' owns it
    const ev = evalPair(src, tgt, a, b, work);
    if (!ev) return;
    // Reader-burden-aware pricing among verified fits: finite decimals and
    // single-digit fractions (5/9) are cheap to execute by hand; arbitrary
    // fractions (24/43) and dense residual strings are not. Planner-side
    // preference only — emission is still decided by true token count.
    const burden = (r: Rat): number => {
      if (ratToDecimal(r, 10) !== null) return 0;
      const small = r.q <= 9n && r.p >= -99n && r.p <= 99n;
      return small ? 8 : 40;
    };
    const clauseChars = (ratText(a).length + ratText(b).length) * 4
      + burden(a) + burden(b) + ev.nonzero * 2 + (ev.nonzero === 0 ? 0 : 40);
    const cur = holder.best;
    if (!cur || clauseChars < cur.clauseChars || (clauseChars === cur.clauseChars && ev.nonzero < cur.nonzero)) {
      holder.best = { a, b, mode: ev.mode, residuals: ev.nonzero === 0 ? null : ev.residuals, clauseChars, nonzero: ev.nonzero };
    }
  };

  for (const a of aCands.values()) {
    if (work.n > SYZYGIA_MAX_WORK) break;
    // b candidates: per probe row b_i = y_i - a*x_i (value space), exact + decimal roundings
    const bSet = new Map<string, Rat>();
    for (const i of probe) {
      // b = ys/10^ys - a*(xs/10^xs)
      const num = ys[i]! * a.q * pow10(src.scale) - a.p * xs[i]! * pow10(tgt.scale);
      const den = pow10(tgt.scale) * a.q * pow10(src.scale);
      const bi = rat(num, den);
      if (bi.q <= 10000n) bSet.set(`${bi.p}/${bi.q}`, bi);
      for (const d of decimalCandidates(bi, tgt.scale + 6)) bSet.set(`${d.p}/${d.q}`, d);
    }
    for (const b of bSet.values()) {
      considerFit(a, b);
      if (work.n > SYZYGIA_MAX_WORK) break;
      // early exit: exact fit with short constants cannot be beaten materially
      const hb = holder.best;
      if (hb && hb.nonzero === 0 && ratText(hb.a).length + ratText(hb.b).length <= 8) return hb;
    }
  }
  return holder.best;
}

// ---------------------------------------------------------------------------
// Reduced text / restore
// ---------------------------------------------------------------------------

function residualBlock(spec: SyzygiaSpec): string {
  const lines = spec.drops.filter((d) => d.residuals !== null)
    .sort((x, y) => x.col - y.col)
    .map((d) => `§${d.col + 1} ${d.residuals}`);
  return lines.join('\n');
}

function buildReduced(table: ParsedTable, spec: SyzygiaSpec): string {
  const dropSet = new Set(spec.drops.map((d) => d.col));
  const out: string[] = [];
  for (let r = 0; r < table.rows.length; r++) {
    const fields = table.rows[r]!.fields.filter((_, j) => !dropSet.has(j));
    out.push(fields.join(table.delimiter) + table.eols[r]);
  }
  let text = out.join('');
  const block = residualBlock(spec);
  if (block) {
    if (!text.endsWith('\n')) text += '\n';
    text += block + '\n';
  }
  return text;
}

function renderFieldSimple(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function syzygiaRestore(reducedText: string, spec: SyzygiaSpec): string {
  // strip the residual block: it is the exact suffix buildReduced appended
  const block = residualBlock(spec);
  let body = reducedText;
  const residByCol = new Map<number, string>();
  if (block) {
    const suffix = block + '\n';
    if (!body.endsWith(suffix)) throw new Error('SYZYGIA reduced text lacks its residual block');
    body = body.slice(0, body.length - suffix.length);
    // parse residual lines from spec (authoritative) — body may now end with a
    // separator newline buildReduced added when the table had no trailing one;
    // parseTable tolerates a single trailing empty segment.
    for (const d of spec.drops) if (d.residuals !== null) residByCol.set(d.col, d.residuals);
  }
  const reduced = parseTable(body, spec.delimiter, 1, 1);
  if (!reduced) throw new Error('SYZYGIA reduced text is not a parseable table');
  const R = reduced.rows.length - 1;
  const drops = [...spec.drops].sort((x, y) => x.col - y.col);
  const dropSet = new Set(drops.map((d) => d.col));
  // map finished col -> reduced col
  const ridx = (c: number): number => {
    let shift = 0;
    for (const d of drops) if (d.col < c) shift++;
    return c - shift;
  };
  const finished: string[][] = reduced.rows.map((r) => [...r.fields]);
  // insert drops left-to-right into the finished layout
  for (const d of drops) {
    const a: Rat = { p: BigInt(d.a.p), q: BigInt(d.a.q) };
    const b: Rat = { p: BigInt(d.b.p), q: BigInt(d.b.q) };
    const resid = residByCol.get(d.col) ?? null;
    if (resid !== null && resid.length !== R) throw new Error('SYZYGIA residual length mismatch');
    // source scale: derive from first parseable cell
    for (let i = 0; i < R; i++) {
      const s = reduced.rows[i + 1]!.values[ridx(d.src)]!;
      const px = parseStyled(s, spec.style, spec.grouped);
      if (!px) throw new Error('SYZYGIA unparseable source cell');
      let v = predict(a, b, px.v, px.scale, d.scale, d.mode);
      if (resid !== null) {
        const ch = resid[i]!;
        if (ch === '+') v += 1n;
        else if (ch === '-') v -= 1n;
        else if (ch !== '.') throw new Error('SYZYGIA bad residual char');
      }
      finished[i + 1]!.splice(d.col, 0, renderStyled(v, d.scale, spec.style, spec.grouped));
    }
    finished[0]!.splice(d.col, 0, renderFieldSimple(d.headerName, spec.delimiter));
    void dropSet;
  }
  const out: string[] = [];
  for (let r = 0; r < reduced.rows.length; r++) out.push(finished[r]!.join(spec.delimiter) + reduced.eols[r]);
  return out.join('');
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

function delimName(d: string): string {
  return d === ',' ? 'comma' : d === '\t' ? 'tab' : d === ';' ? 'semicolon' : 'pipe';
}

function buildContract(table: ParsedTable, spec: SyzygiaSpec): string {
  const header = table.rows[0]!.values;
  const nameOk = (col: number): boolean => {
    const name = header[col]!;
    return name !== '' && !/[{}\"]/.test(name) && header.filter((x) => x === name).length === 1;
  };
  const ref = (col: number): string => (nameOk(col) ? `{${header[col]!}}` : `field ${col + 1}`);
  const drops = [...spec.drops].sort((x, y) => x.col - y.col);
  const items = drops.map((d) => {
    const a: Rat = { p: BigInt(d.a.p), q: BigInt(d.a.q) };
    const b: Rat = { p: BigInt(d.b.p), q: BigInt(d.b.q) };
    const expr = b.p === 0n
      ? `${ratText(a)}×${ref(d.src)}`
      : `${ratText(a)}×${ref(d.src)}+(${ratText(b)})`;
    // the header name is payload and must ship even when duplicated (the
    // field NUMBER disambiguates placement); only an empty name ships bare
    const tgt = d.headerName !== '' ? `field ${d.col + 1} "${d.headerName}"` : `field ${d.col + 1} (empty name)`;
    const dec = d.scale === 0 ? '0 decimals' : `${d.scale} decimals`;
    const truncMark = d.mode === 'trunc' ? 'T' : '';
    return `${tgt}: ${expr} (${dec})${truncMark}`;
  });
  const anyTrunc = drops.some((d) => d.mode === 'trunc');
  const anyResid = drops.some((d) => d.residuals !== null);
  const residNote = anyResid
    ? ' Then correct each restored field by its \u00a7N line under the decoded table: one character per data row in order, + add one unit of the last decimal, - subtract one, . exact; a field with no \u00a7N line needs no correction.'
    : '';
  const truncNote = anyTrunc ? ' Fields marked T truncate toward zero instead of rounding.' : '';
  const styleNote = spec.style === 'de'
    ? ' Numbers are German format (1.234,56: dot-grouped thousands, comma point); compute and write in that format.'
    : '';
  return `SYZYGIA: after decoding below, in the ${delimName(spec.delimiter)}-separated table insert as header field and value in every row: ${items.join('; ')}. Round each computed value to the stated decimals, halves away from zero.${truncNote}${residNote} {x} means that row's decoded {x}.${styleNote} Change nothing else.`;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function syzygiaPlan(text: string, enc: EncodingName = 'o200k_base'): SyzygiaPlan | null {
  if (text.length === 0 || text.length > SYZYGIA_MAX_CHARS) return null;
  // A source line that already looks like a residual line would make the
  // appended §N block ambiguous to a from-contract reader: refuse.
  if (/(^|\n)\u00a7\d+ [-+.]+(\r?\n|$)/.test(text)) return null;
  const work = { n: 0 };

  for (const delim of [',', '\t', ';', '|']) {
    const table = parseTable(text, delim, SYZYGIA_MIN_DATA_ROWS, 2);
    if (!table) continue;
    const header = table.rows[0]!.values;
    const nCols = header.length;
    const dataVals: string[][] = [];
    for (let c = 0; c < nCols; c++) dataVals.push(table.rows.slice(1).map((r) => r.values[c]!));

    const styleCands: { style: SyzygiaStyle; grouped: boolean }[] = [{ style: 'plain', grouped: false }];
    if (delim !== ',') styleCands.push({ style: 'de', grouped: true }, { style: 'de', grouped: false });

    for (const { style, grouped } of styleCands) {
      const nums: NumColInfo[] = [];
      for (let c = 0; c < nCols; c++) {
        const pc = parseColumn(dataVals[c]!, style, grouped);
        if (pc && pc.scale <= 6) nums.push({ col: c, cells: pc.cells, scale: pc.scale });
      }
      if (nums.length < 2) continue;

      // eligible targets: fully present, canonically re-renderable
      const fits: { drop: SyzygiaDrop; fit: PairFit }[] = [];
      for (const tgt of nums) {
        if (tgt.cells.some((c) => c === null)) continue;
        // header name must round-trip through renderFieldSimple and be
        // stateable inside a contract item (quotes/braces/semicolons break it)
        if (renderFieldSimple(header[tgt.col]!, delim) !== table.rows[0]!.fields[tgt.col]) continue;
        if (/[{}";]/.test(header[tgt.col]!)) continue;
        let renderOk = true;
        for (let i = 0; i < tgt.cells.length; i++) {
          if (renderStyled(tgt.cells[i]!, tgt.scale, style, grouped) !== dataVals[tgt.col]![i]) { renderOk = false; break; }
        }
        if (!renderOk) continue;
        let bestFit: PairFit | null = null;
        let bestSrc: NumColInfo | null = null;
        for (const src of nums) {
          if (src.col === tgt.col) continue;
          if (src.cells.some((c) => c === null)) continue;
          const f = fitPair(src, tgt, work);
          if (work.n > SYZYGIA_MAX_WORK) return null;
          if (f && (!bestFit || f.clauseChars < bestFit.clauseChars)) { bestFit = f; bestSrc = src; }
        }
        if (bestFit && bestSrc) {
          fits.push({
            fit: bestFit,
            drop: {
              col: tgt.col, headerName: header[tgt.col]!, src: bestSrc.col,
              a: { p: bestFit.a.p.toString(), q: bestFit.a.q.toString() },
              b: { p: bestFit.b.p.toString(), q: bestFit.b.q.toString() },
              mode: bestFit.mode, scale: tgt.scale, residuals: bestFit.residuals,
            },
          });
        }
      }
      if (fits.length === 0) continue;

      const scoreOf = (drops: SyzygiaDrop[]): { score: number; plan: SyzygiaPlan } | null => {
        const spec: SyzygiaSpec = { v: 1, delimiter: delim, style, grouped, drops };
        const reducedText = buildReduced(table, spec);
        let restored: string;
        try { restored = syzygiaRestore(reducedText, spec); } catch { return null; }
        if (restored !== text) return null;
        const contract = buildContract(table, spec);
        const score = countTokens(contract, enc) + countTokens(reducedText, enc);
        return { score, plan: { spec, reducedText, contract } };
      };

      // greedy: add the drop that most reduces contract+reduced tokens
      const baseScore = countTokens(text, enc);
      const chosen: SyzygiaDrop[] = [];
      const usedSrc = new Set<number>();
      let chosenPlan: SyzygiaPlan | null = null;
      let chosenScore = baseScore;
      while (chosen.length < SYZYGIA_MAX_DROPS) {
        let roundBest: { score: number; plan: SyzygiaPlan; drop: SyzygiaDrop } | null = null;
        for (const { drop } of fits) {
          if (chosen.some((d) => d.col === drop.col)) continue;
          if (usedSrc.has(drop.col)) continue;                 // a kept source cannot be dropped
          if (chosen.some((d) => d.col === drop.src)) continue; // a dropped col cannot be a source
          const cand = scoreOf([...chosen, drop]);
          if (cand && cand.score < chosenScore && (!roundBest || cand.score < roundBest.score)) {
            roundBest = { ...cand, drop };
          }
        }
        if (!roundBest) break;
        chosen.push(roundBest.drop);
        usedSrc.add(roundBest.drop.src);
        chosenScore = roundBest.score;
        chosenPlan = roundBest.plan;
      }
      if (chosenPlan) return chosenPlan;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (house construction)
// ---------------------------------------------------------------------------

export interface SyzygiaResult {
  codec: 'syzygia';
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
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('SYZYGIA AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('SYZYGIA DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('SYZYGIA APOGRAPHE parent did not reconstruct');
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
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('SYZYGIA frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('SYZYGIA TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('SYZYGIA SIBLING reported cost disagreed');
  return {
    tokens: Math.min(frontierTokens, tagTokens, siblingTokens),
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function syzygiaEncode(text: string, enc: EncodingName = 'o200k_base'): SyzygiaResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = syzygiaPlan(text, enc);
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
  ): SyzygiaResult => {
    const parent = measuredFallback();
    return {
      codec: 'syzygia',
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
    return fallbackResult(null, null, null, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'no affine-twin drop was found; returned the measured best direct parent');
  }

  const candidateParent = bestMeasuredParent(plan.reducedText, enc);
  const candidateMessage = plan.contract + '\n' + candidateParent.message;
  const candidateDecoded = syzygiaRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'the SYZYGIA candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured');
  }

  const frontier = frontierEncode(text, enc);
  if (candidateTokens >= frontier.tokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, true, frontier.tokens, frontier.comparison, 'the SYZYGIA candidate did not beat the full measured frontier; returned the measured best direct parent');
  }

  const shape = plan.spec.drops.map((d) => `f${d.src + 1}->f${d.col + 1}`).join(',');
  return {
    codec: 'syzygia',
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
    notes: `dropped affine twins (${shape}); complete-message M=${candidateTokens} < same-source frontier M=${frontier.tokens}`,
    ms: Date.now() - started,
  };
}
