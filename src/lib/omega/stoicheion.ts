/**
 * src/lib/omega/stoicheion.ts — X74. ΣΤΟΙΧΕῖΟΝ (stoicheion), "element / letter".
 * =============================================================================
 *
 * THE MEASUREMENT THIS CODEC IS BUILT ON (bench/x74/floor.ts, this turn)
 * -----------------------------------------------------------------------------
 * Every codec in this stack indexes a document by TOKEN. DAEDALUS merges token
 * pairs, SYNKOPE folds glyphs, HYLE/BRACHYS/AUSTEROS put a table's cells in a
 * wire, APOGRAPHE/METRON model a column by a predictor or a generator,
 * STICHOMYTHIA prints a column from an affine program. All of them are
 * *row-major*: they read a record left to right and pay the tokenizer's price for
 * whatever mixture of characters that row happens to contain.
 *
 * Measured against the unreadable floor (brotli -q 11, converted to o200k tokens
 * at the same transport density), the stack's PROSE lanes are already at the
 * floor — kb-article 622 against a 608-token bound, llm-answer 674 vs 626,
 * node-help 863 vs 852, email-thread 488 vs 443 — while the WIDE-RECORD ops
 * lanes sit 40–60 % above it: ls-l-real 1497 vs 943, ps-aux-real 1051 vs 743,
 * findmnt 444 vs 335, ps-ef 315 vs 250, dpkg-l 674 vs 592. The prose axis is
 * closed by measurement. The wide-record axis is not, and no codec here attacks
 * it, because every one of them keeps the ROW as the unit of representation.
 *
 * THE MECHANIC, STATED ONCE
 * -----------------------------------------------------------------------------
 * A record line is not a string; it is a vector of cells drawn from a handful of
 * *situated alphabets*. The USER column of `ps` has 3 distinct values, the TTY
 * column 2, the STAT column 7, the MONTH column 12. But o200k has one alphabet
 * for all of them, so the row is priced by the tokenizer's GENERIC frequency
 * table rather than by the column's own entropy, and the same word costs one
 * token in one column and three in another depending on its neighbours.
 *
 * STOICHEION recomputes the document in the columns' own alphabets:
 *
 *   1. FOLD. Induce the fixed-width cut — the character offsets where a large
 *      fraction of lines carry a space. Cut every line there, right-trim each cell,
 *      and VERIFY the re-padded reconstruction byte for byte, line by line. Lines
 *      that do not reconstruct (a header, a total, a blank, a line with an
 *      interior gap) are stored literally and marked in a one-character-per-line
 *      row map. The tolerance is a SEARCH PARAMETER (1.00, .95, .90, .80), so a
 *      source that is not perfectly fixed-width still folds and pays only for
 *      the lines that deviate. Exactness is per line, never per file.
 *
 *   2. RECODE EACH COLUMN IN ITS OWN ALPHABET. For every column the encoder
 *      builds a finite candidate set and keeps the cheapest by MEASURED o200k
 *      tokens of its spec:
 *
 *        C"v"              one constant
 *        L"a","b",…        a literal list, one cell per row
 *        D"a","b";idx      the column's alphabet written ONCE, then one index
 *                          character per row, so `root root root root` costs a
 *                          third of a token per cell instead of 1.5
 *        R…;runs           the same with the index run-length-encoded
 *        A"pre"v+s*r"post" an arithmetic progression over printed numbers, with
 *                          the padding width and decimal count recovered from v
 *        T"v"@+ks          a fixed-step clock, ISO date or ISO stamp
 *        Y"a",…*           a repeating cycle
 *
 *      Everything after the alphabet costs one character per row, and o200k packs
 *      3–6 lowercase index characters into a token — the density a row-major wire
 *      cannot reach, because in a row those characters are separated by all the
 *      other columns' text.
 *
 *   3. GATE. `stoicheionDecode(message)` is run on the assembled message; the
 *      message ships only if it reproduces the source BYTE FOR BYTE and is
 *      strictly smaller than the parent frontier's complete message, which is
 *      computed in the same process by `tagstackEncode`. Otherwise the parent's
 *      message is returned unmodified. Nothing is claimed that was not decoded.
 *
 * WHAT IS NEW HERE, CHECKED AGAINST THE STACK
 * -----------------------------------------------------------------------------
 * APOGRAPHE/METRON predict a column from the row above (relative) or from a
 * generator with a declared sample (absolute). STICHOMYTHIA prints a column from
 * an affine program over a printed number. HYLE/BRACHYS/KANON copy cells into a
 * typed wire. HYDRA reorders rows, PAX-style. SRANK/SUPERBPE re-tokenise the
 * whole document. STADION removes padding and hands the normal form to the
 * frontier — which keeps the ROW as the unit and therefore cannot shorten the
 * row, only de-pad it.
 * The operation none of them performs is **replacing the vocabulary of a column
 * with an alphabet that the column itself defines, and charging one character
 * per row for it**. That is the mechanism here, and its price is measured, not
 * argued: see the receipts in bench/x74/receipts/.
 *
 * GREEDY? NO. TIME OR CPU? CPU.
 * -----------------------------------------------------------------------------
 * The fold is a total function of the source for a fixed tolerance and the
 * tolerance is enumerated, so stage 1 is a search over ≤ 4 folds. Column model
 * selection is an exact argmin over a finite candidate set, scored on the real
 * counter. There is no backtracking inside a column and no joint optimisation
 * across columns, so the honest description is **exact search per column, greedy
 * across columns**; that distinction is stated rather than blurred. No wall clock
 * is consulted. Cost is O(T·(L·P + R·C)) character work plus O(C·|candidates|)
 * counter calls, T ≤ 4, and the gate adds one parent encode.
 *
 * PRIOR ART, STATED NOT IMPLIED
 * -----------------------------------------------------------------------------
 * Dictionary coding of a column is as old as columnar storage: C-Store (Stonebraker
 * et al., VLDB 2005) and Abadi/Madden/Helfand, "Column-Stores vs. Row-Stores",
 * SIGMOD 2008, both store a column as dictionary codes; BtrBlocks (Kuschewski et
 * al., SIGMOD 2023) picks per-column encodings; ALP (Afroozeh et al., SIGMOD 2024)
 * scales decimal columns. What none of them has to solve, and this message format
 * does, is that the decoder is a READER of the message rather than a program that
 * owns a schema: the alphabet must be printed, it must be unambiguous against the
 * cells' own text, and the whole message must be smaller than a strong
 * token-oriented codec's message on the same bytes. Prior art in this repository:
 * STADION's width fold (reused, cited), STICHOMYTHIA's program family (the A/T/Y
 * arms are its shapes, re-derived here over trimmed cells), APOGRAPHE/METRON's
 * column models (relative/absolute predictors, NOT used: they need a schema-free
 * line machine this codec does not need). What is new is only the step those
 * cannot take: per-column alphabet substitution paid once, with a key short
 * enough that the substitution still wins after the key is paid for.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier as tagstackEncode, type TagstackResult } from './tagstack';

/** Index alphabet: 62 symbols keeps one row at one character. */
const IDX = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type StoicheionModelKind = 'C' | 'L' | 'D' | 'R' | 'A' | 'T' | 'Y';

export interface StoicheionColumn {
  kind: StoicheionModelKind;
  spec: string;
  /** measured o200k tokens of `spec` alone; a receipt, not a gate */
  tokens: number;
  /** distinct cells in the column */
  uniq: number;
}

export interface StoicheionResult {
  codec: 'stoicheion';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  rows: number;
  cols: number;
  literals: number;
  tolerance: number | null;
  widths: number[];
  columns: StoicheionColumn[];
  contractTokens: number;
  messageTokens: number;
  frontierTokens: number;
  frontierParent: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// 0. SMALL FORMAT TERMINALS
// ---------------------------------------------------------------------------

/** JSON string quoting: no newline can survive into a spec, and every cell is
 *  unambiguous against the commas and semicolons the message uses. */
const Q = (v: string): string => JSON.stringify(v);

/** Split a comma-joined list of JSON strings at top level. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let start = 0, inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === ',' && !inStr) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out;
}
const qlist = (vs: string[]): string => vs.map(Q).join(',');
const unqlist = (s: string): string[] => splitTop(s).map((x) => JSON.parse(x) as string);

function rle(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    out += `${s[i]}${j - i}.`;
    i = j;
  }
  return out;
}
function unrle(s: string): string {
  let out = '';
  const re = /(.)(\d+)\./gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out += m[1].repeat(Number(m[2]));
  return out;
}

// numeric formats -----------------------------------------------------------
interface NumFmt { units: number; dec: number; width: number }
function numParse(tok: string): NumFmt | null {
  if (!/^-?\d+(\.\d+)?$/.test(tok)) return null;
  const dot = tok.indexOf('.');
  const dec = dot < 0 ? 0 : tok.length - dot - 1;
  const neg = tok.startsWith('-');
  const digits = neg ? tok.slice(1) : tok;
  const intDigits = (dot < 0 ? digits : digits.slice(0, dot)).length;
  return { units: Math.round(Number(tok) * Math.pow(10, dec)), dec, width: intDigits };
}
function numRender(f: NumFmt, units: number): string {
  const neg = units < 0;
  const a = Math.abs(units);
  const out = f.dec === 0
    ? String(a).padStart(f.width, '0')
    : `${String(Math.floor(a / Math.pow(10, f.dec))).padStart(f.width, '0')}.${String(a % Math.pow(10, f.dec)).padStart(f.dec, '0')}`;
  return (neg ? '-' : '') + out;
}
function affixSplit(v: string): { pre: string; num: NumFmt; post: string } | null {
  const m = /^(.*?)(-?\d+(?:\.\d+)?)([^\d]*)$/s.exec(v);
  if (!m) return null;
  const num = numParse(m[2]);
  if (!num) return null;
  return { pre: m[1], num, post: m[3] };
}
function clockToSec(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
function secToClock(s: number): string {
  const h = Math.floor(s / 3600), m2 = Math.floor((s - h * 3600) / 60), s2 = s - h * 3600 - m2 * 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(h)}:${p(m2)}:${p(s2)}`;
}
interface Iso { at: number; shape: 'd' | 't' | 'tZ' }
function isoParse(v: string): Iso | null {
  let m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z?)$/.exec(v);
  if (m) {
    const at = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
    return { at, shape: m[7] ? 'tZ' : 't' };
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return { at: Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000, shape: 'd' };
  return null;
}
function isoRender(shape: Iso['shape'], at: number): string {
  const d = new Date(at * 1000);
  const p = (x: number) => String(x).padStart(2, '0');
  const day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  if (shape === 'd') return day;
  return `${day}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${shape === 'tZ' ? 'Z' : ''}`;
}

// ---------------------------------------------------------------------------
// 1. FOLD
// ---------------------------------------------------------------------------

export interface FoldResult {
  /** trimmed cells per table row, in source order */
  table: string[][];
  /** literal lines, in source order */
  literals: string[];
  /** one symbol per source line: 't' table row, 'x' literal line */
  map: string;
  widths: number[];
  /** alignment per column: '>' pad on the left (cell is ltrimmed), '<' pad on the
   *  right (cell is rtrimmed), '.' last column, raw remainder, no padding */
  align: string;
  tolerance: number;
  tail: boolean;
}

/**
 * Induce candidate cuts at a tolerance.
 *
 * The gap structure of a column printer is visible as a BLANK PROFILE: for each
 * character offset, the share of lines that have a space there (a short line
 * counts as blank). A maximal run of offsets above the tolerance share is a GAP,
 * and a gap has two edges: the field on its left ENDS at the run's first offset
 * (`a`) and the field on its right BEGINS at the run's last offset plus one
 * (`b+1`). Admitting both edges turns each gap into its own — empty — column,
 * which is not waste: it costs about one token, and in exchange the fields on
 * either side are cut exactly, with no trimming rule to get wrong. Which
 * candidates survive is then decided by MEASUREMENT (see `stoicheionPlan`), not
 * by this function, because whether a cut helps depends on how many distinct
 * values it produces, and that is a property of the data, not of the geometry.
 *
 * A candidate is admitted only when the character just outside the gap carries
 * content on a `ceil(n·tol)` share of lines. That is exactly the condition under
 * which one offset explains every line; where rows disagree about a field's width
 * the edge is not admitted, and the lines that then fail exactness become
 * literals rather than the fold being silently wrong.
 */
export interface FoldOptions {
  /** induce the cut on the body only; the leading lines become literals */
  skipHeader: number;
  /** induce the cut on lines no longer than this quantile of line lengths */
  outlierQuantile: number;
}

export interface CutSet {
  /** interior cut offsets, ascending, excluding 0 and maxLen */
  cuts: number[];
  maxLen: number;
  tolerance: number;
}

export function stoicheionCandidates(text: string, tolerance: number, opts: FoldOptions = { skipHeader: 0, outlierQuantile: 1 }, maxCuts = 40): CutSet | null {
  const tail = text.endsWith('\n');
  const lines = (tail ? text.slice(0, -1) : text).split('\n');
  if (lines.length < 3) return null;
  let maxLen = 0;
  for (const l of lines) if (l.length > maxLen) maxLen = l.length;
  if (maxLen < 8) return null;
  let induction = lines.slice(opts.skipHeader);
  if (opts.outlierQuantile < 1) {
    const lens = induction.filter((l) => l.length > 0).map((l) => l.length).sort((a, b) => a - b);
    if (lens.length) {
      const q = lens[Math.min(lens.length - 1, Math.floor(lens.length * opts.outlierQuantile))];
      induction = induction.filter((l) => l.length <= q);
    }
  }
  if (induction.length < 3) return null;
  const need = Math.ceil(induction.length * tolerance);
  const blank = new Int32Array(maxLen + 2);
  const content = new Int32Array(maxLen + 2);
  for (const l of induction) {
    for (let p = 0; p < l.length; p++) {
      if (l.charCodeAt(p) === 32) blank[p]++;
      else content[p]++;
    }
    for (let p = l.length; p <= maxLen; p++) blank[p]++;
  }
  const runs: Array<[number, number]> = [];
  for (let p = 1; p < maxLen; p++) {
    if (blank[p] < need) continue;
    if (blank[p - 1] >= need && runs.length) { runs[runs.length - 1][1] = p; continue; }
    runs.push([p, p]);
  }
  const admit = new Set<number>();
  for (const [a, b] of runs) {
    if (a > 0 && content[a - 1] >= need) admit.add(a);
    if (b + 1 < maxLen && content[b + 1] >= need) admit.add(b + 1);
  }
  const cuts = [...admit].sort((x, y) => x - y).slice(0, maxCuts);
  return { cuts, maxLen, tolerance };
}

/** Cut the lines at a cut set and keep the lines that reconstruct exactly.
 *
 *  Alignment is inferred per column from what actually reproduces the raw slice:
 *  a column whose raw cells never END in a space is stored LEFTTRIMMED and padded
 *  on the LEFT (this is the arm that makes `     42` cost the number and a width
 *  instead of the alignment spaces); otherwise it is stored RIGHTTRIMMED and
 *  padded on the right. A line that reconstructs under neither becomes a literal
 *  line. Exactness is per line and is checked here, never assumed. */
export function stoicheionFoldAt(text: string, cutSet: CutSet, maxSpans = 48): FoldResult | null {
  const tail = text.endsWith('\n');
  const lines = (tail ? text.slice(0, -1) : text).split('\n');
  const bounds = [0, ...cutSet.cuts.filter((c) => c > 0 && c < cutSet.maxLen), cutSet.maxLen];
  const spans: Array<[number, number]> = [];
  for (let b = 0; b + 1 < bounds.length; b++) spans.push([bounds[b], bounds[b + 1]]);
  if (spans.length < 2 || spans.length > maxSpans) return null;
  const widths = spans.map(([a, b]) => b - a);

  const slice = (line: string, c: number): string => {
    const [a, b] = spans[c];
    if (c === spans.length - 1) return a < line.length ? line.slice(a) : '';
    if (a >= line.length) return '';
    return line.slice(a, Math.min(b, line.length));
  };
  const trimStart = (x: string) => x.replace(/^ +/, '');
  const trimBoth = (x: string) => (x.trim() === '' ? '' : x.replace(/^ +/, '').replace(/ +$/, ''));
  const cellsFor = (line: string, align: string[]): string[] =>
    align.map((a, c) => (a === '>' ? trimStart(slice(line, c)) : trimBoth(slice(line, c))));
  const okFor = (cells: string[], line: string, align: string[]): boolean => {
    let re = '';
    for (let c = 0; c < spans.length; c++) {
      if (c === spans.length - 1) { re += cells[c]; break; }
      const pad = widths[c] - cells[c].length;
      if (pad < 0) return false;
      re += align[c] === '>' ? ' '.repeat(pad) + cells[c] : cells[c] + ' '.repeat(pad);
    }
    return re === line;
  };

  // per-column alignment by majority, two rounds
  const align: string[] = spans.map((_, c) => (c === spans.length - 1 ? '.' : '<'));
  for (let round = 0; round < 2; round++) {
    for (let c = 0; c + 1 < spans.length; c++) {
      const ar = align.slice(); ar[c] = '>';
      const al = align.slice(); al[c] = '<';
      let r = 0, l = 0;
      for (const line of lines) {
        if (!line) continue;
        if (okFor(cellsFor(line, ar), line, ar)) r++;
        if (okFor(cellsFor(line, al), line, al)) l++;
      }
      align[c] = r > l ? '>' : '<';
    }
  }

  const table: string[][] = [];
  const literals: string[] = [];
  let map = '';
  for (const line of lines) {
    const cells = line ? cellsFor(line, align) : [];
    if (line && okFor(cells, line, align) && cells.some((x) => x.length > 0)) { table.push(cells); map += 't'; }
    else { literals.push(line); map += 'x'; }
  }
  if (table.length < 3) return null;
  return { table, literals, map, widths, align: align.join(''), tolerance: cutSet.tolerance, tail };
}

// ---------------------------------------------------------------------------
// 2. COLUMN PROGRAMS
// ---------------------------------------------------------------------------

export interface ColModel {
  kind: StoicheionModelKind;
  spec: string;
  tokens: number;
  uniq: number;
  alpha?: string[];
  idx?: string;
}

/** Render one cell. The ONLY function that produces a cell's text. */
export function stoicheionRender(m: ColModel, r: number): string {
  switch (m.kind) {
    case 'C': return JSON.parse(m.spec.slice(1)) as string;
    case 'L': return unqlist(m.spec.slice(1))[r];
    case 'D': return m.alpha![IDX.indexOf(m.idx![r])];
    case 'R': return m.alpha![IDX.indexOf(unrle(m.idx!)[r])];
    case 'A': {
      const mm = /^A("(?:[^"\\]|\\.)*")(-?\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)\*r("(?:[^"\\]|\\.)*")$/s.exec(m.spec);
      if (!mm) throw new Error(`STOICHEION: bad A spec ${m.spec}`);
      const pre = JSON.parse(mm[1]) as string;
      const post = JSON.parse(mm[5]) as string;
      const base = numParse(mm[2])!;
      const step = Math.round(Number(mm[4]) * Math.pow(10, base.dec)) * (mm[3] === '-' ? -1 : 1);
      return pre + numRender(base, base.units + step * r) + post;
    }
    case 'T': {
      const mm = /^T(.*)@([+-])(\d+)$/s.exec(m.spec);
      if (!mm) throw new Error(`STOICHEION: bad T spec ${m.spec}`);
      const base = mm[1];
      const step = (mm[2] === '-' ? -1 : 1) * Number(mm[3]);
      const secs = clockToSec(base);
      if (secs !== null) return secToClock(secs + step * r);
      const iso = isoParse(base);
      if (iso) return isoRender(iso.shape, iso.at + step * r);
      throw new Error(`STOICHEION: bad T base ${base}`);
    }
    case 'Y': {
      const body = m.spec.slice(1).replace(/\*$/, '');
      const list = unqlist(body);
      return list[r % list.length];
    }
  }
}

export function stoicheionParseSpec(spec: string): ColModel {
  const kind = spec[0] as StoicheionModelKind;
  const uniq = 0;
  if (kind === 'D' || kind === 'R') {
    const i = spec.lastIndexOf(';');
    const alpha = unqlist(spec.slice(1, i));
    return { kind, spec, tokens: 0, uniq: alpha.length, alpha, idx: spec.slice(i + 1) };
  }
  return { kind, spec, tokens: 0, uniq };
}

/** Every model that reproduces `vals` EXACTLY, cheapest by measured tokens first. */
export function stoicheionFitColumn(vals: string[], enc: EncodingName): ColModel[] {
  const out: ColModel[] = [];
  const R = vals.length;
  const uniq = [...new Set(vals)];
  const add = (kind: StoicheionModelKind, spec: string, extra?: Partial<ColModel>) => {
    out.push({ kind, spec, tokens: countTokens(spec, enc), uniq: uniq.length, ...extra });
  };

  if (uniq.length === 1) add('C', `C${Q(vals[0])}`);
  add('L', `L${qlist(vals)}`);

  if (uniq.length <= IDX.length && uniq.length < R) {
    const idx = vals.map((v) => IDX[uniq.indexOf(v)]).join('');
    const alpha = qlist(uniq);
    add('D', `D${alpha};${idx}`, { alpha: uniq, idx });
    const r = rle(idx);
    if (r.length < idx.length) add('R', `R${alpha};${r}`, { alpha: uniq, idx: r });
  }

  if (R >= 3) {
    const parts = vals.map(affixSplit);
    if (parts.every((p) => p !== null)) {
      const p0 = parts[0]!;
      if (parts.every((p) => p!.pre === p0.pre && p!.post === p0.post && p!.num.dec === p0.num.dec)) {
        const step = parts[1]!.num.units - p0.num.units;
        const width = Math.min(...parts.map((p) => p!.num.width));
        const base: NumFmt = { ...p0.num, width };
        const okUnits = parts.every((p, i) => p!.num.units === p0.num.units + step * i);
        // padding survives only when the program prints back every value exactly
        const okPrint = parts.every((p, i) => numRender(base, base.units + step * i) === numRender(p!.num, p!.num.units));
        if (okUnits && okPrint) {
          const stepFmt: NumFmt = { units: Math.abs(step), dec: base.dec, width: 1 };
          add('A', `A${Q(p0.pre)}${numRender(base, base.units)}${step >= 0 ? '+' : '-'}${numRender(stepFmt, Math.abs(step))}*r${Q(p0.post)}`);
        }
      }
    }
    const isoT = vals.map(isoParse);
    if (isoT.every((x) => x !== null)) {
      const shapes = new Set(isoT.map((x) => x!.shape));
      if (shapes.size === 1) {
        const at0 = isoT[0]!.at;
        const step = isoT[1]!.at - at0;
        if (isoT.every((x, i) => x!.at === at0 + step * i) && isoRender(isoT[0]!.shape, at0) === vals[0]) {
          add('T', `T${vals[0]}@${step >= 0 ? '+' : '-'}${Math.abs(step)}`);
        }
      }
    }
    const clk = vals.map(clockToSec);
    if (clk.every((s) => s !== null)) {
      const s0 = clk[0] as number;
      const step = (clk[1] as number) - s0;
      if (clk.every((s, i) => s === s0 + step * i) && secToClock(s0) === vals[0]) {
        add('T', `T${vals[0]}@${step >= 0 ? '+' : '-'}${Math.abs(step)}`);
      }
    }
    for (let p = 1; p <= Math.min(8, Math.floor(R / 2)); p++) {
      const list = vals.slice(0, p);
      if (vals.every((v, i) => v === list[i % p])) { add('Y', `Y${qlist(list)}*`); break; }
    }
  }

  out.sort((a, b) => a.tokens - b.tokens || a.spec.length - b.spec.length || (a.kind < b.kind ? -1 : 1));
  return out;
}

// ---------------------------------------------------------------------------
// 3. MESSAGE FORMAT, ENCODE, DECODE
// ---------------------------------------------------------------------------

/** Row map is run-length encoded: `3t12x5t`. Two symbols, one integer each. */
function rleMap(map: string): string {
  let out = '';
  let i = 0;
  while (i < map.length) {
    let j = i;
    while (j < map.length && map[j] === map[i]) j++;
    out += `${j - i}${map[i]}`;
    i = j;
  }
  return out;
}
function unrleMap(s: string): string {
  const re = /(\d+)([tx])/g;
  let out = '';
  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) { out += m[2].repeat(Number(m[1])); consumed += m[0].length; }
  if (consumed !== s.length) throw new Error('STOICHEION: bad row map');
  return out;
}

export const STOICHEION_KEY =
  'X74 S. L1: S<rows>x<cols> widths. L2: map as <n><t|x> (t table row, x literal line). Then one spec per column: ' +
  'C"v" constant; L"a","b",… row list; D"a","b";idx alphabet then one index char per row; R same with idx as runs c<n>.; ' +
  'A"pre"v+s*r"post" prints v+s*r at row r in v\'s decimals and width; T"v"@+k steps k sec (clock, ISO date, ISO stamp); ' +
  'Y"a",…* cycles. Index chars: ' + IDX + '. Then one line per literal, prefixed x. ' +
  'Rebuild each table row by writing its cells in order, padding every cell but the last with spaces to its width; print literals as they are. Print only the result.';

export interface StoicheionPlan {
  fold: FoldResult;
  cols: ColModel[];
  message: string;
  tokens: number;
}

function assemble(fold: FoldResult, cols: ColModel[]): string {
  const head = `S${fold.table.length}x${cols.length} ${fold.widths.join(',')} ${fold.align}`;
  const parts = [head, rleMap(fold.map), ...cols.map((c) => c.spec), ...fold.literals.map((l) => `x${l}`)];
  return parts.join('\n') + (fold.tail ? '\n' : '');
}

/** Total inverse: returns the source bytes or throws. */
export function stoicheionDecode(message: string): string {
  const tail = message.endsWith('\n');
  const body = tail ? message.slice(0, -1) : message;
  const lines = body.split('\n');
  if (lines.length < 3) throw new Error('STOICHEION: too short');
  const hm = /^S(\d+)x(\d+) ?([\d,]*)(?: ([<>.]*))?$/.exec(lines[0]);
  if (!hm) throw new Error('STOICHEION: bad header');
  const rows = Number(hm[1]);
  const cols = Number(hm[2]);
  const widths = hm[3] === '' ? [] : hm[3].split(',').map(Number);
  if (widths.length !== cols) throw new Error('STOICHEION: width count');
  const align = (hm[4] ?? '>'.repeat(Math.max(0, cols - 1)) + '.').padEnd(cols, '.');
  const map = unrleMap(lines[1]);
  const tableRows = map.split('').filter((c) => c === 't').length;
  if (tableRows !== rows) throw new Error('STOICHEION: row count');
  const specs = lines.slice(2, 2 + cols);
  if (specs.length !== cols) throw new Error('STOICHEION: spec count');
  const models = specs.map(stoicheionParseSpec);
  const literals = lines.slice(2 + cols).map((l) => (l.startsWith('x') ? l.slice(1) : l));

  const out: string[] = [];
  let li = 0;
  let ri = 0;
  for (const sym of map) {
    if (sym === 'x') {
      if (li >= literals.length) throw new Error('STOICHEION: literal underflow');
      out.push(literals[li++]);
      continue;
    }
    if (ri >= rows) throw new Error('STOICHEION: row overflow');
    let line = '';
    for (let c = 0; c < cols; c++) {
      const cell = stoicheionRender(models[c], ri);
      if (c === cols - 1) { line += cell; break; }
      const pad = widths[c] - cell.length;
      if (pad < 0) throw new Error('STOICHEION: cell wider than column');
      line += align[c] === '>' ? ' '.repeat(pad) + cell : cell + ' '.repeat(pad);
    }
    out.push(line);
    ri++;
  }
  if (ri !== rows) throw new Error('STOICHEION: row underflow');
  if (li !== literals.length) throw new Error('STOICHEION: literal surplus');
  return out.join('\n') + (tail ? '\n' : '');
}

const TOLERANCES = [1, 0.95, 0.9, 0.8];
const FOLD_OPTS: Array<{ skipHeader: number; outlierQuantile: number }> = [
  { skipHeader: 0, outlierQuantile: 1 },
  { skipHeader: 1, outlierQuantile: 1 },
  { skipHeader: 2, outlierQuantile: 1 },
  { skipHeader: 3, outlierQuantile: 1 },
  { skipHeader: 0, outlierQuantile: 0.95 },
  { skipHeader: 1, outlierQuantile: 0.95 },
];

/**
 * The cut set is PRUNED BY MEASUREMENT, not by a clustering prior.
 *
 * Admitting both edges of every gap gives ~2·(k−1) candidate offsets for k
 * fields, and a subset of them is the right cut. The subset is found by dropping
 * offsets while the complete message gets cheaper: a stage-1 model per column
 * (constant / dictionary / run-length / arithmetic / clock / cycle / literal) is
 * fitted greedily, and the cost of the message is head + Σ spec. A cut is only
 * worth its column if the cells it exposes are cheaper to recode than the text it
 * removes, and that is exactly what this objective measures. Two passes, because
 * dropping one cut changes the cardinality of its neighbours.
 */
function stage1Cost(fold: FoldResult, enc: EncodingName): { cost: number; cols: ColModel[] } {
  const cols: ColModel[] = [];
  let cost = countTokens(`S${fold.table.length}x${fold.widths.length} ${fold.widths.join(',')} ${fold.align}`, enc);
  cost += countTokens(rleMap(fold.map), enc);
  if (fold.literals.length) cost += countTokens(fold.literals.join('\n'), enc);
  for (let c = 0; c < fold.widths.length; c++) {
    const vals = fold.table.map((r) => r[c]);
    const best = stoicheionFitColumn(vals, enc)[0];
    cols.push(best);
    cost += best.tokens;
  }
  return { cost, cols };
}

export interface StoicheionPlan {
  fold: FoldResult;
  cols: ColModel[];
  message: string;
  tokens: number;
}

function pruneCuts(text: string, base: CutSet, enc: EncodingName, maxSpans: number): FoldResult | null {
  let cuts = base.cuts.slice();
  let bestFold = stoicheionFoldAt(text, { ...base, cuts }, maxSpans);
  if (!bestFold) return null;
  let bestCost = stage1Cost(bestFold, enc).cost;
  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (let i = 0; i < cuts.length; i++) {
      const trial = cuts.filter((_, j) => j !== i);
      const f = stoicheionFoldAt(text, { ...base, cuts: trial }, maxSpans);
      if (!f) continue;
      const c = stage1Cost(f, enc).cost;
      if (c < bestCost) { bestCost = c; cuts = trial; bestFold = f; improved = true; break; }
    }
    if (!improved) break;
  }
  return bestFold;
}

export function stoicheionPlan(text: string, enc: EncodingName = 'o200k_base'): StoicheionPlan | null {
  let best: StoicheionPlan | null = null;
  for (const tol of TOLERANCES) for (const opts of FOLD_OPTS) {
    const cs = stoicheionCandidates(text, tol, opts);
    if (!cs) continue;
    const fold = pruneCuts(text, cs, enc, 48);
    if (!fold) continue;
    const { cols } = stage1Cost(fold, enc);
    const message = assemble(fold, cols);
    const tokens = countTokens(message, enc);
    if (!best || tokens < best.tokens) best = { fold, cols, message, tokens };
  }
  return best;
}

export function stoicheionEncode(text: string, enc: EncodingName = 'o200k_base'): StoicheionResult {
  const frontier: TagstackResult = tagstackEncode(text, enc);
  const refuse = (notes: string): StoicheionResult => ({
    codec: 'stoicheion',
    wire: frontier.message,
    message: frontier.message,
    decoded: frontier.decoded,
    exact: frontier.decoded === text,
    applied: false,
    rows: 0, cols: 0, literals: 0, tolerance: null, widths: [], columns: [],
    contractTokens: 0,
    messageTokens: frontier.messageTokens,
    frontierTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec,
    notes,
  });
  const plan = stoicheionPlan(text, enc);
  if (!plan) return refuse('stoicheion: no fold at any tolerance');
  let decoded: string;
  try { decoded = stoicheionDecode(plan.message); } catch (e) {
    return refuse(`stoicheion: decode error ${(e as Error).message}`);
  }
  if (decoded !== text) return refuse('stoicheion: decode mismatch — refused');
  const message = `${STOICHEION_KEY}\n${plan.message}`;
  const tokens = countTokens(message, enc);
  if (tokens >= frontier.messageTokens) {
    return refuse(`stoicheion loses: ${tokens} vs ${frontier.messageTokens} (${frontier.parentCodec})`);
  }
  return {
    codec: 'stoicheion',
    wire: plan.message,
    message,
    decoded,
    exact: true,
    applied: true,
    rows: plan.fold.table.length,
    cols: plan.cols.length,
    literals: plan.fold.literals.length,
    tolerance: plan.fold.tolerance,
    widths: plan.fold.widths,
    columns: plan.cols.map((c) => ({ kind: c.kind, spec: c.spec, tokens: c.tokens, uniq: c.uniq })),
    contractTokens: countTokens(STOICHEION_KEY, enc),
    messageTokens: tokens,
    frontierTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec,
    notes: `S${plan.fold.table.length}x${plan.cols.length} tol=${plan.fold.tolerance} lit=${plan.fold.literals.length} kinds=${plan.cols.map((c) => c.kind).join('')}`,
  };
}
