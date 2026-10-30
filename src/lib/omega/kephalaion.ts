/**
 * src/lib/omega/kephalaion.ts
 * =============================================================================
 * KEPHALAION (κεφάλαιον — "the main sum, the total" in Greek financial
 * usage) — aggregate elision for delimited tables. X55.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * The stack's table-dependency grid after X54: same-row functions
 * (SYLLOGISMOS/TAXIS), previous-row/index/copy predictors (APOGRAPHE,
 * METRON), driven recurrences (ATHROISMOS). SYLLOGISMOS' arithmetic is
 * strictly binary (A+B, A−B, A×B, A÷B, 100A/B, A·K — its rule union, read
 * from source this turn). Two everyday shapes fall outside all of it:
 *
 *   1. a Total COLUMN that is the n-ary sum of its row
 *      (TT = AA+AF+AM+…+Other over 13 region columns; Total Marks over
 *      five subjects; Active = Confirmed − Recovered − Deaths), and
 *   2. a Total ROW whose numeric cells are the sums of their columns
 *      (the "Total" line of every statewise/report table).
 *
 * Both are aggregates: functions of *many* cells — a whole row-segment
 * or a whole column — rather than of one or two neighbours. Their digits
 * are fresh arithmetic results, so dictionaries pay for them in full.
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * In exact BigInt decimal arithmetic (plain or German rendering,
 * per-cell re-render checks, optional target rescaling when the sum is
 * printed at coarser scale than its terms):
 *   - `rowsum`: target = sum of a fitted subset (≥2) of other numeric
 *     columns, empty terms = 0;
 *   - `headsum`: target = head − sum of a fitted subset (the net/active
 *     shape);
 *   - `colsum`: one aggregate row (first/last/labelled row) whose
 *     verifying numeric cells equal the sums of their columns over all
 *     other rows; those cells are blanked in the reduced text and
 *     refilled by the reader.
 * Rowsum/headsum allow up to KEPHALAION_MAX_EXCEPTIONS violating rows
 * (values shipped in the contract; real reports carry adjustments — the
 * X55 statewise fixture has exactly 3). A rowsum drop and a colsum may
 * compose (drop the Total column, blank the Total row); restoration
 * recomputes rowsums first, then column sums over the finished table.
 * Whole-input byte-exact restore arbitrates; the reduced text is coded
 * by the cheapest measured of DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE and
 * the complete candidate must beat AKOLOUTHIA-2 + APOGRAPHE on the
 * source, then the full TAGSTACK+SIBLING frontier strictly, else the
 * measured best parent is returned.
 *
 * READER PROTOCOL
 * -----------------------------------------------------------------------------
 * Unlike ATHROISMOS there is no carried state: each restored value is an
 * independent sum, so an arithmetic slip damages one cell only. The
 * burden is plain addition of up to ~13 numbers per row (rowsum) or one
 * long addition per column (colsum) — measured in blind decodes.
 *
 * Prior art, honestly: functional dependencies and their discovery are
 * database classics (survey: Kossmann et al., VLDB Journal 2022, DOI
 * 10.1007/s00778-021-00676-3; statistical FD discovery: FDX, SIGMOD
 * 2020). Window/aggregate functions in SQL are how such columns are
 * *produced*. Treating exact n-ary sums and aggregate rows as elision
 * rules taught in-band for one-chat LLM recomputation: no paper stands
 * behind this mechanism; citation: none.
 *
 * Greedy/search: subset fitting is exhaustive for ≤16 candidate term
 * columns (2^k with multi-row early pruning) and falls back to
 * contiguous ranges + all-columns beyond that; aggregate-row candidates
 * are first/last/labelled rows with per-cell verification; credit-side
 * ranking charges the true rendered contract; emission is the measured
 * frontier gate.
 *
 * Time/CPU: CPU-bound. Planner bounded by caps (rows × 2^terms × cols
 * with early abort, KEPHALAION_MAX_WORK); parents/frontier dominate
 * wall-clock with no wrapper-wide cap, so deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const KEPHALAION_MAX_CHARS = 400_000;
export const KEPHALAION_MAX_ROWS = 20_000;
export const KEPHALAION_MAX_COLS = 40;
export const KEPHALAION_MIN_DATA_ROWS = 6;
export const KEPHALAION_MAX_EXCEPTIONS = 3;
export const KEPHALAION_MAX_SUBSET_COLS = 16;
export const KEPHALAION_MAX_WORK = 80_000_000;

// ---------------------------------------------------------------------------
// CSV parsing (single-line records; raw spans preserved)
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
  if (rows.length < minDataRows + 1 || rows.length > KEPHALAION_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < minCols || cols > KEPHALAION_MAX_COLS) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Number styles (plain / German), exact scaled BigInt
// ---------------------------------------------------------------------------

export type KephalaionStyle = 'plain' | 'de';

const PLAIN_RE = /^-?(\d+)(?:\.(\d+))?$/;
const DE_GROUPED_RE = /^-?(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/;
const DE_PLAIN_RE = /^-?(\d+)(?:,(\d+))?$/;

function parseStyled(s: string, style: KephalaionStyle, grouped: boolean): { v: bigint; scale: number } | null {
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

function renderStyled(v: bigint, scale: number, style: KephalaionStyle, grouped: boolean): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let intPart = scale === 0 ? a : a.slice(0, a.length - scale);
  const fracPart = scale === 0 ? '' : a.slice(a.length - scale);
  if (style === 'de' && grouped) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sep = style === 'de' ? ',' : '.';
  return (neg ? '-' : '') + intPart + (scale === 0 ? '' : sep + fracPart);
}

/** Parse a column; uniform scale; empties -> null entries (null = absent). */
function parseColumn(
  values: string[], style: KephalaionStyle, grouped: boolean,
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

const rescale = (v: bigint, from: number, to: number): bigint =>
  from === to ? v : from < to ? v * 10n ** BigInt(to - from) : v / 10n ** BigInt(from - to);

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export interface KephalaionRowsum {
  /** finished-table index of the dropped column */
  col: number;
  headerName: string;
  /** plus-terms (finished-table indices) */
  terms: number[];
  /** head column for headsum form: target = head - sum(terms); null for pure rowsum */
  head: number | null;
  exceptions: { row: number; text: string }[];
}

export interface KephalaionColsum {
  /** data-row index (0-based) of the aggregate row */
  row: number;
  /** finished-table indices of blanked cells in that row */
  cols: number[];
}

export interface KephalaionSpec {
  v: 1;
  delimiter: string;
  style: KephalaionStyle;
  grouped: boolean;
  /** target scale for rowsum rendering (work scale = max term scale) */
  scale: number;
  rowsum: KephalaionRowsum | null;
  colsum: KephalaionColsum | null;
}

export interface KephalaionPlan {
  spec: KephalaionSpec;
  reducedText: string;
  contract: string;
}

// ---------------------------------------------------------------------------
// Fitting
// ---------------------------------------------------------------------------

interface NumColInfo { col: number; cells: (bigint | null)[]; scale: number }

interface RowsumFit { terms: number[]; head: number | null; exceptions: { row: number; text: string }[] }

function fitRowsum(
  target: NumColInfo, nums: NumColInfo[], render: (v: bigint) => string,
  work: { n: number },
): RowsumFit[] {
  const out: RowsumFit[] = [];
  const R = target.cells.length;
  if (target.cells.some((c) => c === null)) return out; // target must be present every row
  const ys = target.cells as bigint[];
  // work values at per-column native scale; rescale each term to target scale
  const termAt = (nc: NumColInfo, i: number): bigint => {
    const c = nc.cells[i];
    if (c === null) return 0n;
    if (nc.scale === target.scale) return c;
    if (nc.scale > target.scale) {
      const d = 10n ** BigInt(nc.scale - target.scale);
      return c % d === 0n ? c / d : c; // non-divisible terms poison the sum check below via mismatch
    }
    return c * 10n ** BigInt(target.scale - nc.scale);
  };
  // a term column is usable only if all its cells rescale exactly to target scale
  const usable = nums.filter((nc) => {
    if (nc.col === target.col) return false;
    if (nc.scale <= target.scale) return true;
    const d = 10n ** BigInt(nc.scale - target.scale);
    return nc.cells.every((c) => c === null || c % d === 0n);
  });
  if (usable.length === 0) return out;
  const vals = new Map<number, bigint[]>();
  for (const nc of usable) vals.set(nc.col, Array.from({ length: R }, (_, i) => termAt(nc, i)));

  const distinct = new Set(ys.map((v) => v.toString()));
  if (distinct.size < 3) return out;

  const testSet = (terms: number[], head: number | null): RowsumFit | null => {
    // quick prune on up to 5 spread rows
    const probeRows = [0, 1, 2, R >> 1, R - 1].filter((v, i, a) => v >= 0 && v < R && a.indexOf(v) === i);
    const sumRow = (i: number): bigint => {
      let ssum = head === null ? 0n : vals.get(head)![i]!;
      for (const t of terms) ssum += (head === null ? 1n : -1n) * vals.get(t)![i]!;
      return ssum;
    };
    let probeBad = 0;
    for (const i of probeRows) { work.n++; if (sumRow(i) !== ys[i] && ++probeBad > KEPHALAION_MAX_EXCEPTIONS) return null; }
    const exceptions: { row: number; text: string }[] = [];
    for (let i = 0; i < R; i++) {
      work.n++;
      if (work.n > KEPHALAION_MAX_WORK) return null;
      if (sumRow(i) !== ys[i]!) {
        exceptions.push({ row: i, text: render(ys[i]!) });
        if (exceptions.length > KEPHALAION_MAX_EXCEPTIONS) return null;
      }
    }
    // nontriviality: the sum must actually vary with the terms
    return { terms, head, exceptions };
  };

  const candCols = usable.map((u) => u.col);
  const subsets: number[][] = [];
  if (candCols.length <= KEPHALAION_MAX_SUBSET_COLS) {
    const total = 1 << candCols.length;
    for (let mask = 1; mask < total; mask++) {
      const bits: number[] = [];
      for (let b = 0; b < candCols.length; b++) if (mask & (1 << b)) bits.push(candCols[b]!);
      if (bits.length >= 2) subsets.push(bits);
    }
    // larger subsets first: totals usually span everything
    subsets.sort((a, b) => b.length - a.length);
  } else {
    subsets.push([...candCols]);
    for (let a = 0; a < candCols.length; a++)
      for (let b = a + 2; b <= candCols.length; b++) subsets.push(candCols.slice(a, b));
  }
  for (const s of subsets) {
    const f = testSet(s, null);
    if (f) { out.push(f); break; } // one pure-sum fit is enough (prefer the largest found)
  }
  // head-minus-rest: y = h - sum(S)
  for (const h of candCols) {
    const rest = candCols.filter((c) => c !== h);
    const subSets: number[][] = [];
    if (rest.length <= KEPHALAION_MAX_SUBSET_COLS) {
      const total = 1 << rest.length;
      for (let mask = 1; mask < total; mask++) {
        const bits: number[] = [];
        for (let b = 0; b < rest.length; b++) if (mask & (1 << b)) bits.push(rest[b]!);
        if (bits.length >= 1) subSets.push(bits);
      }
      subSets.sort((a, b) => b.length - a.length);
    } else subSets.push([...rest]);
    for (const s of subSets) {
      const f = testSet(s, h);
      if (f) { out.push(f); break; }
    }
    if (out.length > 0 && out[out.length - 1]!.head === h) break;
  }
  return out;
}

function fitColsum(
  table: ParsedTable, nums: NumColInfo[], skipCol: number,
): { row: number; cols: number[] } | null {
  const R = table.rows.length - 1;
  const labelRe = /total|sum|gesamt/i;
  const candRows = new Set<number>([0, R - 1]);
  for (let i = 0; i < R; i++) {
    if (table.rows[i + 1]!.values.some((v) => labelRe.test(v) && parseStyled(v, 'plain', false) === null && v.trim().length <= 24)) candRows.add(i);
  }
  let best: { row: number; cols: number[] } | null = null;
  for (const r of candRows) {
    if (r < 0 || r >= R) continue;
    const cols: number[] = [];
    for (const nc of nums) {
      if (nc.col === skipCol) continue;
      const cellAtR = nc.cells[r];
      if (cellAtR === null || cellAtR === undefined) continue;
      let sum = 0n;
      let okAll = true;
      for (let i = 0; i < R; i++) {
        if (i === r) continue;
        const c = nc.cells[i];
        if (c === undefined) { okAll = false; break; }
        sum += c ?? 0n;
      }
      if (okAll && sum === cellAtR) cols.push(nc.col);
    }
    if (cols.length >= 2 && (!best || cols.length > best.cols.length)) best = { row: r, cols };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Reduced text / restore
// ---------------------------------------------------------------------------

function buildReduced(table: ParsedTable, spec: KephalaionSpec): string {
  const out: string[] = [];
  const drop = spec.rowsum?.col ?? -1;
  for (let r = 0; r < table.rows.length; r++) {
    let fields = table.rows[r]!.fields.filter((_, j) => j !== drop);
    if (spec.colsum && r === spec.colsum.row + 1) {
      fields = fields.map((f, j) => {
        const origIdx = drop === -1 || j < drop ? j : j + 1;
        return spec.colsum!.cols.includes(origIdx) ? '' : f;
      });
    }
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

export function kephalaionRestore(reducedText: string, spec: KephalaionSpec): string {
  const reduced = parseTable(reducedText, spec.delimiter, 1, 1);
  if (!reduced) throw new Error('KEPHALAION reduced text is not a parseable table');
  const R = reduced.rows.length - 1;
  const drop = spec.rowsum?.col ?? -1;
  const ridx = (c: number): number => (drop === -1 || c < drop ? c : c - 1);
  // finished values (strings), built column-insert first
  const finished: string[][] = reduced.rows.map((r) => [...r.fields]);
  if (spec.rowsum) {
    const rs = spec.rowsum;
    const exc = new Map(rs.exceptions.map((e) => [e.row, e.text]));
    for (let i = 0; i < R; i++) {
      const row = reduced.rows[i + 1]!.values;
      const cellVal = (c: number): bigint => {
        const s = row[ridx(c)]!;
        if (s === '') return 0n;
        const p = parseStyled(s, spec.style, spec.grouped);
        if (!p) throw new Error('KEPHALAION unparseable term');
        return rescale(p.v, p.scale, spec.scale);
      };
      let v: bigint;
      if (rs.head === null) {
        v = rs.terms.reduce((acc, t) => acc + cellVal(t), 0n);
      } else {
        v = cellVal(rs.head) - rs.terms.reduce((acc, t) => acc + cellVal(t), 0n);
      }
      const text = exc.has(i) ? exc.get(i)! : renderStyled(v, spec.scale, spec.style, spec.grouped);
      finished[i + 1]!.splice(rs.col, 0, text);
    }
    finished[0]!.splice(rs.col, 0, renderFieldSimple(rs.headerName, spec.delimiter));
  }
  // values view of finished rows for colsum computation (re-parse inserted numerics)
  if (spec.colsum) {
    const cs = spec.colsum;
    // numeric values per finished column (parse rendered fields via values reconstruction)
    const valueOf = (rowIdx: number, colIdx: number): bigint | null => {
      const f = finished[rowIdx]![colIdx]!;
      // unquote if needed
      const s = f.startsWith('"') ? f.slice(1, -1).replace(/""/g, '"') : f;
      if (s === '') return 0n;
      const p = parseStyled(s, spec.style, spec.grouped);
      return p ? p.v : null;
    };
    for (const c of cs.cols) {
      // determine the column's scale from its body cells
      let colScale: number | null = null;
      let sum = 0n;
      let bad = false;
      for (let i = 0; i < R; i++) {
        if (i === cs.row) continue;
        const f = finished[i + 1]![c]!;
        const s = f.startsWith('"') ? f.slice(1, -1).replace(/""/g, '"') : f;
        if (s === '') continue;
        const p = parseStyled(s, spec.style, spec.grouped);
        if (!p) { bad = true; break; }
        if (colScale === null) colScale = p.scale;
        if (p.scale !== colScale) { bad = true; break; }
        sum += p.v;
      }
      if (bad || colScale === null) throw new Error('KEPHALAION colsum column not summable');
      finished[cs.row + 1]![c] = renderStyled(sum, colScale, spec.style, spec.grouped);
    }
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

function buildContract(table: ParsedTable, spec: KephalaionSpec): string {
  const header = table.rows[0]!.values;
  const parts: string[] = [];
  const ref = (col: number): string => {
    const name = header[col]!;
    if (name !== '' && !/[{}"]/.test(name) && header.filter((x) => x === name).length === 1) return `{${name}}`;
    return `field ${col + 1}`;
  };
  const termsDesc = (terms: number[]): string => {
    const sorted = [...terms].sort((a, b) => a - b);
    const contiguous = sorted.every((c, i) => i === 0 || c === sorted[i - 1]! + 1);
    if (contiguous && sorted.length >= 4) return `fields ${sorted[0]! + 1} to ${sorted[sorted.length - 1]! + 1}`;
    return sorted.map(ref).join(' + ');
  };
  if (spec.rowsum) {
    const rs = spec.rowsum;
    const tgt = rs.headerName !== '' && !/["]/.test(rs.headerName)
      ? `"${rs.headerName}" as field ${rs.col + 1}` : `a field as field ${rs.col + 1}`;
    const formula = rs.head === null
      ? (rs.terms.length >= 4 && termsDesc(rs.terms).startsWith('fields')
          ? `the sum of ${termsDesc(rs.terms)} of the same row`
          : termsDesc(rs.terms))
      : `${ref(rs.head)} - ${rs.terms.map(ref).join(' - ')}`;
    const exc = rs.exceptions.length
      ? ` (except ${rs.exceptions.map((e) => `data row ${e.row + 1} = ${e.text}`).join(', ')})`
      : '';
    const dec = spec.scale === 0 ? 'as an integer' : `with exactly ${spec.scale} decimals`;
    parts.push(`insert ${tgt} of the header and each row: the inserted value = ${formula} (empty field = 0), written ${dec}${exc}`);
  }
  if (spec.colsum) {
    const cs = spec.colsum;
    const colList = cs.cols.map((c) => `field ${c + 1}`).join(', ');
    const verb = spec.rowsum ? 'then fill' : 'fill';
    parts.push(`${verb} data row ${cs.row + 1}'s empty fields ${colList}: each is the sum of its column over all other data rows, in that column's number format`);
  }
  const styleNote = spec.style === 'de'
    ? ` Numbers are German format (1.234,56: dot-grouped thousands, comma point); compute and write in that format.`
    : '';
  return `KEPHALAION: after decoding below, in the ${delimName(spec.delimiter)}-separated table: ${parts.join('; ')}. {x} means that row's decoded {x}.${styleNote} Change nothing else.`;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function kephalaionPlan(text: string, enc: EncodingName = 'o200k_base'): KephalaionPlan | null {
  if (text.length === 0 || text.length > KEPHALAION_MAX_CHARS) return null;
  const work = { n: 0 };
  let best: KephalaionPlan | null = null;
  let bestScore = Infinity;

  for (const delim of [',', '\t', ';', '|']) {
    const table = parseTable(text, delim, KEPHALAION_MIN_DATA_ROWS, 2);
    if (!table) continue;
    const header = table.rows[0]!.values;
    const nCols = header.length;
    const dataVals: string[][] = [];
    for (let c = 0; c < nCols; c++) dataVals.push(table.rows.slice(1).map((r) => r.values[c]!));

    const styleCands: { style: KephalaionStyle; grouped: boolean }[] = [{ style: 'plain', grouped: false }];
    if (delim !== ',') styleCands.push({ style: 'de', grouped: true }, { style: 'de', grouped: false });

    for (const { style, grouped } of styleCands) {
      const nums: NumColInfo[] = [];
      for (let c = 0; c < nCols; c++) {
        const pc = parseColumn(dataVals[c]!, style, grouped);
        if (pc) nums.push({ col: c, cells: pc.cells, scale: pc.scale });
      }
      if (nums.length === 0) continue;

      const consider = (spec: KephalaionSpec) => {
        const reducedText = buildReduced(table, spec);
        let restored: string;
        try { restored = kephalaionRestore(reducedText, spec); } catch { return; }
        if (restored !== text) return;
        const contract = buildContract(table, spec);
        const score = countTokens(contract, enc) + countTokens(reducedText, enc);
        if (score < bestScore) {
          bestScore = score;
          best = { spec, reducedText, contract };
        }
      };

      // rowsum candidates per numeric target
      for (const tg of nums) {
        if (tg.cells.some((c) => c === null)) continue;
        const render = (v: bigint): string => renderStyled(v, tg.scale, style, grouped);
        // target re-render check
        let renderOk = true;
        for (let i = 0; i < tg.cells.length; i++) {
          if (render(tg.cells[i]!) !== dataVals[tg.col]![i]) { renderOk = false; break; }
        }
        if (!renderOk) continue;
        const fits = fitRowsum(tg, nums, render, work);
        if (work.n > KEPHALAION_MAX_WORK) return best;
        for (const f of fits) {
          const rowsum: KephalaionRowsum = {
            col: tg.col, headerName: header[tg.col]!, terms: f.terms, head: f.head, exceptions: f.exceptions,
          };
          consider({ v: 1, delimiter: delim, style, grouped, scale: tg.scale, rowsum, colsum: null });
          // compose with colsum (skip the dropped column)
          const cs = fitColsum(table, nums, tg.col);
          if (cs) consider({ v: 1, delimiter: delim, style, grouped, scale: tg.scale, rowsum, colsum: cs });
        }
      }
      // colsum alone
      const csOnly = fitColsum(table, nums, -1);
      if (csOnly) {
        const anyScale = nums.find((n) => csOnly.cols.includes(n.col))?.scale ?? 0;
        consider({ v: 1, delimiter: delim, style, grouped, scale: anyScale, rowsum: null, colsum: csOnly });
      }
    }
    if (best) break;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (house construction)
// ---------------------------------------------------------------------------

export interface KephalaionResult {
  codec: 'kephalaion';
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
    throw new Error('KEPHALAION AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('KEPHALAION DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('KEPHALAION APOGRAPHE parent did not reconstruct');
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
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('KEPHALAION frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('KEPHALAION TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('KEPHALAION SIBLING reported cost disagreed');
  return {
    tokens: Math.min(frontierTokens, tagTokens, siblingTokens),
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function kephalaionEncode(text: string, enc: EncodingName = 'o200k_base'): KephalaionResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = kephalaionPlan(text, enc);
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
  ): KephalaionResult => {
    const parent = measuredFallback();
    return {
      codec: 'kephalaion',
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
    return fallbackResult(null, null, null, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'no exact aggregate drop was found; returned the measured best direct parent');
  }

  const candidateParent = bestMeasuredParent(plan.reducedText, enc);
  const candidateMessage = plan.contract + '\n' + candidateParent.message;
  const candidateDecoded = kephalaionRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'the KEPHALAION candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured');
  }

  const frontier = frontierEncode(text, enc);
  if (candidateTokens >= frontier.tokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, true, frontier.tokens, frontier.comparison, 'the KEPHALAION candidate did not beat the full measured frontier; returned the measured best direct parent');
  }

  const shape = [plan.spec.rowsum ? (plan.spec.rowsum.head === null ? 'rowsum' : 'headsum') : null, plan.spec.colsum ? 'colsum' : null].filter(Boolean).join('+');
  return {
    codec: 'kephalaion',
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
    notes: `dropped aggregate (${shape}); complete-message M=${candidateTokens} < same-source frontier M=${frontier.tokens}`,
    ms: Date.now() - started,
  };
}
