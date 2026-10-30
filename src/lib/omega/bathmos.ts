/**
 * BATHMOS (X59) — partition-window (order-statistics / aggregate-share)
 * column elision for delimited tables.
 *
 * Every table dependency in the stack so far is row-local (SYLLOGISMOS
 * arith/lookup, ZYGON weighted sums, SYZYGIA affine twins), column-local
 * (APOGRAPHE/METRON generators, ATHROISMOS recurrences), an edge sum
 * (KEPHALAION), or a symmetry (ISOSKELES). None of them can state a law
 * whose value depends on the OTHER ROWS of the same partition: a league
 * position (rank of points-per-game inside one season), a percentile, a
 * quartile bucket, a market share (% of the partition total), an index to
 * the partition maximum. Those are SQL window functions — RANK /
 * DENSE_RANK / ROW_NUMBER / PERCENT_RANK / CUME_DIST / NTILE and
 * value/SUM(value) OVER (PARTITION BY ...) — exported into everyday CSVs
 * by every BI tool, and a grammar codec prices them as fresh digit
 * strings because the redundancy is relational, not textual.
 *
 * BATHMOS (βαθμός — a step, a degree, a rank) searches a bounded family
 * of exact partition-window laws, verifies each candidate on EVERY row
 * with exact BigInt-rational arithmetic, deletes the columns it can
 * recompute, and states each law once in an in-band contract. Families:
 *   rank    competition / dense / ordinal rank of a sort key inside the
 *           partition (key: one numeric column, or an exact ratio A/B of
 *           two numeric columns — points-per-game; ordinal ties may be
 *           broken by up to two further keys, then by original row order)
 *   pctrank PERCENT_RANK = (competition rank - 1) / (partition size - 1)
 *   cume    CUME_DIST = (# partition rows ranked at-or-before) / size
 *           (both optionally x100, at the target's printed scale)
 *   ntile   bucket 1..k over the ordering (SQL balanced buckets or
 *           ceil(ordinal*k/n)); the bucket may be printed as text labels
 *   share   source / SUM(source) or source / MAX(source) over the
 *           partition (x1 or x100, at the printed scale, half-up/trunc)
 * The partition is the whole table or one categorical column. Up to
 * BATHMOS_MAX_EXCEPTIONS rows per drop may be shipped verbatim. Degenerate
 * ordinal fits whose primary key ties cover >50% of a partition (a file-
 * order counter in disguise — METRON/APOGRAPHE territory) are refused.
 * Sources and partition columns are never dropped; <= BATHMOS_MAX_DROPS.
 *
 * The reduced table is coded by the cheapest measured of DAEDALUS,
 * AKOLOUTHIA-2 and APOGRAPHE; the candidate must beat AKOLOUTHIA-2 and
 * APOGRAPHE on the source, then the full TAGSTACK + SIBLING-TEMPLATE
 * frontier, strictly and byte-exactly, else the measured best parent is
 * returned instead (house gate, as in SYLLOGISMOS/ZYGON).
 *
 * Prior art (honest): window functions are SQL:2003 database machinery;
 * order-statistics and aggregate columns as *compression* structure are
 * not treated by the functional-dependency compressors (SPARTAN,
 * DeepSqueeze, Blitzcrank), whose dependencies are row-local. For
 * stating a fitted window law in-band for one-chat LLM recomputation —
 * the reader sorts each partition, or sums it — honestly none found.
 *
 * Greedy/search: law enumeration per (target, source, partition) is
 * bounded and deterministic with exact per-row verification; the drop
 * set is chosen greedily by true rendered contract + reduced tokens.
 * It is not a joint optimum. Emission is the measured house gate.
 *
 * Time/CPU: CPU-bound. Planner caps (400,000 code units, 20,000 rows,
 * 64 columns, BATHMOS_MAX_WORK) bound the fit; inherited parent/frontier
 * encodes dominate with no wrapper-wide cap, so deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const BATHMOS_MAX_CHARS = 400_000;
export const BATHMOS_MAX_ROWS = 20_000;
export const BATHMOS_MAX_COLS = 64;
export const BATHMOS_MIN_DATA_ROWS = 12;
export const BATHMOS_MAX_DROPS = 4;
export const BATHMOS_MAX_EXCEPTIONS = 3;
export const BATHMOS_MAX_PARTITIONS = 128;
export const BATHMOS_MAX_WORK = 120_000_000;

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
  if (rows.length < minDataRows + 1 || rows.length > BATHMOS_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < minCols || cols > BATHMOS_MAX_COLS) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Number styles (plain / German), exact scaled BigInt — house template
// ---------------------------------------------------------------------------


export type BathmosStyle = 'plain' | 'de';

const PLAIN_RE = /^-?(\d+)(?:\.(\d+))?$/;
const DE_GROUPED_RE = /^-?(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/;
const DE_PLAIN_RE = /^-?(\d+)(?:,(\d+))?$/;

function parseStyled(s: string, style: BathmosStyle, grouped: boolean): { v: bigint; scale: number } | null {
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

function renderStyled(v: bigint, scale: number, style: BathmosStyle, grouped: boolean): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let intPart = scale === 0 ? a : a.slice(0, a.length - scale);
  const fracPart = scale === 0 ? '' : a.slice(a.length - scale);
  if (style === 'de' && grouped) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sep = style === 'de' ? ',' : '.';
  return (neg ? '-' : '') + intPart + (scale === 0 ? '' : sep + fracPart);
}

function parseColumn(
  values: string[], style: BathmosStyle, grouped: boolean,
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

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export interface BathmosKey {
  kind: 'col' | 'ratio' | 'text';
  a: number;
  b?: number;
  dir: 'asc' | 'desc';
}

export interface BathmosDrop {
  col: number;
  headerName: string;
  family: 'rank' | 'pctrank' | 'cume' | 'ntile' | 'share';
  rankKind?: 'comp' | 'dense' | 'ord';
  partition: number; // -1 = whole table
  keys: BathmosKey[];
  srcCol?: number;
  agg?: 'sum' | 'max';
  factor: 1 | 100;
  k?: number;
  ntileMode?: 'sql' | 'ceil';
  labels?: string[];
  mode: 'half-up' | 'trunc';
  scale: number;
  exceptions: { row: number; field: string }[];
}

export interface BathmosSpec {
  v: 1;
  delimiter: string;
  style: BathmosStyle;
  grouped: boolean;
  drops: BathmosDrop[];
}

export interface BathmosPlan {
  spec: BathmosSpec;
  reducedText: string;
  contract: string;
}

interface NumColInfo { col: number; cells: (bigint | null)[]; scale: number }

// ---------------------------------------------------------------------------
// Exact key comparison. A numeric cell is a scaled bigint (value = cell /
// 10^scale); a ratio key compares A/B exactly by cross-multiplication
// (denominators are required positive, checked at fit time).
// ---------------------------------------------------------------------------

type KeyVals = { num: bigint; den: bigint }[]; // per data row, value = num/den

function keyValues(key: BathmosKey, numsByCol: Map<number, NumColInfo>, R: number): KeyVals | null {
  const A = numsByCol.get(key.a);
  if (!A) return null;
  const out: KeyVals = new Array(R);
  if (key.kind === 'col') {
    for (let i = 0; i < R; i++) {
      const c = A.cells[i];
      if (c === null) return null;
      out[i] = { num: c, den: pow10(A.scale) };
    }
    return out;
  }
  if (key.kind === 'ratio') {
    const B = numsByCol.get(key.b!);
    if (!B) return null;
    for (let i = 0; i < R; i++) {
      const a = A.cells[i], b = B.cells[i];
      if (a === null || b === null || b <= 0n) return null;
      out[i] = { num: a * pow10(B.scale), den: b * pow10(A.scale) };
    }
    return out;
  }
  return null; // text keys handled separately
}

function cmpRat(x: { num: bigint; den: bigint }, y: { num: bigint; den: bigint }): number {
  const l = x.num * y.den, r = y.num * x.den;
  return l < r ? -1 : l > r ? 1 : 0;
}

interface FitCtx {
  R: number;
  dataVals: string[][];
  numsByCol: Map<number, NumColInfo>;
  work: { n: number };
}

/** Predicted target cells (scaled bigints at target scale) for one law, or null. */
function predictDrop(drop: Omit<BathmosDrop, 'exceptions'>, ctx: FitCtx): (bigint | string)[] | null {
  const { R, dataVals, numsByCol, work } = ctx;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < R; i++) {
    const gk = drop.partition < 0 ? '' : dataVals[drop.partition]![i]!;
    const g = groups.get(gk);
    if (g) g.push(i); else groups.set(gk, [i]);
  }
  const out: (bigint | string)[] = new Array(R);

  if (drop.family === 'share') {
    const S = numsByCol.get(drop.srcCol!);
    if (!S) return null;
    for (const g of groups.values()) {
      let aggNum = 0n; let aggDen = pow10(S.scale);
      if (drop.agg === 'sum') {
        for (const i of g) { const c = S.cells[i]; if (c === null) return null; aggNum += c; work.n++; }
      } else {
        let first = true;
        for (const i of g) { const c = S.cells[i]; if (c === null) return null; if (first || c > aggNum) aggNum = c; first = false; work.n++; }
      }
      if (aggNum === 0n) return null;
      for (const i of g) {
        const c = S.cells[i]!;
        // value = factor * (c/aggDen) / (aggNum/aggDen) = factor*c/aggNum
        out[i] = roundRat(BigInt(drop.factor) * c * pow10(drop.scale), aggNum, drop.mode);
        work.n++;
      }
    }
    return out;
  }

  // ordering families
  const primary = drop.keys[0]!;
  const kv = keyValues(primary, numsByCol, R);
  if (!kv) return null;
  const tieKv: ({ vals: KeyVals; dir: 'asc' | 'desc' } | { text: string[]; dir: 'asc' | 'desc' })[] = [];
  for (let k = 1; k < drop.keys.length; k++) {
    const kk = drop.keys[k]!;
    if (kk.kind === 'text') tieKv.push({ text: dataVals[kk.a]!, dir: kk.dir });
    else { const v = keyValues(kk, numsByCol, R); if (!v) return null; tieKv.push({ vals: v, dir: kk.dir }); }
  }
  const dirSign = primary.dir === 'asc' ? 1 : -1;
  for (const g of groups.values()) {
    const order = [...g].sort((x, y) => {
      const c0 = cmpRat(kv[x]!, kv[y]!) * dirSign;
      if (c0 !== 0) return c0;
      for (const tk of tieKv) {
        let c: number;
        if ('vals' in tk) c = cmpRat(tk.vals[x]!, tk.vals[y]!);
        else c = tk.text[x]! < tk.text[y]! ? -1 : tk.text[x]! > tk.text[y]! ? 1 : 0;
        if (c !== 0) return tk.dir === 'asc' ? c : -c;
      }
      return x - y; // stable: original row order
    });
    const n = order.length;
    let comp = 0, dense = 0;
    for (let pos = 0; pos < n; pos++) {
      const i = order[pos]!;
      if (pos === 0 || cmpRat(kv[i]!, kv[order[pos - 1]!]!) !== 0) { comp = pos + 1; dense++; }
      work.n++;
      if (drop.family === 'rank') {
        out[i] = BigInt(drop.rankKind === 'comp' ? comp : drop.rankKind === 'dense' ? dense : pos + 1);
      } else if (drop.family === 'pctrank') {
        out[i] = n <= 1 ? 0n : roundRat(BigInt(drop.factor) * BigInt(comp - 1) * pow10(drop.scale), BigInt(n - 1), drop.mode);
      } else if (drop.family === 'cume') {
        // rows ranked at-or-before this row's peer group: end index of the tie block
        let end = pos + 1;
        while (end < n && cmpRat(kv[order[end]!]!, kv[i]!) === 0) end++;
        out[i] = roundRat(BigInt(drop.factor) * BigInt(end) * pow10(drop.scale), BigInt(n), drop.mode);
      } else { // ntile
        const k = drop.k!;
        let bucket: number;
        if (drop.ntileMode === 'sql') {
          const base = Math.floor(n / k), rem = n % k;
          // first `rem` buckets have base+1 rows
          const bigRows = rem * (base + 1);
          bucket = pos < bigRows ? Math.floor(pos / (base + 1)) + 1 : rem + Math.floor((pos - bigRows) / Math.max(1, base)) + 1;
        } else {
          bucket = Math.min(k, Math.floor(((pos + 1) * k + n - 1) / n));
        }
        out[i] = drop.labels ? drop.labels[bucket - 1]! : BigInt(bucket);
      }
    }
  }
  return out;
}

function countMismatches(
  pred: (bigint | string)[], tgtCells: (bigint | null)[], tgtVals: string[], isText: boolean,
): { row: number }[] {
  const bad: { row: number }[] = [];
  for (let i = 0; i < pred.length; i++) {
    const ok = isText ? pred[i] === tgtVals[i] : pred[i] === tgtCells[i];
    if (!ok) bad.push({ row: i });
  }
  return bad;
}

function tryLaw(
  base: Omit<BathmosDrop, 'exceptions'>, ctx: FitCtx,
  tgtCells: (bigint | null)[], tgtVals: string[], tgtRaw: string[], isText: boolean,
): BathmosDrop | null {
  if (ctx.work.n > BATHMOS_MAX_WORK) return null;
  const pred = predictDrop(base, ctx);
  if (!pred) return null;
  const bad = countMismatches(pred, tgtCells, tgtVals, isText);
  if (bad.length > BATHMOS_MAX_EXCEPTIONS) return null;
  return { ...base, exceptions: bad.map((b) => ({ row: b.row, field: tgtRaw[b.row]! })) };
}

function fitTarget(
  tgt: NumColInfo | null, tgtCol: number, tgtVals: string[], tgtRaw: string[],
  ctx: FitCtx, partitions: number[], headerName: string,
): BathmosDrop[] {
  const { R, numsByCol, work } = ctx;
  const out: BathmosDrop[] = [];
  const isText = tgt === null;
  const tgtCells: (bigint | null)[] = tgt ? tgt.cells : new Array(R).fill(null);
  const tgtScale = tgt ? tgt.scale : 0;

  const groupsOf = (p: number): number[][] => {
    const m = new Map<string, number[]>();
    for (let i = 0; i < R; i++) {
      const gk = p < 0 ? '' : ctx.dataVals[p]![i]!;
      const g = m.get(gk); if (g) g.push(i); else m.set(gk, [i]);
    }
    return [...m.values()];
  };

  for (const partition of partitions) {
    if (work.n > BATHMOS_MAX_WORK) break;
    const groups = groupsOf(partition);
    if (groups.some((g) => g.length < 4)) continue;

    // ---- share family (numeric targets with a decimal scale or integers)
    if (!isText) {
      for (const s of numsByCol.values()) {
        if (s.col === tgtCol || s.col === partition) continue;
        if (s.cells.some((c) => c === null)) continue;
        for (const agg of ['sum', 'max'] as const) {
          for (const factor of [1, 100] as const) {
            for (const mode of ['half-up', 'trunc'] as const) {
              const d = tryLaw({
                col: tgtCol, headerName, family: 'share', partition, keys: [], srcCol: s.col,
                agg, factor, mode, scale: tgtScale,
              }, ctx, tgtCells, tgtVals, tgtRaw, false);
              if (d) { out.push(d); }
            }
          }
        }
      }
    }

    // ---- ordering families
    // prefilter: rank targets are integers 1..n per group; ntile labels small set
    const distinctTgt = new Set(tgtVals);
    const maxGroup = Math.max(...groups.map((g) => g.length));
    const rankLike = !isText && tgtScale === 0 && tgtCells.every((c) => c !== null && c >= 1n && c <= BigInt(maxGroup));
    const decimalLike = !isText && tgtScale > 0;
    const labelLike = isText && distinctTgt.size >= 2 && distinctTgt.size <= 20;
    if (!rankLike && !decimalLike && !labelLike) continue;

    const primaries: BathmosKey[] = [];
    for (const s of numsByCol.values()) {
      if (s.col === tgtCol || s.col === partition) continue;
      if (s.cells.some((c) => c === null)) continue;
      primaries.push({ kind: 'col', a: s.col, dir: 'asc' }, { kind: 'col', a: s.col, dir: 'desc' });
    }
    if (rankLike) {
      const cols = [...numsByCol.values()].filter((s) => s.col !== tgtCol && s.col !== partition && !s.cells.some((c) => c === null));
      for (const A of cols) for (const B of cols) {
        if (A.col === B.col) continue;
        if (B.cells.some((c) => c !== null && c <= 0n)) continue;
        primaries.push({ kind: 'ratio', a: A.col, b: B.col, dir: 'desc' }, { kind: 'ratio', a: A.col, b: B.col, dir: 'asc' });
      }
    }

    interface OrdCand { keys: BathmosKey[]; bad: number }
    const ordCands: OrdCand[] = [];
    for (const primary of primaries) {
      if (work.n > BATHMOS_MAX_WORK) break;
      // tie-heavy primaries make every ordering family a file-order counter
      {
        const kv0 = keyValues(primary, numsByCol, R);
        if (!kv0) continue;
        let tieHeavy = false;
        for (const g of groups) {
          const counts = new Map<string, number>();
          for (const i of g) { const kk = `${kv0[i]!.num}/${kv0[i]!.den}`; counts.set(kk, (counts.get(kk) ?? 0) + 1); }
          if (Math.max(...counts.values()) * 2 > g.length) { tieHeavy = true; break; }
        }
        if (tieHeavy) continue;
      }
      // degeneracy guard for ordinal: primary tie mass per group
      if (rankLike) {
        for (const rankKind of ['comp', 'dense', 'ord'] as const) {
          const base: Omit<BathmosDrop, 'exceptions'> = {
            col: tgtCol, headerName, family: 'rank', rankKind, partition, keys: [primary],
            factor: 1, mode: 'half-up', scale: 0,
          };
          const pred = predictDrop(base, ctx);
          if (!pred) break;
          const bad = countMismatches(pred, tgtCells, tgtVals, false);
          if (rankKind === 'ord') {
            if (bad.length <= Math.max(BATHMOS_MAX_EXCEPTIONS, Math.floor(R / 4))) ordCands.push({ keys: [primary], bad: bad.length });
            if (bad.length <= BATHMOS_MAX_EXCEPTIONS) {
              // refuse file-order counters: >50% of any group tied on primary
              const kv = keyValues(primary, numsByCol, R)!;
              let degenerate = false;
              for (const g of groups) {
                const counts = new Map<string, number>();
                for (const i of g) { const k = `${kv[i]!.num}/${kv[i]!.den}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
                if (Math.max(...counts.values()) * 2 > g.length) { degenerate = true; break; }
              }
              if (!degenerate) out.push({ ...base, exceptions: bad.map((b) => ({ row: b.row, field: tgtRaw[b.row]! })) });
            }
          } else if (bad.length <= BATHMOS_MAX_EXCEPTIONS) {
            out.push({ ...base, exceptions: bad.map((b) => ({ row: b.row, field: tgtRaw[b.row]! })) });
          }
        }
        // ntile (integer targets 1..k, k small relative to group size)
        const kmax = Math.max(...tgtCells.map((c) => Number(c ?? 0n)));
        // buckets must actually bucket: k = group size is ordinal rank in
        // disguise (and a file-order counter when the key is tied)
        if (kmax >= 2 && kmax <= 100 && groups.every((g) => g.length >= 2 * kmax)) {
          for (const ntileMode of ['sql', 'ceil'] as const) {
            const d = tryLaw({
              col: tgtCol, headerName, family: 'ntile', partition, keys: [primary], factor: 1,
              k: kmax, ntileMode, mode: 'half-up', scale: 0,
            }, ctx, tgtCells, tgtVals, tgtRaw, false);
            if (d) out.push(d);
          }
        }
      }
      if (decimalLike) {
        for (const family of ['pctrank', 'cume'] as const) {
          for (const factor of [1, 100] as const) {
            for (const mode of ['half-up', 'trunc'] as const) {
              const d = tryLaw({
                col: tgtCol, headerName, family, partition, keys: [primary], factor, mode, scale: tgtScale,
              }, ctx, tgtCells, tgtVals, tgtRaw, false);
              if (d) out.push(d);
            }
          }
        }
      }
      if (labelLike && groups.every((g) => g.length >= 2 * distinctTgt.size)) {
        // labels ordered by the bucket they occupy under this primary
        const k = distinctTgt.size;
        for (const ntileMode of ['sql', 'ceil'] as const) {
          const probe: Omit<BathmosDrop, 'exceptions'> = {
            col: tgtCol, headerName, family: 'ntile', partition, keys: [primary], factor: 1,
            k, ntileMode, mode: 'half-up', scale: 0,
          };
          const pred = predictDrop(probe, ctx);
          if (!pred) continue;
          const byBucket = new Map<number, string>();
          let consistent = true;
          for (let i = 0; i < R; i++) {
            const b = Number(pred[i] as bigint);
            const cur = byBucket.get(b);
            if (cur === undefined) byBucket.set(b, tgtVals[i]!);
            else if (cur !== tgtVals[i]) { consistent = false; break; }
          }
          if (!consistent || byBucket.size !== k) continue;
          const labels = Array.from({ length: k }, (_, i) => byBucket.get(i + 1)!);
          if (labels.some((l) => l === undefined)) continue;
          const d = tryLaw({ ...probe, labels }, ctx, tgtCells, tgtVals, tgtRaw, true);
          if (d) out.push(d);
        }
      }
    }

    // ---- ordinal tiebreakers: greedily extend the best primaries
    if (rankLike && ordCands.length) {
      ordCands.sort((a, b) => a.bad - b.bad);
      const tieCands: BathmosKey[] = [];
      for (const s of numsByCol.values()) {
        if (s.col === tgtCol || s.col === partition) continue;
        tieCands.push({ kind: 'col', a: s.col, dir: 'asc' }, { kind: 'col', a: s.col, dir: 'desc' });
      }
      for (let c = 0; c < ctx.dataVals.length; c++) {
        if (c === tgtCol || c === partition || numsByCol.has(c)) continue;
        tieCands.push({ kind: 'text', a: c, dir: 'asc' }, { kind: 'text', a: c, dir: 'desc' });
      }
      for (const cand of ordCands.slice(0, 6)) {
        if (cand.bad <= BATHMOS_MAX_EXCEPTIONS) continue;
        let keys = [...cand.keys];
        let bestBad = cand.bad;
        for (let round = 0; round < 2 && bestBad > BATHMOS_MAX_EXCEPTIONS; round++) {
          let bestKey: BathmosKey | null = null;
          for (const tk of tieCands) {
            if (keys.some((k) => k.a === tk.a)) continue;
            if (work.n > BATHMOS_MAX_WORK) break;
            const pred = predictDrop({
              col: tgtCol, headerName, family: 'rank', rankKind: 'ord', partition,
              keys: [...keys, tk], factor: 1, mode: 'half-up', scale: 0,
            }, ctx);
            if (!pred) continue;
            const bad = countMismatches(pred, tgtCells, tgtVals, false).length;
            if (bad < bestBad) { bestBad = bad; bestKey = tk; }
          }
          if (!bestKey) break;
          keys = [...keys, bestKey];
        }
        if (bestBad <= BATHMOS_MAX_EXCEPTIONS) {
          const d = tryLaw({
            col: tgtCol, headerName, family: 'rank', rankKind: 'ord', partition, keys,
            factor: 1, mode: 'half-up', scale: 0,
          }, ctx, tgtCells, tgtVals, tgtRaw, false);
          if (d) out.push(d);
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reduced text / restore
// ---------------------------------------------------------------------------

function buildReduced(table: ParsedTable, spec: BathmosSpec): string {
  const dropped = new Set(spec.drops.map((d) => d.col));
  return table.rows.map((r, li) =>
    r.fields.filter((_, ci) => !dropped.has(ci)).join(spec.delimiter) + table.eols[li]!,
  ).join('');
}

function renderFieldSimple(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function bathmosRestore(reducedText: string, spec: BathmosSpec): string {
  const table = parseTable(reducedText, spec.delimiter, 1, 1);
  if (!table) throw new Error('BATHMOS: reduced text does not parse');
  const R = table.rows.length - 1;
  const droppedSorted = [...spec.drops].sort((a, b) => a.col - b.col);
  const droppedSet = new Set(droppedSorted.map((d) => d.col));
  const reducedIdx = (finishedCol: number): number =>
    finishedCol - [...droppedSet].filter((c) => c < finishedCol).length;

  // numeric columns of the REDUCED table, keyed by finished-table index
  const numsByCol = new Map<number, NumColInfo>();
  const finishedCols = table.rows[0]!.values.length + droppedSet.size;
  for (let c = 0; c < finishedCols; c++) {
    if (droppedSet.has(c)) continue;
    const vals = table.rows.slice(1).map((r) => r.values[reducedIdx(c)]!);
    const pc = parseColumn(vals, spec.style, spec.grouped);
    if (pc) numsByCol.set(c, { col: c, cells: pc.cells, scale: pc.scale });
  }
  const dataVals: string[][] = [];
  for (let c = 0; c < finishedCols; c++) {
    dataVals.push(droppedSet.has(c)
      ? new Array(R).fill('')
      : table.rows.slice(1).map((r) => r.values[reducedIdx(c)]!));
  }
  const ctx: FitCtx = { R, dataVals, numsByCol, work: { n: 0 } };

  const finished: string[][] = table.rows.map((r) => [...r.fields]);
  for (const drop of droppedSorted) {
    const { exceptions, ...base } = drop;
    const pred = predictDrop(base, ctx);
    if (!pred) throw new Error('BATHMOS: law does not apply to reduced text');
    const exc = new Map(exceptions.map((e) => [e.row, e.field]));
    const pos = reducedIdx(drop.col);
    finished[0]!.splice(pos, 0, renderFieldSimple(drop.headerName, spec.delimiter));
    for (let i = 0; i < R; i++) {
      const field = exc.has(i)
        ? exc.get(i)!
        : typeof pred[i] === 'string'
          ? renderFieldSimple(pred[i] as string, spec.delimiter)
          : renderStyled(pred[i] as bigint, drop.scale, spec.style, spec.grouped);
      finished[i + 1]!.splice(pos, 0, field);
    }
    droppedSet.delete(drop.col);
  }
  return finished.map((fs, li) => fs.join(spec.delimiter) + table.eols[li]!).join('');
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

function delimName(d: string): string {
  return d === ',' ? 'comma' : d === '\t' ? 'tab' : d === ';' ? 'semicolon' : 'pipe';
}

function buildContract(table: ParsedTable, spec: BathmosSpec): string {
  const header = table.rows[0]!.values;
  const refOf = (c: number): string => {
    const name = header[c]!;
    const safe = name !== '' && !/[{}\";]/.test(name) && header.filter((h) => h === name).length === 1;
    return safe ? `{${name}}` : `field ${c + 1}`;
  };
  const keyText = (k: BathmosKey): string =>
    k.kind === 'ratio' ? `${refOf(k.a)}/${refOf(k.b!)}` : refOf(k.a);
  const partText = (p: number): string => (p < 0 ? 'over all rows' : `within each ${refOf(p)} group`);
  const items = spec.drops.map((d) => {
    const namePart = d.headerName === '' ? '(empty name)' : `"${d.headerName}"`;
    let law: string;
    if (d.family === 'share') {
      const aggText = d.agg === 'sum' ? `the sum of ${refOf(d.srcCol!)}` : `the largest ${refOf(d.srcCol!)}`;
      law = `${d.factor === 100 ? '100 × ' : ''}${refOf(d.srcCol!)} / (${aggText} ${partText(d.partition)}) (${d.scale} decimals${d.mode === 'trunc' ? 'T' : ''})`;
    } else {
      const ordText = d.keys.map((k) => `${keyText(k)} ${k.dir === 'asc' ? 'ascending' : 'descending'}`).join(', then ');
      if (d.family === 'rank') {
        const kindText = d.rankKind === 'comp'
          ? 'competition rank (ties share a rank, then ranks skip: 1,2,2,4)'
          : d.rankKind === 'dense'
            ? 'dense rank (ties share a rank, no skips: 1,2,2,3)'
            : 'ordinal rank (1,2,3,...; remaining ties keep original row order)';
        law = `${partText(d.partition)}, the ${kindText} ordering rows by ${ordText}`;
      } else if (d.family === 'pctrank') {
        law = `${partText(d.partition)}, (competition rank by ${ordText} minus 1) / (group size minus 1)${d.factor === 100 ? ' × 100' : ''} (${d.scale} decimals${d.mode === 'trunc' ? 'T' : ''})`;
      } else if (d.family === 'cume') {
        law = `${partText(d.partition)}, (rows ranked at-or-before this row ordering by ${ordText}, ties counted together) / group size${d.factor === 100 ? ' × 100' : ''} (${d.scale} decimals${d.mode === 'trunc' ? 'T' : ''})`;
      } else {
        const modeText = d.ntileMode === 'sql'
          ? `split the ordered group into ${d.k} buckets as equal as possible, larger buckets first`
          : `bucket = smallest integer >= ordinal x ${d.k} / group size`;
        law = `${partText(d.partition)}, ordering rows by ${ordText}: ${modeText}${d.labels ? `, buckets labelled ${d.labels.join(', ')}` : ''}`;
      }
    }
    let s = `field ${d.col + 1} ${namePart}: ${law}`;
    if (d.exceptions.length) {
      s += ` [except ${d.exceptions.map((e) => `data row ${e.row + 1} = ${e.field}`).join(', ')}]`;
    }
    return s;
  });
  return `BATHMOS: after decoding below, in the ${delimName(spec.delimiter)}-separated table insert as header field and value in every row: ${items.join('; ')}. Round each computed decimal value to the stated decimals, halves away from zero (T = truncate toward zero instead). {x} means that row's decoded {x}. Change nothing else.`;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function bathmosPlan(text: string, enc: EncodingName = 'o200k_base'): BathmosPlan | null {
  if (text.length === 0 || text.length > BATHMOS_MAX_CHARS) return null;
  const work = { n: 0 };

  for (const delim of [',', '\t', ';', '|']) {
    const table = parseTable(text, delim, BATHMOS_MIN_DATA_ROWS, 3);
    if (!table) continue;
    const header = table.rows[0]!.values;
    const nCols = header.length;
    if (nCols > BATHMOS_MAX_COLS) continue;
    const R = table.rows.length - 1;
    if (R > BATHMOS_MAX_ROWS) continue;
    const dataVals: string[][] = [];
    const dataRaw: string[][] = [];
    for (let c = 0; c < nCols; c++) {
      dataVals.push(table.rows.slice(1).map((r) => r.values[c]!));
      dataRaw.push(table.rows.slice(1).map((r) => r.fields[c]!));
    }

    const styleCands: { style: BathmosStyle; grouped: boolean }[] = [{ style: 'plain', grouped: false }];
    if (delim !== ',') styleCands.push({ style: 'de', grouped: true }, { style: 'de', grouped: false });

    for (const { style, grouped } of styleCands) {
      const numsByCol = new Map<number, NumColInfo>();
      for (let c = 0; c < nCols; c++) {
        const pc = parseColumn(dataVals[c]!, style, grouped);
        if (pc && pc.scale <= 6 && !pc.cells.some((x) => x === null)) {
          // the column must re-render byte-identically at its uniform scale
          let ok = true;
          for (let i = 0; i < R; i++) {
            if (renderStyled(pc.cells[i]!, pc.scale, style, grouped) !== dataVals[c]![i]) { ok = false; break; }
          }
          if (ok) numsByCol.set(c, { col: c, cells: pc.cells, scale: pc.scale });
        }
      }
      if (numsByCol.size < 2) continue;

      const partitions: number[] = [-1];
      for (let c = 0; c < nCols; c++) {
        const d = new Set(dataVals[c]).size;
        if (d >= 2 && d <= BATHMOS_MAX_PARTITIONS) partitions.push(c);
      }

      const ctx: FitCtx = { R, dataVals, numsByCol, work };
      const fits: BathmosDrop[] = [];
      for (let t = 0; t < nCols; t++) {
        if (work.n > BATHMOS_MAX_WORK) return null;
        if (renderFieldSimple(header[t]!, delim) !== table.rows[0]!.fields[t]) continue;
        if (/[{}\";]/.test(header[t]!)) continue;
        const tgt = numsByCol.get(t) ?? null;
        if (new Set(dataVals[t]).size < 2) continue; // constant columns are KOLUMN/APOGRAPHE territory
        if (!tgt && new Set(dataVals[t]).size > 20) continue; // text target: ntile labels only
        fits.push(...fitTarget(tgt, t, dataVals[t]!, dataRaw[t]!, ctx, partitions, header[t]!));
      }
      if (fits.length === 0) continue;

      const scoreOf = (drops: BathmosDrop[]): { score: number; plan: BathmosPlan } | null => {
        const spec: BathmosSpec = { v: 1, delimiter: delim, style, grouped, drops };
        const reducedText = buildReduced(table, spec);
        let restored: string;
        try { restored = bathmosRestore(reducedText, spec); } catch { return null; }
        if (restored !== text) return null;
        const contract = buildContract(table, spec);
        const score = countTokens(contract, enc) + countTokens(reducedText, enc);
        return { score, plan: { spec, reducedText, contract } };
      };

      const srcColsOf = (d: BathmosDrop): number[] => {
        const s = new Set<number>();
        if (d.partition >= 0) s.add(d.partition);
        if (d.srcCol !== undefined) s.add(d.srcCol);
        for (const k of d.keys) { s.add(k.a); if (k.b !== undefined) s.add(k.b); }
        return [...s];
      };

      const chosen: BathmosDrop[] = [];
      const usedSrc = new Set<number>();
      let chosenPlan: BathmosPlan | null = null;
      let chosenScore = countTokens(text, enc);
      while (chosen.length < BATHMOS_MAX_DROPS) {
        let roundBest: { score: number; plan: BathmosPlan; drop: BathmosDrop } | null = null;
        for (const drop of fits) {
          if (chosen.some((d) => d.col === drop.col)) continue;
          if (usedSrc.has(drop.col)) continue;
          if (srcColsOf(drop).some((c) => chosen.some((d) => d.col === c))) continue;
          const cand = scoreOf([...chosen, drop]);
          if (cand && cand.score < chosenScore && (!roundBest || cand.score < roundBest.score)) {
            roundBest = { ...cand, drop };
          }
        }
        if (!roundBest) break;
        chosen.push(roundBest.drop);
        for (const c of srcColsOf(roundBest.drop)) usedSrc.add(c);
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

export interface BathmosResult {
  codec: 'bathmos';
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
    throw new Error('BATHMOS AKOLOUTHIA-2 parent reported cost disagreed');
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
    throw new Error('BATHMOS DAEDALUS parent reported cost disagreed');
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
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('BATHMOS frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('BATHMOS TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('BATHMOS SIBLING reported cost disagreed');
  return {
    tokens: Math.min(frontierTokens, tagTokens, siblingTokens),
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function bathmosEncode(text: string, enc: EncodingName = 'o200k_base'): BathmosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = bathmosPlan(text, enc);
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
  ): BathmosResult => {
    const parent = measuredFallback();
    return {
      codec: 'bathmos',
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
  const candidateDecoded = bathmosRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'the BATHMOS candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured');
  }

  const frontier = frontierEncode(text, enc);
  if (candidateTokens >= frontier.tokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, true, frontier.tokens, frontier.comparison, 'the BATHMOS candidate did not beat the full measured frontier; returned the measured best direct parent');
  }

  const shape = plan.spec.drops.map((d) => `f${d.col + 1}(${d.family})`).join(',');
  return {
    codec: 'bathmos',
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