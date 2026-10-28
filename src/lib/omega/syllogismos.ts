/**
 * SYLLOGISMOS (X51) — verified functional-dependency column elision.
 *
 * Every prior codec in this stack removes redundancy that is visible as
 * repetition (grammar rules), as a vertical law inside one column
 * (AKOLOUTHIA-2, APOGRAPHE's `above`/`days`/`workdays`/`+b`, METRON
 * generators, KOLUMN column descriptors), or as an identical sibling
 * (APOGRAPHE `colM`, KOLUMN `R`). None of them can remove a column whose
 * values are *computed* from other fields of the same row: a total that is
 * price × quantity, a percentage that is 100·part/whole, an ID assembled
 * from `age` and `gender`, a country code that is the region code before
 * its dash. A grammar sees those values as fresh digit strings on every
 * row, because the redundancy is arithmetic, not textual.
 *
 * SYLLOGISMOS (συλλογισμός — a reckoning, an inference from premises)
 * searches a bounded family of exact functional dependencies over the
 * fields of a delimited table, verifies each candidate on EVERY row with
 * exact decimal (BigInt rational) arithmetic, deletes the columns it can
 * recompute, and states the dependencies once in an in-band contract.
 * The reduced table is then coded by the cheapest measured parent among
 * DAEDALUS, AKOLOUTHIA-2 and APOGRAPHE. The complete candidate must beat
 * both AKOLOUTHIA-2 and APOGRAPHE on the original (both are members of
 * the X49 TAGSTACK runtime-parent set, so losing to either proves it
 * cannot beat that frontier) and then the full TAGSTACK + SIBLING-TEMPLATE
 * frontier, strictly and byte-exactly, or the measured best parent is
 * returned instead.
 *
 * Relation family (all verified per row, byte-for-byte after CSV rendering):
 *   arith     C = A+B, A−B, A*B, A/B, 100*A/B at the target's constant
 *             decimal scale, rounding mode in {exact, half-up, trunc, ceil}
 *   scaleK    C = A*K for a fitted rational K with a short rendering
 *   concat    C = constants and up to two sibling fields concatenated
 *   split     C = a part of A split on a separator character
 *   case      C = upper(A) / lower(A)
 *   lookup    C = a finite map applied to A (map shipped in the contract)
 *   shiftdiff C_i = A_i − A_{i−1} (first value stated literally)
 *   fwdeq     C_i = A_{i+1} (last value stated literally)
 * Constant columns and duplicate columns are deliberately NOT dropped:
 * APOGRAPHE and KOLUMN already own those, and SYLLOGISMOS must not
 * relabel their wins.
 *
 * Prior art (honest): functional dependencies as compression structure are
 * established database theory — semantic/model-based tabular compression
 * (SPARTAN; SQUISH; "column dependency" in TCS 387 (2007); DeepSqueeze,
 * SIGMOD 2020; Blitzcrank, VLDB 2024) exploits dependencies between
 * columns with arithmetic coding and learned models. Those systems are
 * bit-level and not chat-readable. The repository contribution claimed
 * here is only the bounded one-chat realization: exact textual rendering
 * (scales, rounding, quoting), a reader-computable contract, and the
 * measured frontier gate. No new compression primitive is claimed.
 *
 * Greedy/search: relation enumeration per column is bounded and
 * deterministic; the drop set is chosen greedily by isolated column token
 * mass subject to an acyclicity rule (a dropped column is never used as a
 * source, a used source is never dropped). It is not a joint optimum.
 * Emission is decided only by measured complete-message token counts.
 *
 * Time/CPU: CPU-bound. Structural caps (100k code units, 10k rows, 32
 * columns) plus a 30M cell-evaluation work cap bound the planner. The
 * parent encodes and the inherited TAGSTACK gate dominate wall time and
 * have no wrapper-wide cap; this entry is deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const SYLLOGISMOS_MAX_CHARS = 100_000;
export const SYLLOGISMOS_MAX_ROWS = 10_000;
export const SYLLOGISMOS_MAX_COLS = 32;
export const SYLLOGISMOS_MIN_DATA_ROWS = 8;
export const SYLLOGISMOS_MAX_DROPS = 8;
const MAX_WORK = 30_000_000;
const DELIMITERS = [',', '\t', ';', '|'] as const;
const SPLIT_SEPS = ['_', '-', '/', '.', ' ', '@', ':', ';', '|'] as const;

export type SyllogismosRound = 'exact' | 'half-up' | 'trunc' | 'ceil';

export type SyllogismosDrop =
  | { target: number; name: string; kind: 'arith'; op: '+' | '-' | '*' | '/' | 'pct'; a: number; b: number; scale: number; mode: SyllogismosRound }
  | { target: number; name: string; kind: 'scaleK'; a: number; kNum: string; kDen: string; kText: string; scale: number; mode: SyllogismosRound }
  | { target: number; name: string; kind: 'concat'; parts: ({ col: number } | { lit: string })[] }
  | { target: number; name: string; kind: 'split'; a: number; sep: string; part: number }
  | { target: number; name: string; kind: 'case'; a: number; upper: boolean }
  | { target: number; name: string; kind: 'lookup'; a: number; entries: [string, string][]; defaultValue: string | null }
  | { target: number; name: string; kind: 'shiftdiff'; a: number; scale: number; mode: SyllogismosRound; first: string }
  | { target: number; name: string; kind: 'fwdeq'; a: number; last: string };

export interface SyllogismosSpec {
  delimiter: string;
  cols: number;
  header: string[];
  headerRaw: string[];
  drops: SyllogismosDrop[];
}

export interface SyllogismosPlan {
  reducedText: string;
  contract: string;
  spec: SyllogismosSpec;
  estColTokensDropped: number;
  dropDescriptions: string[];
}

export interface SyllogismosResult {
  codec: 'syllogismos';
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
  drops: SyllogismosDrop[];
  dropDescriptions: string[];
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
// CSV line parsing (raw spans preserved; single-line records only)
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

function renderField(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

interface ParsedTable {
  delimiter: string;
  eols: string[]; // per-line ending: '\n', '\r\n', or '' for final unterminated line
  rows: CsvRow[]; // includes header at [0]
}

function parseTableFor(text: string, delim: string): ParsedTable | null {
  const rawLines = text.split('\n');
  const rows: CsvRow[] = [];
  const eols: string[] = [];
  for (let li = 0; li < rawLines.length; li++) {
    const isLast = li === rawLines.length - 1;
    let body = rawLines[li]!;
    let eol = isLast ? '' : '\n';
    if (!isLast && body.endsWith('\r')) { body = body.slice(0, -1); eol = '\r\n'; }
    if (isLast && body === '') break; // trailing newline already recorded on previous line
    if (body.length === 0) return null; // blank record lines are outside the domain
    const row = splitCsvLine(body, delim);
    if (!row) return null;
    rows.push(row);
    eols.push(eol);
  }
  if (rows.length < SYLLOGISMOS_MIN_DATA_ROWS + 1 || rows.length > SYLLOGISMOS_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < 2 || cols > SYLLOGISMOS_MAX_COLS) return null;
  if (rows.some(r => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

function isWellFormedUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const u = text.charCodeAt(i);
    if (u >= 0xd800 && u <= 0xdbff) {
      const nx = text.charCodeAt(i + 1);
      if (!(nx >= 0xdc00 && nx <= 0xdfff)) return false;
      i++;
    } else if (u >= 0xdc00 && u <= 0xdfff) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Exact decimal arithmetic (BigInt scaled integers / rationals)
// ---------------------------------------------------------------------------

interface DecVal { neg: boolean; mag: bigint; scale: number }

function parseDec(s: string): DecVal | null {
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  const frac = m[3] ?? '';
  return { neg: m[1] === '-', mag: BigInt(m[2] + frac), scale: frac.length };
}

function decRat(d: DecVal): [bigint, bigint] {
  return [d.neg ? -d.mag : d.mag, 10n ** BigInt(d.scale)];
}

/** Render rational num/den (den>0) at fixed scale. Returns {text, inexact}. */
function renderRat(num: bigint, den: bigint, scale: number, mode: SyllogismosRound): { text: string; inexact: boolean } {
  const neg = num < 0n;
  const a = neg ? -num : num;
  const sn = a * (10n ** BigInt(scale));
  let q = sn / den;
  const r = sn % den;
  const inexact = r !== 0n;
  if (inexact) {
    if (mode === 'half-up' && r * 2n >= den) q += 1n;
    else if (mode === 'ceil' && !neg) q += 1n;
    else if (mode === 'ceil' && neg) { /* toward +inf: magnitude truncated */ }
    else if (mode === 'trunc' || mode === 'exact') { /* magnitude truncated */ }
  }
  let digits = q.toString();
  if (scale > 0) {
    digits = digits.padStart(scale + 1, '0');
    digits = digits.slice(0, -scale) + '.' + digits.slice(-scale);
  }
  return { text: (neg && q !== 0n ? '-' : '') + digits, inexact };
}

/** Exact decimal rendering with the fewest fractional digits (scale -1), or null if it does not terminate within 12 places. */
function renderRatExact(num: bigint, den: bigint): string | null {
  for (let s = 0; s <= 12; s++) {
    if ((num * (10n ** BigInt(s))) % den === 0n) return renderRat(num, den, s, 'exact').text;
  }
  return null;
}

function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b !== 0n) { const r = a % b; a = b; b = r; }
  return a;
}

/** Short reader rendering of a positive-denominator rational, or null if too long. */
function shortRatText(num: bigint, den: bigint): string | null {
  const g = bgcd(num, den) || 1n;
  const n = num / g;
  const d = den / g;
  // decimal if denominator is 2^a * 5^b and the decimal is short
  let dd = d;
  while (dd % 2n === 0n) dd /= 2n;
  while (dd % 5n === 0n) dd /= 5n;
  if (dd === 1n) {
    for (let s = 0; s <= 8; s++) {
      const scaled = n * (10n ** BigInt(s));
      if (scaled % d === 0n) {
        const t = renderRat(n, d, s, 'exact').text;
        if (t.length <= 10) return t;
        break;
      }
    }
  }
  const frac = `${n}/${d}`;
  return frac.length <= 12 ? frac : null;
}

// ---------------------------------------------------------------------------
// Relation evaluation from data descriptors (shared by search and decode)
// ---------------------------------------------------------------------------

/** Compute a drop's value; vals = full row values by ORIGINAL index (search phase) is
 *  handled by callers mapping indices; here get(col, rowIdx) supplies source values. */
function computeDrop(
  drop: SyllogismosDrop,
  i: number,
  rowCount: number,
  get: (col: number, row: number) => string | null,
): string | null {
  switch (drop.kind) {
    case 'arith': {
      const av = get(drop.a, i); const bv = get(drop.b, i);
      if (av === null || bv === null) return null;
      const A = parseDec(av); const B = parseDec(bv);
      if (!A || !B) return null;
      const [an, ad] = decRat(A); const [bn, bd] = decRat(B);
      let num: bigint; let den: bigint;
      if (drop.op === '+') { num = an * bd + bn * ad; den = ad * bd; }
      else if (drop.op === '-') { num = an * bd - bn * ad; den = ad * bd; }
      else if (drop.op === '*') { num = an * bn; den = ad * bd; }
      else {
        if (bn === 0n) return null;
        num = an * bd; den = ad * bn;
        if (drop.op === 'pct') num *= 100n;
        if (den < 0n) { num = -num; den = -den; }
      }
      return drop.scale < 0 ? renderRatExact(num, den) : renderRat(num, den, drop.scale, drop.mode).text;
    }
    case 'scaleK': {
      const av = get(drop.a, i); if (av === null) return null;
      const A = parseDec(av); if (!A) return null;
      const [an, ad] = decRat(A);
      const kn = BigInt(drop.kNum); const kd = BigInt(drop.kDen);
      let num = an * kn; let den = ad * kd;
      if (den < 0n) { num = -num; den = -den; }
      return drop.scale < 0 ? renderRatExact(num, den) : renderRat(num, den, drop.scale, drop.mode).text;
    }
    case 'concat': {
      let out = '';
      for (const p of drop.parts) {
        if ('lit' in p) out += p.lit;
        else { const v = get(p.col, i); if (v === null) return null; out += v; }
      }
      return out;
    }
    case 'split': {
      const av = get(drop.a, i); if (av === null) return null;
      const parts = av.split(drop.sep);
      const idx = drop.part < 0 ? parts.length + drop.part : drop.part;
      if (idx < 0 || idx >= parts.length) return null;
      return parts[idx]!;
    }
    case 'case': {
      const av = get(drop.a, i); if (av === null) return null;
      return drop.upper ? av.toUpperCase() : av.toLowerCase();
    }
    case 'lookup': {
      const av = get(drop.a, i); if (av === null) return null;
      for (const [k, v] of drop.entries) if (k === av) return v;
      return drop.defaultValue;
    }
    case 'shiftdiff': {
      if (i === 0) return drop.first;
      const cur = get(drop.a, i); const prev = get(drop.a, i - 1);
      if (cur === null || prev === null) return null;
      const A = parseDec(cur); const B = parseDec(prev);
      if (!A || !B) return null;
      const [an, ad] = decRat(A); const [bn, bd] = decRat(B);
      return drop.scale < 0 ? renderRatExact(an * bd - bn * ad, ad * bd) : renderRat(an * bd - bn * ad, ad * bd, drop.scale, drop.mode).text;
    }
    case 'fwdeq': {
      if (i === rowCount - 1) return drop.last;
      return get(drop.a, i + 1);
    }
  }
}

function dropSources(drop: SyllogismosDrop): number[] {
  switch (drop.kind) {
    case 'arith': return [drop.a, drop.b];
    case 'concat': return drop.parts.flatMap(p => ('col' in p ? [p.col] : []));
    default: return [drop.a];
  }
}

// ---------------------------------------------------------------------------
// Relation search
// ---------------------------------------------------------------------------

interface Candidate { drop: SyllogismosDrop; colTokens: number; estExtra: number }

const KIND_ORDER: Record<SyllogismosDrop['kind'], number> = {
  arith: 0, scaleK: 1, concat: 2, split: 3, lookup: 4, case: 5, shiftdiff: 6, fwdeq: 7,
};

function describeDrop(drop: SyllogismosDrop, refOf: (col: number) => string): string {
  const T = refOf(drop.target);
  const scaleText = (scale: number, mode: SyllogismosRound) =>
    scale < 0 ? ' (exact decimal)'
    : mode === 'exact'
      ? (scale > 0 ? ` (exactly ${scale} dp)` : '')
      : ` (to ${scale} dp, ${mode === 'half-up' ? 'halves up' : mode === 'trunc' ? 'truncated toward zero' : 'rounded up'})`;
  switch (drop.kind) {
    case 'arith': {
      const opText = drop.op === '+' ? `${refOf(drop.a)} + ${refOf(drop.b)}`
        : drop.op === '-' ? `${refOf(drop.a)} - ${refOf(drop.b)}`
        : drop.op === '*' ? `${refOf(drop.a)} * ${refOf(drop.b)}`
        : drop.op === '/' ? `${refOf(drop.a)} / ${refOf(drop.b)}`
        : `100 * ${refOf(drop.a)} / ${refOf(drop.b)}`;
      return `${T} = ${opText}${scaleText(drop.scale, drop.mode)}`;
    }
    case 'scaleK':
      return `${T} = ${refOf(drop.a)} * ${drop.kText}${scaleText(drop.scale, drop.mode)}`;
    case 'concat':
      return `${T} = join(` + drop.parts.map(p => ('lit' in p ? JSON.stringify(p.lit) : refOf(p.col))).join(', ') + ')';
    case 'split': {
      const partText = drop.part === 0 ? `${refOf(drop.a)} before first ${JSON.stringify(drop.sep)}`
        : drop.part === -1 ? `${refOf(drop.a)} after last ${JSON.stringify(drop.sep)}`
        : drop.part > 0 ? `part ${drop.part + 1} of ${refOf(drop.a)} split on ${JSON.stringify(drop.sep)}`
        : `part ${-drop.part} from the end of ${refOf(drop.a)} split on ${JSON.stringify(drop.sep)}`;
      return `${T} = ${partText}`;
    }
    case 'case':
      return `${T} = ${drop.upper ? 'upper' : 'lower'}(${refOf(drop.a)})`;
    case 'lookup':
      return drop.defaultValue === null
        ? `${T} by ${refOf(drop.a)}: ` + drop.entries.map(([k, v]) => `${JSON.stringify(k)}=${JSON.stringify(v)}`).join(' ')
        : `${T} by ${refOf(drop.a)}: default ${JSON.stringify(drop.defaultValue)}; ` + drop.entries.map(([k, v]) => `${JSON.stringify(k)}=${JSON.stringify(v)}`).join(' ');
    case 'shiftdiff':
      return `${T} = ${refOf(drop.a)} of this row minus ${refOf(drop.a)} of the row above${scaleText(drop.scale, drop.mode)}; first row ${JSON.stringify(drop.first)}`;
    case 'fwdeq':
      return `${T} = ${refOf(drop.a)} of the row below; last row ${JSON.stringify(drop.last)}`;
  }
}

function syllogismosContract(spec: SyllogismosSpec): { contract: string; descriptions: string[] } {
  const delimName = spec.delimiter === ',' ? 'comma' : spec.delimiter === '\t' ? 'tab' : spec.delimiter === ';' ? 'semicolon' : 'pipe';
  const names = spec.header;
  const nameOk = names.every(n => n.length > 0 && n.length <= 40 && !/[;"\n\r]/.test(n)) && new Set(names).size === names.length;
  const droppedIdx = new Set(spec.drops.map(d => d.target));
  // reduced-row index of an original column (sources and other survivors)
  const reducedIndex = (col: number) => {
    let k = 0;
    for (let c = 0; c < col; c++) if (!droppedIdx.has(c)) k++;
    return k + 1;
  };
  const refOf = (col: number): string => {
    if (droppedIdx.has(col)) return `field ${col + 1} ${JSON.stringify(names[col]!)}`;
    return nameOk ? `{${names[col]!}}` : `decoded field ${reducedIndex(col)}`;
  };
  const descriptions = spec.drops.map(d => describeDrop(d, refOf));
  const contract =
    `SYLLOGISMOS: after decoding below, insert computed fields into each row of the ${delimName}-separated table ` +
    `at the stated field number (1-based, finished table), in order: ` +
    descriptions.join('; ') + '. ' +
    (nameOk ? `{x}=value of field x; "..."=literal text. ` : '') +
    `Header: insert the quoted names. Change nothing else.`;
  return { contract, descriptions };
}

/**
 * Restore a reduced table from a spec. This is the local decoder for the
 * SYLLOGISMOS layer (applied after the parent codec's own decode).
 */
export function syllogismosRestore(reducedText: string, spec: SyllogismosSpec): string {
  const table = parseTableForLenient(reducedText, spec.delimiter, spec.cols - spec.drops.length);
  if (!table) throw new Error('SYLLOGISMOS restore: reduced text is not the expected table shape');
  const droppedIdx = new Set(spec.drops.map(d => d.target));
  const survivorOf = (origCol: number): number => {
    let k = 0;
    for (let c = 0; c < origCol; c++) if (!droppedIdx.has(c)) k++;
    return k;
  };
  const dataRows = table.rows.slice(1);
  const get = (col: number, row: number): string | null => {
    if (row < 0 || row >= dataRows.length) return null;
    return dataRows[row]!.values[survivorOf(col)] ?? null;
  };
  const outLines: string[] = [];
  for (let li = 0; li < table.rows.length; li++) {
    const row = table.rows[li]!;
    const raws = [...row.fields];
    const inserts: { target: number; raw: string }[] = [];
    for (const drop of spec.drops) {
      if (li === 0) { inserts.push({ target: drop.target, raw: spec.headerRaw[drop.target]! }); continue; }
      const value = computeDrop(drop, li - 1, dataRows.length, get);
      if (value === null) throw new Error('SYLLOGISMOS restore: a computed field could not be evaluated');
      inserts.push({ target: drop.target, raw: renderField(value, spec.delimiter) });
    }
    inserts.sort((x, y) => x.target - y.target);
    for (const ins of inserts) raws.splice(ins.target, 0, ins.raw);
    outLines.push(raws.join(spec.delimiter) + table.eols[li]!);
  }
  return outLines.join('');
}

/** Parse like parseTableFor but with an expected survivor column count and header-flexible minimums for restore. */
function parseTableForLenient(text: string, delim: string, expectCols: number): ParsedTable | null {
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
    if (!row || row.values.length !== expectCols) return null;
    rows.push(row);
    eols.push(eol);
  }
  if (rows.length < 2) return null;
  return { delimiter: delim, eols, rows };
}

/** Find the SYLLOGISMOS plan for a text, or null when no verified drop exists. */
export function syllogismosPlan(text: string, enc: EncodingName = 'o200k_base'): SyllogismosPlan | null {
  if (!text.length || text.length > SYLLOGISMOS_MAX_CHARS || !isWellFormedUnicode(text)) return null;
  let best: SyllogismosPlan | null = null;
  for (const delim of DELIMITERS) {
    const table = parseTableFor(text, delim);
    if (!table) continue;
    const plan = planForTable(text, table, enc);
    if (plan && (!best || plan.estColTokensDropped > best.estColTokensDropped)) best = plan;
  }
  return best;
}

function planForTable(text: string, table: ParsedTable, enc: EncodingName): SyllogismosPlan | null {
  const { delimiter, rows } = table;
  const header = rows[0]!.values;
  const data = rows.slice(1);
  const C = header.length;
  const R = data.length;
  const V = data.map(r => r.values);
  const dec: (DecVal | null)[][] = V.map(r => r.map(parseDec));
  const numeric = Array.from({ length: C }, (_, c) => dec.every(r => r[c] !== null));
  const constCol = Array.from({ length: C }, (_, c) => V.every(r => r[c] === V[0]![c]));
  const targetScale: (number | null)[] = Array.from({ length: C }, (_, c) => {
    if (!numeric[c]) return null;
    const s = dec[0]![c]!.scale;
    return dec.every(r => r[c]!.scale === s) ? s : null;
  });
  const colTokens = Array.from({ length: C }, (_, c) =>
    rows.reduce((acc, r) => acc + countTokens(r.fields[c]!, enc) + 1, 0));
  let work = 0;
  const candidates: Candidate[] = [];

  const getOrig = (col: number, row: number): string | null =>
    row >= 0 && row < R ? (V[row]![col] ?? null) : null;

  const verify = (drop: SyllogismosDrop): boolean => {
    work += R;
    if (work > MAX_WORK) return false;
    let dupOf = new Array<boolean>(C).fill(true);
    dupOf[drop.target] = false;
    let allSame = true;
    let firstVal: string | null = null;
    for (let i = 0; i < R; i++) {
      const v = computeDrop(drop, i, R, getOrig);
      if (v === null || v !== V[i]![drop.target]) return false;
      if (renderField(v, delimiter) !== data[i]!.fields[drop.target]) return false;
      if (firstVal === null) firstVal = v; else if (v !== firstVal) allSame = false;
      for (let c = 0; c < C; c++) if (dupOf[c] && V[i]![c] !== v) dupOf[c] = false;
    }
    if (allSame) return false; // constant: owned by APOGRAPHE/KOLUMN
    if (dupOf.some(Boolean)) return false; // duplicate of another column: owned by colM/R
    return true;
  };
  const consider = (drop: SyllogismosDrop) => {
    if (work > MAX_WORK) return;
    if (verify(drop)) {
      const estExtra = countTokens(describeDrop(drop, c => `field ${c + 1}`), enc);
      candidates.push({ drop, colTokens: colTokens[drop.target]!, estExtra });
    }
  };

  const roundedModes: SyllogismosRound[] = ['half-up', 'trunc', 'ceil'];

  for (let t = 0; t < C; t++) {
    if (constCol[t]) continue;
    const name = header[t]!;
    // ---- numeric same-row arithmetic + fitted scale ----
    if (numeric[t]) {
      const constScale = targetScale[t];
      type Rat = [bigint, bigint] | null;
      const ratFor = (op: '+' | '-' | '*' | '/' | 'pct', A: DecVal, B: DecVal): Rat => {
        const [an, ad] = decRat(A); const [bn, bd] = decRat(B);
        if (op === '+') return [an * bd + bn * ad, ad * bd];
        if (op === '-') return [an * bd - bn * ad, ad * bd];
        if (op === '*') return [an * bn, ad * bd];
        if (bn === 0n) return null;
        let num = an * bd; let den = ad * bn;
        if (op === 'pct') num *= 100n;
        if (den < 0n) { num = -num; den = -den; }
        return [num, den];
      };
      // A renderer is {scale:-1} (exact-minimal) or {scale>=0, mode}. Returns the mode actually needed.
      const rendersWith = (getRat: (i: number) => Rat): { scale: number; mode: SyllogismosRound } | null => {
        { let ok = true;
          for (let i = 0; i < R; i++) {
            work++; if (work > MAX_WORK) return null;
            const r = getRat(i); if (!r) { ok = false; break; }
            const txt = renderRatExact(r[0], r[1]);
            if (txt === null || txt !== V[i]![t]) { ok = false; break; }
          }
          if (ok) return { scale: -1, mode: 'exact' }; }
        if (constScale === null) return null;
        for (const mode of roundedModes) {
          let inexact = false; let ok = true;
          for (let i = 0; i < R; i++) {
            work++; if (work > MAX_WORK) return null;
            const r = getRat(i); if (!r) { ok = false; break; }
            const rr = renderRat(r[0], r[1], constScale, mode);
            if (rr.text !== V[i]![t]) { ok = false; break; }
            if (rr.inexact) inexact = true;
          }
          if (ok) return { scale: constScale, mode: inexact ? mode : 'exact' };
        }
        return null;
      };
      for (let a = 0; a < C; a++) {
        if (a === t || !numeric[a]) continue;
        // fitted scale K from the first nonzero row
        { let ki = -1;
          for (let i = 0; i < R; i++) if (dec[i]![a]!.mag !== 0n) { ki = i; break; }
          if (ki >= 0) {
            const [an, ad] = decRat(dec[ki]![a]!); const [cn, cd] = decRat(dec[ki]![t]!);
            let kn = cn * ad; let kd = cd * an;
            if (kd < 0n) { kn = -kn; kd = -kd; }
            if (kd > 0n && kn !== kd && kn !== 0n) {
              const kText = shortRatText(kn, kd);
              if (kText !== null) {
                const g = bgcd(kn, kd) || 1n;
                const got = rendersWith(i => {
                  const [xn, xd] = decRat(dec[i]![a]!);
                  let num = xn * kn; let den = xd * kd;
                  if (den < 0n) { num = -num; den = -den; }
                  return [num, den];
                });
                if (got) consider({ target: t, name, kind: 'scaleK', a, kNum: (kn / g).toString(), kDen: (kd / g).toString(), kText, scale: got.scale, mode: got.mode });
              }
            }
          }
        }
        for (let b = 0; b < C; b++) {
          if (b === t || b === a || !numeric[b]) continue;
          for (const op of ['+', '-', '*', '/', 'pct'] as const) {
            const got = rendersWith(i => ratFor(op, dec[i]![a]!, dec[i]![b]!));
            if (got) consider({ target: t, name, kind: 'arith', op, a, b, scale: got.scale, mode: got.mode });
          }
        }
        // shift difference against the same source column
        { const got = rendersWith(i => {
            if (i === 0) { const d0 = parseDec(V[0]![t]!); return d0 ? decRat(d0) : null; }
            const [an, ad] = decRat(dec[i]![a]!); const [bn, bd] = decRat(dec[i - 1]![a]!);
            return [an * bd - bn * ad, ad * bd];
          });
          if (got) consider({ target: t, name, kind: 'shiftdiff', a, scale: got.scale, mode: got.mode, first: V[0]![t]! }); }
      }
    }
    // ---- string relations ----
    for (let a = 0; a < C; a++) {
      if (a === t) continue;
      consider({ target: t, name, kind: 'case', a, upper: true });
      consider({ target: t, name, kind: 'case', a, upper: false });
      for (const sep of SPLIT_SEPS) {
        if (sep === delimiter) continue;
        for (const part of [0, 1, 2, -1, -2]) {
          consider({ target: t, name, kind: 'split', a, sep, part });
        }
      }
      // forward equality: C_i = A_{i+1}
      consider({ target: t, name, kind: 'fwdeq', a, last: V[R - 1]![t]! });
      // single-reference concat templates induced from row 0
      { const v0 = V[0]![a]!; const t0 = V[0]![t]!;
        if (v0.length > 0 && t0.length > v0.length && t0.includes(v0)) {
          const at = t0.indexOf(v0);
          const pre = t0.slice(0, at); const suf = t0.slice(at + v0.length);
          if (pre.length + suf.length <= 24 && (pre.length > 0 || suf.length > 0)) {
            const parts: ({ col: number } | { lit: string })[] = [];
            if (pre) parts.push({ lit: pre });
            parts.push({ col: a });
            if (suf) parts.push({ lit: suf });
            consider({ target: t, name, kind: 'concat', parts });
          }
        }
      }
      // two-reference concat templates induced from row 0
      for (let b = 0; b < C; b++) {
        if (b === t || b === a) continue;
        const a0 = V[0]![a]!; const b0 = V[0]![b]!; const t0 = V[0]![t]!;
        if (!a0 || !b0) continue;
        const ia = t0.indexOf(a0);
        if (ia < 0) continue;
        const ib = t0.indexOf(b0, ia + a0.length);
        if (ib < 0) continue;
        const pre = t0.slice(0, ia);
        const mid = t0.slice(ia + a0.length, ib);
        const suf = t0.slice(ib + b0.length);
        if (pre.length + mid.length + suf.length > 24) continue;
        const parts: ({ col: number } | { lit: string })[] = [];
        if (pre) parts.push({ lit: pre });
        parts.push({ col: a });
        if (mid) parts.push({ lit: mid });
        parts.push({ col: b });
        if (suf) parts.push({ lit: suf });
        consider({ target: t, name, kind: 'concat', parts });
      }
      // finite lookup A -> C
      { const map = new Map<string, string>();
        let consistent = true;
        for (let i = 0; i < R; i++) {
          work++;
          const k = V[i]![a]!; const v = V[i]![t]!;
          if (map.has(k) && map.get(k) !== v) { consistent = false; break; }
          map.set(k, v);
          if (map.size > 64) { consistent = false; break; }
        }
        if (consistent && map.size >= 2 && map.size < R && new Set(map.values()).size >= 2) {
          const all = [...map.entries()];
          const valueCounts = new Map<string, number>();
          for (const [, v] of all) valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
          const majority = [...valueCounts.entries()].sort((x, y) => y[1] - x[1])[0]![0];
          const exceptions = all.filter(([, v]) => v !== majority);
          const asDefault: SyllogismosDrop = { target: t, name, kind: 'lookup', a, entries: exceptions, defaultValue: majority };
          const asFull: SyllogismosDrop = { target: t, name, kind: 'lookup', a, entries: all, defaultValue: null };
          const ref = (c: number) => `field ${c + 1}`;
          consider(countTokens(describeDrop(asDefault, ref), enc) < countTokens(describeDrop(asFull, ref), enc) ? asDefault : asFull);
        }
      }
    }
  }

  if (!candidates.length) return null;

  // Greedy acyclic selection by isolated column token mass.
  candidates.sort((x, y) =>
    (y.colTokens - y.estExtra) - (x.colTokens - x.estExtra) ||
    x.drop.target - y.drop.target ||
    KIND_ORDER[x.drop.kind] - KIND_ORDER[y.drop.kind]);
  const takenTargets = new Set<number>();
  const usedSources = new Set<number>();
  const drops: SyllogismosDrop[] = [];
  let est = 0;
  for (const cand of candidates) {
    if (drops.length >= SYLLOGISMOS_MAX_DROPS) break;
    if (cand.colTokens - cand.estExtra <= 0) continue;
    const srcs = dropSources(cand.drop);
    if (takenTargets.has(cand.drop.target)) continue;
    if (usedSources.has(cand.drop.target)) continue;
    if (srcs.some(s => takenTargets.has(s))) continue;
    drops.push(cand.drop);
    est += cand.colTokens - cand.estExtra;
    takenTargets.add(cand.drop.target);
    for (const s of srcs) usedSources.add(s);
  }
  if (!drops.length) return null;
  drops.sort((x, y) => x.target - y.target);

  const droppedIdx = new Set(drops.map(d => d.target));
  const reducedText = rows
    .map((r, li) => r.fields.filter((_, ci) => !droppedIdx.has(ci)).join(delimiter) + table.eols[li]!)
    .join('');
  const spec: SyllogismosSpec = { delimiter, cols: C, header, headerRaw: rows[0]!.fields, drops };
  let restored: string;
  try {
    restored = syllogismosRestore(reducedText, spec);
  } catch {
    return null;
  }
  if (restored !== text) return null;
  const { contract, descriptions } = syllogismosContract(spec);
  return { reducedText, contract, spec, estColTokensDropped: est, dropDescriptions: descriptions };
}

// ---------------------------------------------------------------------------
// Measured parents and the frontier gate (mirrors ATX-RELEASE X50)
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
    throw new Error('SYLLOGISMOS AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('SYLLOGISMOS DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('SYLLOGISMOS APOGRAPHE parent did not reconstruct');
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
    throw new Error('SYLLOGISMOS baseline frontier did not complete exactly');
  }
  const sibling: SiblingTemplateResult = siblingTemplateEncode(text, enc, tag);
  if (!sibling.exact || sibling.decoded !== text) {
    throw new Error('SYLLOGISMOS SIBLING-TEMPLATE parent did not reconstruct exactly');
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
  plan: SyllogismosPlan | null,
  candidateTokens: number | null,
  candidateExact: boolean | null,
  comparison: string,
  notes: string,
  ms: number,
  candidateParent: MeasureParent | null = null,
  fullFrontierMeasured = false,
  precheckParentTokens = parent.messageTokens,
): SyllogismosResult {
  return {
    codec: 'syllogismos', wire: parent.wire, message: parent.message, decoded: text,
    exact: parent.decoded === text, inTokens, precheckParentTokens,
    parentTokens: parent.messageTokens, messageTokens: parent.messageTokens,
    parentCodec: parent.parentCodec, parentCosts: parent.parentCosts, fullFrontierMeasured,
    applied: false, drops: plan?.spec.drops ?? [], dropDescriptions: plan?.dropDescriptions ?? [],
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
export function syllogismosEncode(text: string, enc: EncodingName = 'o200k_base'): SyllogismosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const akoParent = measuredAkolouthia2(text, enc);
  const plan = syllogismosPlan(text, enc);
  if (!plan) {
    return fallbackResult(text, inTokens, akoParent, null, null, null,
      'AKOLOUTHIA-2 fallback only; no verified functional-dependency candidate was formed',
      'input is not an admissible delimited table with a verified computable column; returned the exact AKOLOUTHIA-2 message',
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
    decoded = syllogismosRestore(candidateParent.decoded, plan.spec);
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
    codec: 'syllogismos', wire: candidateParent.wire, message: candidateMessage, decoded: decoded!,
    exact: true, inTokens, precheckParentTokens: precheck.messageTokens,
    parentTokens: frontier.messageTokens, messageTokens: candidateTokens,
    parentCodec: frontier.parentCodec, parentCosts: frontier.parentCosts,
    fullFrontierMeasured: true, applied: true,
    drops: plan.spec.drops, dropDescriptions: plan.dropDescriptions,
    candidateTokens, candidateExact: true,
    candidateParentTokens: candidateParent.messageTokens,
    candidateParentCodec: candidateParent.parentCodec,
    candidateParentCosts: candidateParent.parentCosts,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
    notes: `dropped ${plan.spec.drops.length} computed column(s) [${plan.spec.drops.map(d => d.kind).join(', ')}]; complete-message M=${candidateTokens} < same-source frontier M=${frontier.messageTokens}`,
    ms: Date.now() - started,
  };
}
