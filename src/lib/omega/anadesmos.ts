/**
 * ⟠ ANADESMOS (ἀνάδεσμος, "a binding again") — a message's BINDING is not sent: line cuts, column
 * padding, decimal scale and integer width are restored from one discovered descriptor line.
 * Layered over LAKONIKOS-D. Exact, self-verifying, identity-guarded. (X20)
 * =============================================================================
 * THE GAP
 * -----------------------------------------------------------------------------
 * A text has content (which characters, in which order) and *binding* (where the lines end, how
 * wide each column is, how many fraction digits a number carries). Every codec in this stack up
 * to now compresses content and copies binding. Binding is not free under a BPE tokenizer,
 * because a tokenizer bills per *boundary*, not per byte:
 *
 *   · a newline costs 1 o200k token, so a 200-line table pays ~200 tokens for its shape alone;
 *   · a trailing zero in "17.240000" costs 1 token; a leading zero in "007" costs ~0.7;
 *   · a padding run of 12 spaces costs ~4 tokens (chunk-sized), not 12/4.
 *
 * None of that is a *repeated literal*, so the DAEDALUS rule tape is blind to it: widths differ
 * per row and zero runs differ per cell. But it is all recoverable from a rule, and a rule costs
 * this decoder ~10-25 tokens ONCE and then buys every line. That asymmetry is the lane: a program
 * decoder gets rules free and bills data; a model decoder is billed for rules and can be handed
 * no data at all.
 *
 * WHAT IS NEW HERE / WHAT IS IMPORTED (disclosed; no other novelty claimed)
 * -----------------------------------------------------------------------------
 *  (1) ONE DESCRIPTOR LINE, MANY FAMILIES, EACH BILLED ONLY IF USED. These pieces existed here as
 *      separately-taxed codecs: STICHOS/PERIODOS (word wrap; 42-token fixed contract; their own
 *      report records H− as a general prose gain), PADTAB/PADTAB2 (column layout, shipped only
 *      inside PHALANX-A6/A7, which is not the frontier), ABACUS-M1 (digit grouping), STATHMOS
 *      (fixed decimal scale; one CSV lane, X17). The per-message *discovered combination* under one
 *      shared descriptor is what is new.
 *  (2) THE LINE-CUT FAMILY `nl`: cut every W characters, marker only on the short lines. Word wrap
 *      generalised to line-structured payloads, i.e. to exactly the inputs STICHOS refuses by
 *      construction (CRLF, TAB, ragged tables, CSV). This is the family that pays broadly.
 *  (3) INTEGER WIDTH `iw`: leading zeros of fixed-width columns — the mirror of STATHMOS's
 *      trailing zeros, with no codec here before.
 *  (4) `cols` is anchored by per-column field positions with a per-column alignment, so both
 *      left- and right-aligned columns and arbitrary gaps fold into one anchor list, and the region
 *      need not be rectangular (a line that fails is carried verbatim behind a marker). PADTAB
 *      blocks per maximal eligible run; here the grid is one list for the whole message.
 *  (5) `dp` = STATHMOS's rule generalised: any of four delimiters, discovered per message, admitted
 *      jointly with the other families instead of alone.
 *  (6) SCREEN-THEN-BILL: admission uses only token counts of the *source* (ms), so the expensive
 *      wire is built once rather than once per candidate. This is NOT a tournament.
 *
 * WIREFORMAT
 * -----------------------------------------------------------------------------
 * Line 1 of the transformed text (in-band, so the rule tape sees it too):
 *
 *    @nd [crlf] [sep=C] [dp=i:w,..] [iw=i:w,..] [cols=a,a,..:al+mk] [nl=W+mk | wrap=W]
 *
 * A part appears only when its family was admitted, so an unused family costs 0 tokens. `mk` is a
 * character absent from the input. The contract clause is compiled from the parts present.
 *
 * GATE
 * -----------------------------------------------------------------------------
 *  · Whole-message verification: after each stage the inverse cascade is run and byte-compared; a
 *    stage that does not reproduce exactly is dropped. No per-line trust, no "standard" step.
 *  · The transformed arm is taken only if M(transformed + clause) < M(LAKONIKOS-D on raw) AND the
 *    full decode reproduces the input; otherwise LAKONIKOS-D is returned unchanged. The codec
 *    therefore cannot cost more than the frontier entry it sits on.
 *  · Inputs whose first line begins `@nd ` or `@raw` are never transformed (escape).
 *  · Greedy: families are tried in dependency order and each is kept only while its own saving
 *    exceeds its own marginal descriptor+clause cost; inside a family every eligible position is
 *    marked. There is no subset search.
 *
 * TIME / CPU
 * -----------------------------------------------------------------------------
 * Screening is O(|text|) regex passes plus one live-tokenizer count per candidate family; the
 * cascade is milliseconds at 40 KB. The dominant cost is inherited: the wire is DAEDALUS-D, which
 * carries a wall-clock budget (constant under OMEGA_DET=1). Decode is linear.
 */
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosDualEncode } from './lakonikos-d';

export const ANADESMOS_MARK = '@nd ';
export const ANADESMOS_RAW = '@raw\n';
/** Marker candidates: visible, one o200k token each, disjoint from CHIRON's operators § ¶ × …  */
export const ANADESMOS_MARKS = ['¦', '◆', '⧫', '◊', '⁋', '⟂', '⬚', '※', '¤', '⁂'];
const DELIMS = [',', '|', ';', '\t'];

/* ========================================================================== *
 * 0. plumbing
 * ========================================================================== */
export interface NdRal {
  /** one character per column: l = flush left, r = flush right */
  al: string;
  /** 0-based character column where the first field starts */
  start: number;
  /** spaces between two columns in the original layout */
  gap: number;
  /** padded width of each column; absent when each column is exactly as wide as its widest entry */
  w?: number[];
  /** 0-based character column where the trailing remainder starts, when rows carry one */
  rest?: number;
}

export interface NdCols {
  /** per-column anchor: the field's start if it is left-aligned, its end if right-aligned */
  A: number[];
  /** 'l' | 'r' per column, same length as A */
  al: string;
  /** a line starting with this character is carried verbatim (marker removed by the reader) */
  mk: string;
}
export interface NdSeq {
  from: number;
  len: number;
  sep: string;
  step: number;
  start: number;
  pad: number;
  all: boolean;
}
export interface NdParams {
  crlf?: boolean;
  /** inclusive line range the column rules apply to; absent = every line */
  range?: { from: number; len: number };
  seq?: NdSeq;
  sep?: string;
  dp?: number[];
  iw?: number[];
  cols?: NdCols;
  /** whitespace-table re-flow: per-column alignment, first field column, optional remainder column */
  ral?: NdRal;
  nl?: { W: number };
  nlm?: { W: number; mk: string };
  wrap?: { W: number };
}
export type FamName = 'crlf' | 'seq' | 'sep' | 'dp' | 'iw' | 'cols' | 'ral' | 'nl' | 'nlm' | 'wrap';

export function ndPickMark(text: string): string | null {
  for (const m of ANADESMOS_MARKS) if (!text.includes(m) && countTokens(m, 'o200k_base') === 1) return m;
  return null;
}
/** non-zero entries only, as index:width pairs */
export function ndPairs(w: number[]): string {
  return w.map((x, i) => (x > 0 ? i + ':' + x : null)).filter((x) => x !== null).join(',');
}
export function ndUnPairs(s: string): { ok: boolean; w: number[] } {
  const w: number[] = [];
  if (s !== '') {
    for (const tk of s.split(',')) {
      const m = /^(\d+):([1-9]\d*)$/.exec(tk);
      if (!m) return { ok: false, w: [] };
      w[Number(m[1])] = Number(m[2]);
    }
  }
  for (let i = 0; i < w.length; i++) w[i] = w[i] ?? 0;
  if (!w.some((x) => x > 0)) return { ok: false, w: [] };
  return { ok: true, w };
}

/**
 * THE NOTE LINE. The decoder is a language model, so a parameter need not be carried as a formal
 * header *plus* a sentence explaining the header: it can be carried as one imperative sentence,
 * whose meaning ("wrapped at 78 characters", "has 6 decimals", "zero-padded to 3 digits", "starts
 * with its row number") the reader already has. That is the AI-native move of this codec and it is
 * what makes the layout tier payable: the formal header + compiled clause measured 49-54 tokens per
 * message in the first X20 run, which is more than `nl` or `wrap` saves on a 300-token lane, so
 * every prose lane was gated off. The note is a sentence; the preamble is one fixed sentence.
 * The library reader still parses the note with one strict regex per template, so "written in
 * prose" does not mean "interpreted loosely" — an unparsable note is an error, not a guess.
 */
export const ANADESMOS_PREAMBLE = 'The first line is a note about the text after it: do what it says, then drop that line.';

export function ndSerializeParams(p: NdParams): string {
  const t: string[] = [];
  const GAPW = ['1 space', '2 spaces', '3 spaces', '4 spaces'];
  if (p.nl) t.push(`lines are ${p.nl.W} chars and a shorter one ends at its own break`);
  if (p.nlm) t.push(`lines are ${p.nlm.W} chars and a shorter one ends at ${p.nlm.mk}`);
  if (p.wrap) t.push(`lines wrap at ${p.wrap.W} chars`);
  if (p.cols) t.push(`each line holds ${p.cols.A.length} columns starting at ${p.cols.A.join(',')} and aligned ${p.cols.al}${p.cols.mk}`);
  if (p.ral) {
    const st = p.ral.start > 0 ? `, first at ${p.ral.start + 1}` : '';
    const wd = p.ral.w ? `, widths ${p.ral.w.join(',')}` : ', each width = widest entry';
    const rest = p.ral.rest !== undefined ? `, rest at ${p.ral.rest + 1}` : '';
    t.push(`fields aligned ${p.ral.al}, ${(GAPW[p.ral.gap - 1] ?? p.ral.gap)} apart${st}${wd}${rest}`);
  }
  if (p.range) t.push(`lines ${p.range.from + 1}-${p.range.from + p.range.len} only`);
  const emit = (w: number[], what: string): void => {
    const by = new Map<number, number[]>();
    for (const [i, v] of w.entries()) if (v > 0) { if (!by.has(v)) by.set(v, []); by.get(v)!.push(i + 1); }
    for (const [v, cols] of by) t.push(`${cols.length === 1 ? `col ${cols[0]}` : `cols ${cols.join(',')}`} = ${v} ${what}`);
  };
  if (p.dp) emit(p.dp, 'decimals');
  if (p.iw) emit(p.iw, 'digits zero-padded');
  if (p.sep && (p.dp || p.iw) && p.sep !== ',') t.push(`split on ${escSep(p.sep)}`);
  if (p.seq) {
    const q = p.seq;
    const where = q.all ? 'every line' : `lines ${q.from + 1}-${q.from + q.len}`;
    t.push(`${where} starts with its number ${q.start}+${q.step}i${q.pad ? ` padded ${q.pad}` : ''} then ${escSep(q.sep) || 'nothing'}`);
  }
  if (p.crlf) t.push('line ends are CRLF');
  return ANADESMOS_MARK + t.join('; ');
}

/**
 * Reader side of the note line: one strict pattern per family, sentences joined by '; '. A sentence
 * that does not match its pattern exactly makes the note unreadable, and an unreadable note makes
 * the encoder refuse to transform - it never emits a note it cannot read back, because `ndForward`
 * parses what it is about to send and re-checks the whole inverse before offering the arm.
 */
export function ndParseParams(line: string): NdParams | null {
  if (!line.startsWith(ANADESMOS_MARK)) return null;
  const p: NdParams = {};
  let bad = false;
  const setCol = (key: 'dp' | 'iw', i: number, v: number): void => {
    const cur = p[key] ?? [];
    const next = cur.concat(new Array<number>(Math.max(0, i + 1 - cur.length)).fill(0));
    next[i] = v;
    p[key] = next;
  };
  for (const s of line.slice(ANADESMOS_MARK.length).split('; ')) {
    let m: RegExpExecArray | null;
    if (s === 'line ends are CRLF') p.crlf = true;
    else if ((m = /^lines are (\d+) chars and a shorter one ends at its own break$/.exec(s))) p.nl = { W: Number(m[1]) };
    else if ((m = /^lines are (\d+) chars and a shorter one ends at (.)$/.exec(s))) p.nlm = { W: Number(m[1]), mk: m[2] };
    else if ((m = /^lines wrap at (\d+) chars$/.exec(s))) p.wrap = { W: Number(m[1]) };
    else if ((m = /^each line holds (\d+) columns starting at ([\d,]+) and aligned ([lr]+)(.)$/.exec(s))) {
      const A = m[2].split(',').map(Number);
      if (A.length !== Number(m[1]) || A.length !== m[3].length) { bad = true; break; }
      p.cols = { A, al: m[3], mk: m[4] };
    } else if ((m = /^fields aligned ([lr]+), (1 space|2 spaces|3 spaces|4 spaces) apart(?:, first at (\d+))?(?:, widths ([\d,]+)|, each width = widest entry)?(?:, rest at (\d+))?$/.exec(s))) {
      p.ral = {
        al: m[1], start: m[3] ? Number(m[3]) - 1 : 0,
        gap: m[2] === '1 space' ? 1 : m[2] === '2 spaces' ? 2 : m[2] === '3 spaces' ? 3 : 4,
        w: m[4] ? m[4].split(',').map(Number) : undefined, rest: m[5] ? Number(m[5]) - 1 : undefined,
      };
    } else if ((m = /^lines (\d+)-(\d+) only$/.exec(s))) p.range = { from: Number(m[1]) - 1, len: Number(m[2]) - Number(m[1]) + 1 };
    else if ((m = /^col (\d+) = (\d+) decimals$/.exec(s))) setCol('dp', Number(m[1]) - 1, Number(m[2]));
    else if ((m = /^cols ([\d,]+) = (\d+) decimals$/.exec(s))) for (const x of m[1].split(',')) setCol('dp', Number(x) - 1, Number(m[2]));
    else if ((m = /^col (\d+) = (\d+) digits zero-padded$/.exec(s))) setCol('iw', Number(m[1]) - 1, Number(m[2]));
    else if ((m = /^cols ([\d,]+) = (\d+) digits zero-padded$/.exec(s))) for (const x of m[1].split(',')) setCol('iw', Number(x) - 1, Number(m[2]));
    else if ((m = /^split on (.+)$/.exec(s))) p.sep = unEscSep(m[1]);
    else if ((m = /^(every line|lines (\d+)-(\d+)) starts with its number (\d+)\+(\d+)i(?: padded (\d+))? then (.*)$/.exec(s))) {
      const all = m[1] === 'every line';
      const from = all ? 0 : Number(m[2]) - 1;
      const to = all ? 0 : Number(m[3]) - 1;
      p.seq = {
        all, from, len: to - from + 1, start: Number(m[4]), step: Number(m[5]),
        pad: m[6] ? Number(m[6]) : 0, sep: m[7] === 'nothing' ? '' : unEscSep(m[7]),
      };
    } else { bad = true; break; }
  }
  if (bad) return null;
  if (Object.keys(p).length === 0) return null;
  for (const k of ['dp', 'iw'] as const) if (p[k]) for (let i = 0; i < p[k]!.length; i++) p[k]![i] = p[k]![i] ?? 0;
  if (p.cols && p.cols.A.length !== p.cols.al.length) return null;
  if (p.ral && p.ral.al.length === 0) return null;
  return p;
}

export function ndClause(_p: NdParams): string {
  return ANADESMOS_PREAMBLE;
}
/* ========================================================================== *
 * 1. crlf — a line ending is one flag, not one character per line
 * ========================================================================== */
function ndCrlfFwd(t: string): { text: string; p: NdParams } | null {
  if (!t.includes('\r') || !t.includes('\r\n')) return null;
  const u = t.replace(/\r\n/g, '\n');
  if (u.includes('\r')) return null;
  return { text: u, p: { crlf: true } };
}
const ndCrlfInv = (t: string): string => t.replace(/\n/g, '\r\n');

/* ========================================================================== *
 * 2. dp (fixed fraction scale) and iw (fixed integer width), delimiter discovered
 * ========================================================================== */
/** one cell, stripped according to the column rule; unchanged when the cell does not fit it */
function stripCell(v: string, k: number, key: 'dp' | 'iw'): string {
  if (key === 'dp') {
    const m = /^(-?\d+)\.(\d+)$/.exec(v);
    if (!m || m[2].length !== k) return v;
    const f = m[2].replace(/0+$/, '');
    return f === '' ? m[1] : m[1] + '.' + f;
  }
  const m = /^(-?\d+)$/.exec(v);
  if (!m || v.length !== k) return v;
  return v.replace(/^0+(?=\d)/, '');
}

/**
 * The largest run of consecutive lines in which each column carries numbers at one fixed scale
 * (`dp`) or one fixed field width (`iw`), and at least one cell actually changes. Unlike STATHMOS,
 * which demanded the whole file (so a header row or a mixed-precision row killed the column), this
 * scans every line, tolerates lines that do not match, and returns the single most valuable run.
 */
/**
 * Column rules are discovered over the *lines that fit them*, not over the whole file: for every
 * column we scan maximal runs of consecutive lines whose cell in that column is a number at one
 * fixed scale (`dp`) or one fixed field width (`iw`), score each run by the characters it removes,
 * then take the best run and add every other column that is uniform over that same run. A header
 * row, a footer, or a handful of ragged rows therefore cost a shorter range instead of killing the
 * family, which is what STATHMOS did (it demanded a uniform scale over every data row of the file).
 */
function colRuns(t: string, sep: string, key: 'dp' | 'iw') {
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  const rows = lines.map((l) => l.split(sep));
  const ncol = Math.max(...rows.map((r) => r.length));
  if (ncol < 2) return null;
  const scaleOf = (v: string | undefined): number => {
    if (v === undefined) return -1;
    if (key === 'dp') {
      const m = /^(-?\d+)\.(\d+)$/.exec(v);
      return m ? m[2].length : -1;
    }
    return /^(-?\d+)$/.exec(v) ? v.length : -1;
  };
  const changed = (v: string | undefined): boolean => {
    if (v === undefined) return false;
    return key === 'dp' ? /\.(\d*[1-9])0+$/.test(v) : /^0\d/.test(v);
  };
  let best: { from: number; to: number; saved: number } | null = null;
  const scale: number[][] = rows.map((r) => {
    const a = new Array(ncol).fill(-1);
    for (let c = 0; c < ncol; c++) a[c] = scaleOf(r[c]);
    return a;
  });
  for (let c = 0; c < ncol; c++) {
    let i = 0;
    while (i < lines.length) {
      const k = scale[i][c];
      if (k < 0) { i++; continue; }
      let j = i, ch = 0, sav = 0;
      while (j < lines.length && scale[j][c] === k) {
        if (changed(rows[j][c])) { ch++; sav += key === 'dp' ? rows[j][c]!.length - (rows[j][c]!.split('.')[0] + '.' + (rows[j][c]!.split('.')[1]!.replace(/0+$/, '')).length).length : rows[j][c]!.length - rows[j][c]!.replace(/^0+(?=\d)/, '').length; }
        j++;
      }
      if (ch > 0 && j - i >= 2 && (!best || sav > best.saved)) best = { from: i, to: j, saved: sav };
      i = Math.max(j, i + 1);
    }
  }
  if (!best) return null;
  const { from, to } = best as { from: number; to: number; saved: number };
  const w = new Array(ncol).fill(0);
  for (let c = 0; c < ncol; c++) {
    let k = -1, ch = 0, ok = true;
    for (let i = from; i < to; i++) {
      const v = rows[i][c], sc = scale[i][c];
      if (v === undefined || sc < 0) { ok = false; break; }
      if (k === -1) k = sc; else if (k !== sc) { ok = false; break; }
      if (changed(v)) ch++;
    }
    if (ok && k >= 0 && ch > 0) w[c] = k;
  }
  if (!w.some((x) => x > 0)) return null;
  const strip = (v: string, c: number): string => (w[c] === 0 ? v : stripCell(v, w[c], key));
  const out = lines.map((l, i) => (i >= from && i < to ? l.split(sep).map((v, c) => strip(v, c)).join(sep) : l));
  const text = out.join('\n');
  if (text === t) return null;
  return { text, w, from, len: to - from };
}

/* -------------------------------------------------------------------------- */
/* family ral - a whitespace table re-flows from its own column widths        */
/* -------------------------------------------------------------------------- */

/**
 * `ps aux`, `df -h`, `ls -l` and friends pad every column to the width of its widest entry.
 * Those runs of spaces are the single largest removable cost in ops text (measured over the
 * bench lanes: 1,031 padding characters over 15 lanes) and unlike a CSV separator they carry no
 * information at all *as long as the reader can rebuild the widths*. It can: a column's width is
 * its widest entry, and the widest entry is present in the text. So the note carries one
 * alignment letter per column and where the first field starts - no per-column numbers, which is
 * what PADTAB paid (~3 tokens per column) and why PADTAB never paid off.
 *
 * Rows may end with a remainder (a filename, a commit subject) that keeps its own inner spaces;
 * its column is fixed for the region and is transmitted only when it is not the chained position.
 * Regions are runs of lines with the same field count, so a header or a ragged row shortens the
 * region instead of vetoing the family.
 */
/** one row of the wire -> the padded row, given boxes; `rest` is the verbatim tail */
function ralPlace(fields: string[], rest: string, P: number[], w: number[], al: string, restAt: number | undefined): string {
  const k = P.length;
  let n = P[k - 1] + w[k - 1];
  if (rest !== '' && restAt !== undefined) n = Math.max(n, restAt + rest.length);
  const buf = new Array<string>(n).fill(' ');
  for (let c = 0; c < k; c++) {
    const f = fields[c] ?? '';
    const at = al[c] === 'r' ? P[c] + w[c] - f.length : P[c];
    for (let j = 0; j < f.length; j++) buf[at + j] = f[j];
  }
  if (rest !== '' && restAt !== undefined) for (let j = 0; j < rest.length; j++) buf[restAt + j] = rest[j];
  return buf.join('').replace(/ +$/, '');
}

/**
 * A whitespace-aligned table (ps, df, ls -l, kubectl, git log --stat, task lists) spends most of
 * its bytes on padding: every column is stretched to the width of its widest entry so the next
 * column starts at a fixed character. That padding is pure binding cost, and unlike a CSV comma it
 * is not modelled by the rule tape at all, because the string between two columns changes with
 * every row. So drop it: the wire keeps the fields one space apart and the note keeps what the
 * reader cannot infer - which columns are flush right, where the first field starts, and the width
 * of each column. Widths are omitted from the note when the table is tight (every column exactly as
 * wide as its widest entry), which is the common case for tools that size columns by content; then
 * the reader recomputes them from the text, and the whole layout costs one sentence.
 *
 * Regions are runs of consecutive lines with the same field count and no trailing spaces, and the
 * gap between columns must be constant over the region, so a header, a blank line, or a ragged row
 * ends the region rather than vetoing the family. Every produced region is checked by re-rendering
 * it and comparing to the original bytes, and then again through the parsed note.
 */
interface RalScan { from: number; len: number; k: number; gap: number; tight: boolean; w: number[]; al: string; start: number; restAt: number | undefined; saved: number }

type RalSpan = { s: number; e: number; w: string };
type RalSpans = Array<RalSpan[] | null>;

function ralRegions(lines: string[], spans: RalSpans): number[][] {
  const out: number[][] = [];
  let i = 0;
  while (i < lines.length) {
    const first = spans[i];
    if (!first || first.length < 3) { i++; continue; }
    const k = first.length;
    let j = i;
    while (j < lines.length && spans[j] && spans[j]!.length === k && !/[ \t]$/.test(lines[j])) j++;
    if (j - i >= 3) out.push([i, j, k]);
    i = Math.max(j, i + 1);
  }
  return out;
}

function ralTry(lines: string[], spans: RalSpans, from: number, len: number, k: number, gap: number): RalScan | null {
  const rows = spans.slice(from, from + len) as unknown as RalSpan[][];
  const P: number[] = [];
  const w: number[] = [];
  const al: string[] = [];
  let p = Math.min(...rows.map((r) => r[0].s));
  for (let c = 0; c < k; c++) {
    const lo = Math.min(...rows.map((r) => r[c].s));
    const hi = Math.max(...rows.map((r) => r[c].e));
    const allL = rows.every((r) => r[c].s === lo);
    const allR = rows.every((r) => r[c].e === hi);
    if (lo < p) return null;
    if (allR && !(allL && c > 0)) { al.push('r'); P.push(p); w.push(hi - p); } else if (allL) { al.push('l'); P.push(p); w.push(hi - p); } else return null;
    if (w[c] < 1) return null;
    p = P[c] + w[c] + gap;
  }
  const maxw = rows.reduce((m, r) => Math.max(m, ...r.map((x) => x.w.length)), 0);
  void maxw;
  const tight = (() => {
    for (let c = 0; c < k; c++) {
      const mx = Math.max(...rows.map((r) => r[c].w.length));
      if (mx !== w[c]) return false;
    }
    return true;
  })();
  // remainder: the part of each line after the k-th field, kept verbatim, at a constant column
  let restAt: number | undefined;
  for (const r of rows) {
    if (r.length <= k) continue;
    const at = r[k].s;
    if (restAt === undefined) restAt = at; else if (restAt !== at) return null;
  }
  if (restAt !== undefined && restAt < p - gap) return null;
  let saved = 0, bad = 0;
  for (let r = 0; r < len; r++) {
    const idx = from + r;
    const fields = rows[r].slice(0, k).map((x) => x.w);
    const rest = restAt !== undefined && rows[r].length > k ? lines[idx].slice(restAt).replace(/ +$/, '') : '';
    const head = rest === '' ? fields.join(' ') : fields.join(' ') + ' ' + rest;
    if (ralPlace(fields, rest, P, w, al.join(''), restAt) !== lines[idx]) { bad++; continue; }
    saved += lines[idx].length - head.length;
  }
  if (bad > len / 5) return null;
  if (saved <= 8) return null;
  return { from, len, k, gap, tight, w, al: al.join(''), start: P[0], restAt, saved };
}

function ndRalFwd(t: string): { text: string; p: NdParams } | null {
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  const spans = lines.map((l) => (l.includes('\t') || l.trim() === ''
    ? null
    : [...l.matchAll(/\S+/g)].map((m) => ({ w: m[0], s: m.index!, e: m.index! + m[0].length }))));
  let best: RalScan | null = null;
  for (const [from, to, k] of ralRegions(lines, spans)) {
    const len = to - from;
    for (const gap of [1, 2, 3]) {
      const r = ralTry(lines, spans, from, len, k, gap);
      if (r && (!best || r.saved > best.saved)) best = r;
    }
  }
  if (!best) return null;
  const b = best as RalScan;
  const out = lines.slice();
  for (let r = 0; r < b.len; r++) {
    const idx = b.from + r;
    const sp = spans[idx];
    if (!sp || sp.length < b.k) continue;
    const fields = sp.slice(0, b.k).map((x) => x.w);
    const rest = b.restAt !== undefined && sp.length > b.k ? lines[idx].slice(b.restAt).replace(/ +$/, '') : '';
    const head = rest === '' ? fields.join(' ') : fields.join(' ') + ' ' + rest;
    const P = ralStarts(b.w, b.start, b.gap);
    if (ralPlace(fields, rest, P, b.w, b.al, b.restAt) === lines[idx]) out[idx] = head;
  }
  const text = out.join('\n');
  if (text === t) return null;
  const ral: NdRal = { al: b.al, start: b.start, gap: b.gap, w: b.tight ? undefined : b.w, rest: b.restAt };
  const p: NdParams = { ral };
  if (b.from > 0 || b.from + b.len < lines.length) p.range = { from: b.from, len: b.len };
  return { text, p };
}

function ndRalInv(body: string, q: NdRal, range: NdParams['range']): string {
  const lines = body.split('\n');
  const lo = range ? range.from : 0;
  const hi = range ? Math.min(lines.length, range.from + range.len) : lines.length;
  const k = q.al.length;
  const rows: Array<Array<{ s: number; e: number; w: string }>> = [];
  for (let i = lo; i < hi; i++) rows.push([...lines[i].matchAll(/\S+/g)].map((m) => ({ w: m[0], s: m.index!, e: m.index! + m[0].length })));
  const w = q.w ?? (() => {
    const o = new Array<number>(k).fill(0);
    for (const r of rows) for (let c = 0; c < k; c++) o[c] = Math.max(o[c], (r[c]?.w.length ?? 1e9));
    return o;
  })();
  const P = ralStarts(w, q.start, q.gap);
  const out = lines.slice();
  for (let i = lo; i < hi; i++) {
    const r = rows[i - lo];
    if (r.length < k) continue;
    const fields = r.slice(0, k).map((x) => x.w);
    const rest = q.rest !== undefined && r.length > k ? lines[i].slice(r[k].s) : '';
    out[i] = ralPlace(fields, rest, P, w, q.al, q.rest);
  }
  return out.join('\n');
}

function ralStarts(w: number[], start: number, gap: number): number[] {
  const P = [start];
  for (let c = 1; c < w.length; c++) P.push(P[c - 1] + w[c - 1] + gap);
  return P;
}

function ndColFwd(t: string, key: 'dp' | 'iw', haveSep?: string): { text: string; p: NdParams } | null {
  let best: { text: string; w: number[]; sep: string; from: number; len: number; saved: number } | null = null;
  for (const sep of DELIMS) {
    if (!t.includes(sep)) continue;
    if (haveSep && sep !== haveSep) continue;
    const r = colRuns(t, sep, key);
    if (!r) continue;
    if (!best || r.text.length < best.text.length) best = { ...r, sep, saved: t.length - r.text.length };
  }
  if (!best) return null;
  const p: NdParams = {};
  p[key] = best.w;
  p.sep = best.sep;
  const lines = t.split('\n').length;
  if (!(best.from === 0 && best.len === lines)) p.range = { from: best.from, len: best.len };
  return { text: best.text, p };
}

function inRange(i: number, rg?: { from: number; len: number }): boolean {
  return !rg || (i >= rg.from && i < rg.from + rg.len);
}
function ndDpInv(t: string, w: number[], sep: string, rg?: { from: number; len: number }): string {
  return t
    .split('\n')
    .map((l, i) =>
      !inRange(i, rg) ? l : l
        .split(sep)
        .map((v, c) => {
          const k = w[c] ?? 0;
          if (k === 0) return v;
          const m = /^(-?\d+)(?:\.(\d*))?$/.exec(v);
          if (!m) return v;
          return m[1] + '.' + (m[2] ?? '').padEnd(k, '0');
        })
        .join(sep),
    )
    .join('\n');
}
function ndIwInv(t: string, w: number[], sep: string, rg?: { from: number; len: number }): string {
  return t
    .split('\n')
    .map((l, i) =>
      !inRange(i, rg) ? l : l
        .split(sep)
        .map((v, c) => {
          const k = w[c] ?? 0;
          if (k === 0) return v;
          return /^-?\d+$/.test(v) ? v.padStart(k, '0') : v;
        })
        .join(sep),
    )
    .join('\n');
}

/* ========================================================================== *
 * 3. cols — per-column anchors: the padding of an aligned region is not sent
 * ========================================================================== */
function runsOf(line: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const RE = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(line))) out.push([m.index, m.index + m[0].length]);
  return out;
}
/** render a row from its fields, anchors and alignments; '' when the row cannot be represented */
function colsCells(fields: string[], A: number[], al: string): Array<[number, number]> | null {
  const k = A.length;
  if (fields.length !== k) return null;
  const cells: Array<[number, number]> = [];
  for (let c = 0; c < k; c++) {
    const f = fields[c];
    if (/\s/.test(f)) return null;
    const start = al[c] === 'l' ? A[c] : A[c] - f.length;
    if (start < 0) return null;
    cells.push([start, start + f.length]);
  }
  for (let c = 1; c < k; c++) if (cells[c][0] < cells[c - 1][1]) return null;
  return cells;
}
function colsPlace(cells: Array<[number, number]>, fields: string[]): string {
  const end = Math.max(...cells.map((x) => x[1]));
  const arr = new Array(end).fill(' ');
  for (let c = 0; c < fields.length; c++) {
    const f = fields[c];
    for (let j = 0; j < f.length; j++) arr[cells[c][0] + j] = f[j];
  }
  return arr.join('');
}
function colsRender(fields: string[], A: number[], al: string): string {
  const cells = colsCells(fields, A, al);
  return cells ? colsPlace(cells, fields) : '';
}
/** the reader's per-line job: k anchored fields, then any remaining words verbatim after a space */
function colsInvLine(line: string, p: NdCols): string {
  const { A, al, mk } = p;
  const k = A.length;
  if (line.startsWith(mk)) return line.slice(mk.length);
  const fs = line.split(' ');
  if (fs.length < k) return line;
  const fields = fs.slice(0, k);
  const rest = fs.slice(k).join(' ');
  const cells = colsCells(fields, A, al);
  if (!cells) return line;
  const head = colsPlace(cells, fields);
  return rest === '' ? head : head + ' ' + rest;
}

function ndColsFwd(t: string): { text: string; p: NdParams } | null {
  const mk = ndPickMark(t);
  if (!mk) return null;
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  // region = the longest run of lines with 2..16 space-separated fields and no tab (blank lines allowed inside)
  const ok = (l: string) => !l.includes('\t') && l.trim() !== '' && runsOf(l).length >= 2 && runsOf(l).length <= 16;
  let a = -1, b = -1, bestLen = 2;
  for (let i = 0; i < lines.length; i++) {
    if (!ok(lines[i])) continue;
    let j = i;
    while (j < lines.length && (ok(lines[j]) || lines[j].trim() === '')) j++;
    while (j > i && lines[j - 1].trim() === '') j--;
    if (j - i > bestLen) { a = i; b = j; bestLen = j - i; }
    i = j;
  }
  if (a < 0) return null;
  const reg = lines.slice(a, b);
  const runs = reg.map(runsOf);
  const kmax = Math.min(...runs.map((r) => r.length));
  if (kmax < 2) return null;
  // anchored prefix: the largest number of leading columns with a consistent anchor; a column
  // whose starts and ends both vary (mixed layout, e.g. a ragged description column) ends the grid
  const A: number[] = [];
  const alArr: string[] = [];
  for (let c = 0; c < kmax; c++) {
    const st = [...new Set(runs.map((r) => r[c][0]))];
    const en = [...new Set(runs.map((r) => r[c][1]))];
    if (st.length === 1) { A.push(st[0]); alArr.push('l'); }
    else if (en.length === 1) { A.push(en[0]); alArr.push('r'); }
    else break;
  }
  const k = A.length;
  if (k < 2) return null;
  const al = alArr.join('');
  const prm: NdCols = { A, al, mk };
  const out = lines.slice();
  let escaped = 0;
  for (let r = 0; r < reg.length; r++) {
    const spans = runs[r];
    const cand = (() => {
      if (spans.length < k) return null;
      const fields = spans.slice(0, k).map(([x, y]) => reg[r].slice(x, y));
      const after = spans.slice(k);
      const tail = after.length ? reg[r].slice(after[0][0]).replace(/\s+/g, ' ').trim() : '';
      const head = colsRender(fields, A, al);
      if (head === '') return null;
      return tail === '' ? head : head + ' ' + tail;
    })();
    // admitted only when the reader's own inverse gives the line back (trailing spaces aside)
    if (!cand || colsInvLine(cand, prm).replace(/\s+$/, '') !== reg[r].replace(/\s+$/, '')) {
      out[a + r] = mk + reg[r];
      escaped++;
      continue;
    }
    out[a + r] = cand;
  }
  if (escaped > reg.length / 3) return null;
  if (out.join('\n') === t) return null;
  return { text: out.join('\n'), p: { cols: prm } };
}
function ndColsInv(t: string, p: NdCols): string {
  return t.split('\n').map((l) => colsInvLine(l, p)).join('\n');
}


/* ========================================================================== *
 * 3b. seq — the row number is not sent: an indexed region is start + step*i
 * ========================================================================== */
function escSep(x: string): string {
  return x.replace(/\\/g, '\\\\').replace(/ /g, '\\s').replace(/:/g, '\\c');
}
function unEscSep(x: string): string {
  return x.replace(/\\s/g, ' ').replace(/\\c/g, ':').replace(/\\\\/g, '\\');
}
/**
 * The longest run of consecutive lines whose leading number is start + step*i.
 * A line is indexable when it begins with 1-7 digits and the text right after them is the same
 * short separator for every line of the run. Padding is carried when the run pads every number
 * to a fixed width (001, 002, ...), which is what makes the digit count recoverable.
 */
function ndSeqFwd(t: string): { text: string; p: NdParams } | null {
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  const parse = (l: string): { v: number; d: string; sep: string } | null => {
    const m = /^(\d{1,7})([^\d\s])(?=.)/.exec(l) || /^(\d{1,7})(?=[ \t])/.exec(l);
    if (!m) return null;
    const d = m[1];
    return { v: Number(d), d, sep: m[2] ?? '' };
  };
  const info = lines.map(parse);
  let best: { a: number; len: number; sep: string; step: number; start: number; pad: number } | null = null;
  let i = 0;
  while (i < lines.length) {
    if (!info[i]) { i++; continue; }
    const sep = info[i]!.sep;
    let j = i;
    while (j < lines.length && info[j] && info[j]!.sep === sep) j++;
    // longest arithmetic segment inside [i, j)
    let a = i;
    while (a < j) {
      let step = -1, ok = true, b = a;
      const pads = new Set<number>();
      while (b < j) {
        const cur = info[b]!;
        pads.add(cur.d.length);
        if (b > a) {
          const d = info[b]!.v - info[b - 1]!.v;
          if (step === -1) step = d;
          else if (step !== d) { ok = false; }
          if (d <= 0) ok = false;
        }
        if (!ok) break;
        b++;
      }
      const len = b - a;
      if (len >= 3) {
        const lens = new Set(Array.from({ length: len }, (_, k) => info[a + k]!.d.length));
        const unpadded = Array.from({ length: len }, (_, k) => info[a + k]!).every((x) => x.d === String(x.v));
        const pad = lens.size === 1 ? (unpadded ? 0 : Math.max(...lens)) : unpadded ? 0 : -1;
        if (pad >= 0 && (!best || len > best.len)) best = { a, len, sep, step: step === -1 ? 1 : step, start: info[a]!.v, pad };
      }
      a = Math.max(a + 1, b - 1);
    }
    i = Math.max(j, i + 1);
  }
  if (!best || best.len < 3) return null;
  const { a, len, sep, step, start, pad } = best;
  const out = lines.slice();
  for (let r = a; r < a + len; r++) out[r] = lines[r].slice(String(info[r]!.d).length + sep.length);
  const text = out.join('\n');
  if (text === t) return null;
  const all = a === 0 && a + len === lines.length;
  const prm: NdSeq = { from: a, len, sep, step, start, pad, all };
  if (ndSeqInv(text, prm) !== t) return null;
  return { text, p: { seq: prm } };
}
function ndSeqInv(t: string, p: NdSeq): string {
  const lines = t.split('\n');
  const out = lines.slice();
  const end = p.all ? lines.length : Math.min(lines.length, p.from + p.len);
  const at = p.all ? 0 : p.from;
  for (let r = at; r < end; r++) {
    const i = r - at;
    const v = String(p.start + p.step * i);
    out[r] = (p.pad > 0 ? v.padStart(p.pad, '0') : v) + p.sep + out[r];
  }
  return out.join('\n');
}

/* ========================================================================== *
 * 4. nl — the line cut. Variant B (no marker): a line of exactly W characters carries no line
 *    ending at all; only short lines keep theirs. Variant B dominates variant A (marker on every
 *    short line) because it never pays a token per line, and for a fixed-width file the two are
 *    identical. Both are implemented; the cascade keeps whichever nets more.
 * ========================================================================== */
function lineMaxW(lines: string[]): number {
  let W = 0;
  for (const l of lines) if (l.length > W) W = l.length;
  return W;
}
function ndNlFwd(t: string): { text: string; p: NdParams } | null {
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  const W = lineMaxW(lines);
  if (W < 4) return null;
  const body = lines.map((l) => (l.length === W ? l : l + '\n')).join('');
  if (body.endsWith('\n') && t.endsWith('\n')) { /* trailing short line already carries it */ }
  if (ndNlInv(body, { W }) !== t) return null;
  if (body === t) return null;
  return { text: body, p: { nl: { W } } };
}
function ndNlInv(t: string, p: { W: number }): string {
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    const k = t.indexOf('\n', i);
    if (k !== -1 && k - i < p.W) { out.push(t.slice(i, k)); i = k + 1; }
    else { out.push(t.slice(i, i + p.W)); i += p.W; }
  }
  return out.join('\n');
}
/** variant A: cut every W characters, marker only on the short lines (kept for comparison) */
function ndNlmFwd(t: string): { text: string; p: NdParams } | null {
  const mk = ndPickMark(t);
  if (!mk) return null;
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  if (lines.some((l) => l.includes(mk) || l.includes('\r'))) return null;
  const W = lineMaxW(lines);
  if (W < 4) return null;
  const body = lines.map((l) => (l.length === W ? l : l + mk)).join('');
  if (ndNlmInv(body, { W, mk }) !== t) return null;
  return { text: body, p: { nlm: { W, mk } } };
}
function ndNlmInv(t: string, p: { W: number; mk: string }): string {
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    const k = t.indexOf(p.mk, i);
    if (k !== -1 && k - i < p.W) { out.push(t.slice(i, k)); i = k + p.mk.length; }
    else { out.push(t.slice(i, i + p.W)); i += p.W; }
  }
  return out.join('\n');
}

/* ========================================================================== *
 * 5. wrap — greedy-fill re-wrap: the STICHOS mechanism with no fixed contract
 * ========================================================================== */
export function greedyWrap(words: string[], W: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') cur = w;
    else if (cur.length + 1 + w.length <= W) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur !== '') out.push(cur);
  return out;
}
function ndWrapFwd(t: string): { text: string; p: NdParams } | null {
  const lines = t.split('\n');
  if (lines.length < 3) return null;
  let W0 = 0, longWord = 0;
  for (const l of lines) {
    if (l.length > W0) W0 = l.length;
    for (const w of l.split(' ')) if (w.length > longWord) longWord = w.length;
  }
  if (W0 < 12) return null;
  const paras = t.split('\n\n');
  for (let W = W0; W <= W0 + longWord; W++) {
    const rebuilt = paras
      .map((p) => greedyWrap(p.split(/\s+/).filter((x) => x !== ''), W).join('\n'))
      .join('\n\n');
    if (rebuilt !== t) continue;
    const body = paras.map((p) => p.split('\n').join(' ')).join('\n\n');
    if (body === t) return null;
    return { text: body, p: { wrap: { W } } };
  }
  return null;
}
function ndWrapInv(t: string, p: { W: number }): string {
  return t
    .split('\n\n')
    .map((par) => greedyWrap(par.split(/\s+/).filter((x) => x !== ''), p.W).join('\n'))
    .join('\n\n');
}

/* ========================================================================== *
 * 6. the cascade: order, verification, greedy selection
 * ========================================================================== */
export const ND_STAGES: Array<{ name: FamName; fwd: (t: string) => { text: string; p: NdParams } | null }> = [
  { name: 'crlf', fwd: ndCrlfFwd },
  { name: 'seq', fwd: ndSeqFwd },
  { name: 'dp', fwd: (t) => ndColFwd(t, 'dp') },
  { name: 'iw', fwd: (t) => ndColFwd(t, 'iw') },
  { name: 'cols', fwd: ndColsFwd },
  { name: 'ral', fwd: ndRalFwd },
  { name: 'nl', fwd: ndNlFwd },
  { name: 'nlm', fwd: ndNlmFwd },
  { name: 'wrap', fwd: ndWrapFwd },
];

/** the reader's inverse cascade, in the exact reverse order of the stages */
export function ndInverse(body: string, p: NdParams): string {
  let t = body;
  if (p.nlm) t = ndNlmInv(t, p.nlm);
  if (p.nl) t = ndNlInv(t, p.nl);
  if (p.wrap) t = ndWrapInv(t, p.wrap);
  if (p.cols) t = ndColsInv(t, p.cols);
  if (p.ral) t = ndRalInv(t, p.ral, p.range);
  if (p.iw) t = ndIwInv(t, p.iw, p.sep ?? ',', p.range);
  if (p.dp) t = ndDpInv(t, p.dp, p.sep ?? ',', p.range);
  if (p.seq) t = ndSeqInv(t, p.seq);
  if (p.crlf) t = ndCrlfInv(t);
  return t;
}

export interface NdSelection {
  /** descriptor line + canonical body: the text handed to the wire codec */
  text: string;
  p: NdParams;
  applied: FamName[];
  /** per-family token saving on the source text, measured at selection time */
  gain: Record<string, number>;
  descTokens: number;
}

const ndCost = (q: NdParams, enc: EncodingName) => countTokens(ndSerializeParams(q) + '\n', enc) + countTokens(ANADESMOS_PREAMBLE, enc);

/** diagnostic: each family alone on this text, with its raw token saving and its own cost */
export function ndProbe(input: string, enc: EncodingName = 'o200k_base') {
  const rows = ND_STAGES.map((st) => {
    const r = st.fwd(input);
    if (!r) return { name: st.name, applies: false, saved: 0, cost: 0, net: 0 };
    const saved = countTokens(input, enc) - countTokens(r.text, enc);
    const cost = ndCost(r.p, enc);
    const ok = ndInverse(r.text, r.p) === input;
    return { name: st.name, applies: true, saved, cost, net: saved - cost, exact: ok };
  });
  return rows;
}

/**
 * Greedy forward selection in dependency order. A family is kept only if it applies, the
 * whole-message inverse reproduces the pre-stage text exactly, and its saving on the current body
 * exceeds the marginal descriptor+clause cost it adds. `nl` and `wrap` compete for one slot.
 */
export function ndForward(input: string, enc: EncodingName = 'o200k_base'): NdSelection | null {
  if (input.startsWith(ANADESMOS_MARK) || input.startsWith(ANADESMOS_RAW)) return null;
  const p: NdParams = {};
  let text = input;
  let cost = 0;
  const applied: FamName[] = [];
  const gain: Record<string, number> = {};
  const why: string[] = [];
  const tryStage = (st: (typeof ND_STAGES)[number]): boolean => {
    const r = st.fwd(text);
    if (!r) { why.push(st.name + ':no-fit'); return false; }
    const trial: NdParams = { ...p };
    for (const k of Object.keys(r.p) as FamName[]) (trial as any)[k] = (r.p as any)[k];
    if (trial.dp && trial.iw && trial.sep !== p.sep) { why.push(st.name + ':sep'); return false; }
    if (ndInverse(r.text, trial) !== text) { why.push(st.name + ':inexact'); return false; }
    const g = countTokens(text, enc) - countTokens(r.text, enc);
    const marginal = ndCost(trial, enc) - cost;
    if (g <= marginal) { gain[st.name] = g; why.push(`${st.name}:cost ${g}<=${marginal}`); return false; }
    gain[st.name] = g;
    text = r.text;
    for (const k of Object.keys(r.p) as FamName[]) (p as any)[k] = (r.p as any)[k];
    cost = ndCost(p, enc);
    applied.push(st.name);
    return true;
  };
  // crlf is applied first and unconditionally when eligible: it saves nothing on its own (a
  // CRLF is one token the rule tape already folds) but it is a prerequisite for the line and
  // column families on CRLF input. Its cost is charged to whoever needs it, at the end.
  let enabler = false;
  const pre = ndCrlfFwd(text);
  if (pre) { text = pre.text; enabler = true; }
  for (const st of ND_STAGES) {
    if (st.name === 'crlf' || st.name === 'nl' || st.name === 'wrap') continue;
    tryStage(st);
  }
  // nl / nlm / wrap compete for the line slot: keep the largest net saving
  const net = (name: FamName, r: { text: string; p: NdParams } | null) =>
    r ? countTokens(text, enc) - countTokens(r.text, enc) - (ndCost({ ...p, [name]: (r.p as any)[name] } as NdParams, enc) - cost) : -1;
  const cands: Array<[FamName, number]> = [
    ['nl', net('nl', ndNlFwd(text))],
    ['nlm', net('nlm', ndNlmFwd(text))],
    ['wrap', net('wrap', ndWrapFwd(text))],
  ];
  for (const [nm, g] of cands) gain[nm] = g;
  const bestCand = cands.slice().sort((x, y) => y[1] - x[1])[0];
  if (bestCand[1] > 0) tryStage(ND_STAGES.find((s) => s.name === bestCand[0])!);
  if (applied.length === 0) { if (process.env.ND_TRACE) console.error('nd: nothing kept', JSON.stringify(why), JSON.stringify(gain)); return null; }
  if (enabler) { p.crlf = true; cost = ndCost(p, enc); applied.unshift('crlf'); }
  if (ndInverse(text, p) !== input) return null;
  // the note line is the only thing the reader gets: it must parse back to the same parameters and
  // the inverse taken *through the parsed note* must reproduce the input
  const p2 = ndParseParams(ndSerializeParams(p));
  if (!p2 || ndSerializeParams(p2) !== ndSerializeParams(p)) {
    if (process.env.ND_TRACE) console.error('nd: note round trip failed\n  note: ' + ndSerializeParams(p) + '\n  back: ' + JSON.stringify(p2));
    return null;
  }
  if (ndInverse(text, p2) !== input) return null;
  return { text: ndSerializeParams(p) + '\n' + text, p, applied, gain, descTokens: ndCost(p, enc) };
}

/* ========================================================================== *
 * 7. encode / decode
 * ========================================================================== */
export interface AnadesmosResult {
  codec: 'anadesmos';
  wire: string;
  /** the whole one-chat message: LAKONIKOS-D contract with the wire in it, plus the clause */
  message: string;
  decoded: string;
  exact: boolean;
  mode: 'raw' | 'anadesmos';
  applied: FamName[];
  params: NdParams;
  gain: Record<string, number>;
  messageTokens: Record<'o200k_base' | 'cl100k_base', number>;
  baseTokens: Record<'o200k_base' | 'cl100k_base', number>;
  inTokens: Record<'o200k_base' | 'cl100k_base', number>;
  clauseTokens: number;
  ms: number;
  notes: string;
}

const TOK = (s: string) => ({ o200k_base: countTokens(s, 'o200k_base'), cl100k_base: countTokens(s, 'cl100k_base') });

export function anadesmosEncode(text: string, enc: EncodingName = 'o200k_base'): AnadesmosResult {
  const t0 = Date.now();
  const guarded = text.startsWith(ANADESMOS_MARK) || text.startsWith(ANADESMOS_RAW);
  const rawIn = guarded ? ANADESMOS_RAW + text : text;
  const base = lakonikosDualEncode(rawIn, enc);
  const inTokens = TOK(text);
  const baseOut: AnadesmosResult = {
    codec: 'anadesmos', wire: base.wire, message: base.decoderPrompt || rawIn, decoded: text,
    exact: anadesmosDecode(base.wire) === text, mode: 'raw', applied: [], params: {}, gain: {},
    messageTokens: base.messageTokens, baseTokens: base.messageTokens, inTokens, clauseTokens: 0,
    ms: Date.now() - t0, notes: `identity-of-ANADESMOS (LAKONIKOS-D ${base.mode}); guard=${guarded}`,
  };
  const sel = ndForward(text, enc);
  if (!sel) return baseOut;
  const tr = lakonikosDualEncode(sel.text, enc);
  if (tr.mode !== 'daedalus') {
    return { ...baseOut, gain: sel.gain, notes: `screened ${sel.applied.join('+')}; DAEDALUS-D declined the transformed text` };
  }
  const message = tr.decoderPrompt + '\n' + ndClause(sel.p);
  const mt = TOK(message);
  if (mt[enc] >= base.messageTokens[enc]) {
    return { ...baseOut, gain: sel.gain, notes: `screened ${sel.applied.join('+')} but M ${mt[enc]} >= base ${base.messageTokens[enc]}` };
  }
  const dec = anadesmosDecode(tr.wire);
  if (dec !== text) return { ...baseOut, gain: sel.gain, notes: `REFUSED: cascade decode mismatch (${sel.applied.join('+')})` };
  return {
    codec: 'anadesmos', wire: tr.wire, message, decoded: dec, exact: true, mode: 'anadesmos',
    applied: sel.applied, params: sel.p, gain: sel.gain, messageTokens: mt, baseTokens: base.messageTokens,
    inTokens, clauseTokens: mt[enc] - countTokens(tr.decoderPrompt, enc), ms: Date.now() - t0,
    notes: `${sel.applied.join('+')}; LAKONIKOS-D ${base.messageTokens[enc]} -> ${mt[enc]} o200k (desc+clause ${sel.descTokens})`,
  };
}

/** exactly what the reader does: expand the CHIRON wire, then undo the descriptor line */
export function anadesmosDecode(wire: string): string {
  const d = chironDecode(wire);
  if (d.startsWith(ANADESMOS_RAW)) return d.slice(ANADESMOS_RAW.length);
  if (!d.startsWith(ANADESMOS_MARK)) return d;
  const nl = d.indexOf('\n');
  if (nl < 0) throw new Error('ANADESMOS: descriptor line not terminated');
  const p = ndParseParams(d.slice(0, nl));
  if (!p) throw new Error('ANADESMOS: unparseable descriptor ' + JSON.stringify(d.slice(0, nl)));
  return ndInverse(d.slice(nl + 1), p);
}
