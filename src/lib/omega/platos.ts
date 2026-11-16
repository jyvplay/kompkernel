/**
 * ΠΛΑΤΟΣ (platos, "width"; Πλάτος) — X123.
 * ============================================================================
 *
 * THE GAP, STATED BY THE CODE THAT COULD NOT CLOSE IT
 * ----------------------------------------------------------------------------
 * ΜΕΣΟΝ (X110) widened ΑΠΟΓΡΑΦΉ's record-set detector by one separator, `' '`,
 * and its own header records the limit it accepted rather than fixed:
 *
 *     "`splitFields` is a LITERAL `line.split(sep)`. A space-PADDED table
 *      (`ls -l`, `df -h`, `ps aux`, `findmnt`) still splits into a huge
 *      unstable arity, because its fields are separated by RUNS of spaces
 *      rather than one. ΜΕΣΟΝ does not fix that: fixing it needs a
 *      column-width side-stream so the reader can restore the padding, which
 *      is a different and much larger mechanism."
 *
 * ΠΛΑΤΟΣ is that side-stream. It does not lift columns and it does not invent
 * a predictor: it makes a space-padded record set ADDRESSABLE, by transmitting
 * the one thing the padding destroys — where each column starts — and then
 * letting the grammar the stack already has mine the de-padded text.
 *
 * WHY THE PADDING IS WORTH A SIDE-STREAM AT ALL
 * ----------------------------------------------------------------------------
 * Measured on the shipped X123 frontier (`bench/x123/collapse-probe.ts`),
 * pricing each lane twice — once as-is, once with every run of whitespace
 * inside the record lines collapsed to one space — the collapsed form is
 * cheaper by
 *
 *     findmnt  -75   dpkg-l  -72   ls-l-real  -57   ps-aux  -57
 *     node-help -43   kubectl -28   ls-real -24   df-h -19   ps-real -17
 *                                                          Σ -346
 *
 * That number is an UPPER BOUND (whitespace collapsing is not invertible), but
 * it is the right order of magnitude to justify the mechanism, and it is the
 * number the side-stream has to beat. It does, on the four lanes whose padding
 * mass is largest; on the five where it does not, ΠΛΑΤΟΣ refuses and the lane
 * is byte-identical to the incumbent.
 *
 * THE MODEL, AND WHY IT IS NOT "FIXED-WIDTH COLUMNS"
 * ----------------------------------------------------------------------------
 * A padded table is NOT a grid. `ps aux` is the counterexample that kills the
 * obvious model: `%MEM` is right-anchored (every row's value ENDS at the same
 * offset) while `VSZ` is left-anchored with a variable length, so `RSS` is
 * pushed along and has no slot of its own at all. What is constant is not the
 * slot — it is, per column, ONE EDGE:
 *
 *     left-anchored  c : every row's value STARTS at the same offset  A[c]
 *     right-anchored c : every row's value ENDS   at the same offset  B[c]
 *
 * Given the edges, the gap between two adjacent values is whatever the two
 * edges imply, so a variable-length left-anchored column simply pushes the
 * next value along. That is strictly more general than fixed-width slots and
 * it is what real CLI output does. The model is not assumed: every row of
 * every candidate block is REBUILT from the model and compared byte for byte,
 * and a block that does not reconstruct is not a block.
 *
 * WHAT IS TRANSMITTED
 * ----------------------------------------------------------------------------
 *     <mk><n>:<side bits>:<k>
 *     <row 0, verbatim>          <- carries every column edge, for free
 *     <row 1..k-1, de-padded>
 *
 * Row 0 is left exactly as the source wrote it, so it carries A[c] (or B[c])
 * for every column at the price of one row's padding. What has to be paid for
 * is only the ALIGNMENT, because a row whose value happens to fill its column
 * cannot show which edge it is anchored to. That is the `side` bit string:
 * n-1 characters, one per column but the last, at ~0.5 tokens each.
 *
 * WHAT IS PROVABLY PRESERVED
 * ----------------------------------------------------------------------------
 * The transform is a bijection on the block, verified twice per encode: once
 * on the transformed text before the child sees it (`undo(transform(t)) === t`)
 * and once on the child's own decoded output before admission. Decode never
 * guesses: it reads the edges off row 0 with the repository's own field
 * splitter, and the gap arithmetic is the fitter's own, so a block that
 * reconstructed during the fit reconstructs during the decode.
 *
 * MECHANISM-DISTINCTNESS
 * ----------------------------------------------------------------------------
 *   · not a substitution (no rule, no glyph, no pointer is added);
 *   · not columnar (column order is untouched and no column is moved);
 *   · not a predictor (nothing is predicted; every value is still written);
 *   · not ΜΕΣΟΝ/ΑΠΟΓΡΑΦΉ (which lift predictable columns; ΠΛΑΤΟΣ lifts the
 *     PADDING and leaves every column in place — the two compose, and this
 *     module runs the child encoder on its own output so that composition is
 *     measured rather than asserted);
 *   · not ΠΡΟΛΗΨΙΣ/ΤΑΧΟΣ (which speed the tokenizer up; this changes the text).
 *
 * GREEDY?  No. Arity is enumerated from 14 down to 3, every maximal
 * contiguous run of record lines is tried, the first line of a run is tried
 * both kept and dropped (so a header or a `total 167495` line cannot poison
 * the block), and the surviving candidate is the one with the largest padding
 * mass. The final acceptance is not a heuristic at all: it is the repository's
 * admission rule, a strictly smaller complete decoded message in this process.
 *
 * TIME / CPU
 * ----------------------------------------------------------------------------
 * No clock, no randomness. The fit is O(lines × arity) regex matches and is
 * abandoned the moment a candidate fails to reconstruct, so a prose lane costs
 * one pass and stops. The child encode is charged only when the fit succeeds;
 * a lane that does not fit pays nothing beyond the fit.
 *
 * HONEST LIMITS
 * ----------------------------------------------------------------------------
 *   · The last column is the remainder of the line and is never padded; a
 *     table whose FINAL column is padded does not fit and is declined.
 *   · Rows that break the model break the block: the block is a contiguous
 *     run, so one malformed row in the middle splits the block in two and the
 *     smaller half is usually below the row floor.
 *   · The side-stream costs roughly 25-35 tokens. Lanes whose gross padding
 *     win is below that are declined by the admission gate, which is the
 *     measured form of "not worth it", not a threshold guessed in advance.
 */

import { countTokens, type EncodingName } from './bpe';
import { archetyponEncode } from './archetypon';

/* -------------------------------------------------------------------------- *
 * 1. THE WIRE
 * -------------------------------------------------------------------------- */

/** Marker candidates. `§` and `¶` are CHIRON's frame and are never used here. */
export const PLATOS_MARKERS = ['‡', '¤', '※', '°', 'µ', '¦', '†', '◊', '◈'] as const;
export const PLATOS_MIN_ROWS = 8;
export const PLATOS_MAX_COLS = 14;

export const PLATOS_CONTRACT =
  'After the marker n:side:k, k records follow. Line 1 of them is a template: its field ' +
  'starts set the column edges. Each later record is the same fields joined by single ' +
  'spaces (the last field is the rest of the line); re-space every field but the last to ' +
  'the edge line 1 gives it, R meaning pad on the left, then drop the marker line.';

export interface PlatosBlock {
  /** index, in `lines`, of the first record line */
  start: number;
  /** number of columns */
  n: number;
  /** the field values, one array per row, in source order */
  rows: string[][];
  /** 'L' | 'R' for columns 0..n-2 */
  side: string;
  /** characters of padding the transform removes */
  padMass: number;
}

export interface PlatosResult {
  applied: boolean;
  message: string;
  decoded: string;
  messageTokens: number;
  parentTokens: number;
  /** the text handed to the child encoder */
  transformed: string;
  rows: number;
  cols: number;
  padMass: number;
  /** tokens the marker line plus the contract cost */
  sideStreamTokens: number;
  notes: string;
}

/* -------------------------------------------------------------------------- *
 * 2. FIT
 * -------------------------------------------------------------------------- */

const PAT: RegExp[] = [];
function patFor(n: number): RegExp {
  if (!PAT[n]) {
    PAT[n] = new RegExp('^(' + Array(n - 1).fill('\\S+').join(')\\s+(') + ')\\s+(\\S.*)$');
  }
  return PAT[n];
}

/** Split one line into n fields (last = remainder) with their [start,end) offsets. */
function splitRow(line: string, n: number): { vals: string[]; S: number[]; E: number[] } | null {
  const m = patFor(n).exec(line);
  if (!m) return null;
  const vals: string[] = [];
  const S: number[] = [];
  const E: number[] = [];
  let at = 0;
  for (let c = 0; c < n; c++) {
    const v = m[c + 1]!;
    const p = m[0].indexOf(v, at);
    if (p < 0) return null;
    vals.push(v); S.push(p); E.push(p + v.length);
    at = p + v.length;
  }
  return { vals, S, E };
}

type Fit = {
  rows: string[][];
  side: string;
  /** A[c] for left-anchored columns; for right-anchored it is B[c]-len(template) */
  A: number[];
  /** B[c] (exclusive end) for right-anchored columns, else -1 */
  B: number[];
};

/**
 * Fit `lines[idx]` as an n-column padded record block.
 *
 * For every column but the last, ALL rows must agree on one edge: the start
 * (left-anchored) or the end (right-anchored). Nothing is assumed about the
 * width of a column or of the gap that follows it, which is what lets a
 * variable-length left-anchored column push the next column along.
 */
function fitModel(lines: string[], idx: number[], n: number): Fit | null {
  const rows: string[][] = [];
  const SS: number[][] = [];
  const EE: number[][] = [];
  for (const i of idx) {
    const r = splitRow(lines[i]!, n);
    if (!r) return null;
    rows.push(r.vals); SS.push(r.S); EE.push(r.E);
  }
  const m = rows.length;
  const A = new Array<number>(n).fill(-1);
  const B = new Array<number>(n).fill(-1);
  let side = '';
  for (let c = 0; c < n - 1; c++) {
    const s0 = SS[0]![c]!;
    const e0 = EE[0]![c]!;
    let cs = true;
    let ce = true;
    for (let r = 1; r < m; r++) {
      if (SS[r]![c] !== s0) cs = false;
      if (EE[r]![c] !== e0) ce = false;
      if (!cs && !ce) return null;
    }
    if (cs) {
      // left-anchored; when the row set also agrees on the end the column is
      // constant-width and the two placements coincide.
      A[c] = s0;
      side += 'L';
      if (ce) B[c] = e0;
    } else {
      B[c] = e0;
      A[c] = s0;
      side += 'R';
    }
  }
  // The LAST column is the remainder of the line, so by default it starts one
  // space past the previous field. `kubectl get pods` is the common case where
  // that is wrong: its final column begins at a fixed offset no matter how long
  // the value before it was, because the column to its left is left-anchored
  // with a variable length. When every row agrees on that offset the column is
  // anchored and the offset is read off the template like any other edge.
  let cs = true;
  const s0 = SS[0]![n - 1]!;
  for (let r = 1; r < m; r++) if (SS[r]![n - 1] !== s0) { cs = false; break; }
  if (cs) {
    A[n - 1] = s0;
    // 'F' (follow) reproduces the anchored start whenever the previous column
    // ends at a fixed offset, so prefer it: it is the cheaper of the two claims.
    const prevEnd = side[n - 2] === 'R' ? B[n - 2] : -1;
    side += (prevEnd >= 0 && prevEnd + 1 === s0) ? 'F' : 'A';
  } else {
    side += 'F';
  }
  return { rows, side, A, B };
}

/**
 * Rebuild one record line from its values and the block's edges. The mirror of
 * the fitter's own arithmetic: `pos(c)` is the column edge, the gap before
 * column c is `pos(c) - end(c-1)`, and the last column starts one space past
 * the previous value.
 */
export function platosRebuildRow(row: string[], side: string, A: number[], B: number[]): string {
  const n = row.length;
  const pos = (c: number): number => {
    const k = side[c]!;
    if (k === 'L' || k === 'A') return A[c]!;
    if (k === 'R') return B[c]! - row[c]!.length;
    return -1; // 'F'
  };
  const end = (c: number): number => (side[c] === 'R' ? B[c]! : pos(c) + row[c]!.length);
  let out = '';
  for (let c = 0; c < n; c++) {
    let p: number;
    if (c === 0) p = pos(0);
    else if (side[c] === 'F') p = end(c - 1) + 1;
    else p = pos(c);
    if (p < 0) return '';
    const gap = c === 0 ? p : p - end(c - 1);
    if (gap < 0) return '';
    out += ' '.repeat(gap) + row[c]!;
  }
  return out;
}

/** Price and verify one candidate segment; returns null when it does not fit. */

function verifySeg(lines: string[], s: number[], n: number): { fit: Fit; padMass: number } | null {
  const f = fitModel(lines, s, n);
  if (!f) return null;
  let padMass = 0;
  for (let k = 0; k < s.length; k++) {
    if (platosRebuildRow(f.rows[k]!, f.side, f.A, f.B) !== lines[s[k]!]) return null;
    padMass += lines[s[k]!]!.length - f.rows[k]!.join(' ').length;
  }
  return { fit: f, padMass };
}

/**
 * Longest CONTIGUOUS sub-segment of `s` that fits the model, found by splitting
 * at the first row the model cannot rebuild and recursing on both halves.
 *
 * Contiguity is what keeps the wire cheap: a block is described by one marker
 * line and a row count, so a block with holes would need a literal-row escape.
 * Refusing holes costs coverage (a single malformed row splits the block), and
 * that cost is measured rather than hidden — `bench/x123/receipts/fit.json`
 * records rows-in-block against rows-in-file for every lane.
 */
function longestFitSeg(lines: string[], s: number[], n: number, depth: number): { s: number[]; fit: Fit; padMass: number } | null {
  if (s.length < PLATOS_MIN_ROWS || depth > 8) return null;
  const v = verifySeg(lines, s, n);
  if (v) return { s, fit: v.fit, padMass: v.padMass };
  // binary split on the first row that fails the two-stage test
  const mid = Math.floor(s.length / 2);
  const left = longestFitSeg(lines, s.slice(0, mid), n, depth + 1);
  const right = longestFitSeg(lines, s.slice(mid), n, depth + 1);
  if (!left) return right;
  if (!right) return left;
  return right.padMass > left.padMass ? right : left;
}

function fitBlock(lines: string[], n: number): PlatosBlock | null {
  const cand: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim().length && !l.startsWith('#')) cand.push(i);
  }
  if (cand.length < PLATOS_MIN_ROWS) return null;
  const runs: number[][] = [];
  let cur = [cand[0]!];
  for (let k = 1; k < cand.length; k++) {
    if (cand[k] === cur[cur.length - 1]! + 1) cur.push(cand[k]!);
    else { runs.push(cur); cur = [cand[k]!]; }
  }
  runs.push(cur);

  let best: PlatosBlock | null = null;
  const pat = patFor(n);
  for (const run of runs) {
    if (run.length < PLATOS_MIN_ROWS) continue;
    const segs: number[][] = [];
    let seg: number[] = [];
    for (const i of run) {
      if (pat.test(lines[i]!)) seg.push(i);
      else { if (seg.length >= PLATOS_MIN_ROWS) segs.push(seg); seg = []; }
    }
    if (seg.length >= PLATOS_MIN_ROWS) segs.push(seg);
    for (const s0 of segs) {
      // dropping leading lines lets a header or a `total NNNN` line lead the run
      for (let drop = 0; drop <= 2 && s0.length - drop >= PLATOS_MIN_ROWS; drop++) {
        const found = longestFitSeg(lines, s0.slice(drop), n, 0);
        if (!found) continue;
        if (!best || found.padMass > best.padMass) {
          best = { start: found.s[0]!, n, rows: found.fit.rows, side: found.fit.side, padMass: found.padMass };
        }
      }
    }
  }
  return best;
}

/** Find the highest-value padded record block in `lines`. */
export function platosFit(lines: string[]): PlatosBlock | null {
  let best: PlatosBlock | null = null;
  for (let n = PLATOS_MAX_COLS; n >= 3; n--) {
    const b = fitBlock(lines, n);
    if (b && (!best || b.padMass > best.padMass)) best = b;
  }
  return best;
}

/* -------------------------------------------------------------------------- *
 * 3. TRANSFORM / UNDO
 * -------------------------------------------------------------------------- */

function splitLines(text: string): { lines: string[]; eol: string } | null {
  if (text.includes('\r')) {
    // mixed or CR-only line endings: do not guess, decline the lane
    const norm = text.replace(/\r\n/g, '\n');
    if (norm.includes('\r')) return null;
    return { lines: norm.split('\n'), eol: '\r\n' };
  }
  return { lines: text.split('\n'), eol: '\n' };
}

function joinLines(lines: string[], eol: string): string {
  return lines.join(eol);
}

/** Marker line: `<mk><n>:<side>:<k>`. */
function markerLine(mk: string, n: number, side: string, k: number): string {
  return `${mk}${n}:${side}:${k}`;
}

/** Apply the transform: returns the transformed text and the block, or null. */
export function platosTransform(text: string): { text: string; mk: string; blk: PlatosBlock } | null {
  const sp = splitLines(text);
  if (!sp) return null;
  const blk = platosFit(sp.lines);
  if (!blk) return null;
  const depadded = blk.rows.map((r) => r.join(' '));
  const probe = [
    ...sp.lines.slice(0, blk.start),
    ' ', // placeholder, replaced once the marker is known
    ...depadded,
    ...sp.lines.slice(blk.start + blk.rows.length),
  ];
  const mk = PLATOS_MARKERS.find((c) => !probe.some((l) => l.includes(c)));
  if (!mk) return null;
  probe[blk.start] = markerLine(mk, blk.n, blk.side, blk.rows.length);
  // rows[0] MUST stay padded: it carries the column edges.
  probe[blk.start + 1] = sp.lines[blk.start]!;
  const out = joinLines(probe, sp.eol);
  if (undo(out) !== text) return null;
  return { text: out, mk, blk };
}

/** Invert the transform. Pure and total: a malformed marker returns the input. */
export function undo(text: string): string {
  const sp = splitLines(text);
  if (!sp) return text;
  const { lines, eol } = sp;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    const mk = l.match(/^([‡¤※°µ¦†◊◈])(\d+):([LR]+[AF]):(\d+)$/);
    if (!mk) continue;
    const n = Number(mk[2]);
    const side = mk[3]!;
    const k = Number(mk[4]);
    if (side.length !== n || n < 3 || k < PLATOS_MIN_ROWS) return text;
    if (i + k >= lines.length) return text;
    const tpl = lines[i + 1]!;
    const tm = patFor(n).exec(tpl);
    if (!tm) return text;
    // edges, read off the template with the same splitter the fitter used
    const A = new Array<number>(n).fill(-1);
    const B = new Array<number>(n).fill(-1);
    let at = 0;
    for (let c = 0; c < n; c++) {
      const v = tm[c + 1]!;
      const p = tm[0].indexOf(v, at);
      if (p < 0) return text;
      if (c < n - 1) {
        if (side[c] === 'L') A[c] = p;
        else { B[c] = p + v.length; A[c] = B[c]! - v.length; }
      } else if (side[c] === 'A') {
        A[c] = p;
      }
      at = p + v.length;
    }
    const out = lines.slice();
    out[i + 1] = tpl;
    for (let r = 1; r < k; r++) {
      const line = lines[i + 1 + r]!;
      const parts: string[] = [];
      let rest = line;
      for (let c = 0; c < n - 1; c++) {
        const sp2 = rest.indexOf(' ');
        if (sp2 < 0) return text;
        parts.push(rest.slice(0, sp2));
        rest = rest.slice(sp2 + 1);
      }
      parts.push(rest);
      out[i + 1 + r] = platosRebuildRow(parts, side, A, B);
    }
    out.splice(i, 1);
    return joinLines(out, eol);
  }
  return text;
}

/* -------------------------------------------------------------------------- *
 * 4. ENCODE
 * -------------------------------------------------------------------------- */

export interface PlatosOptions {
  /** the incumbent whole-message token count to beat; when absent it is measured */
  incumbent?: number;
  /** disable the module (env: OMEGA_NO_PLATOS=1) */
  disabled?: boolean;
}

/**
 * ΠΛΑΤΟΣ is OFF BY DEFAULT and this is measured, not cautious.
 *
 *   bench/x123/platos-chain.ts   -- best measured lane, dpkg-l: the de-padded
 *                                   text prices 616 tokens through the FULL
 *                                   parent chain against 655 for the source,
 *                                   i.e. -39 tokens of real mechanism, and the
 *                                   cheapest in-band contract that still reads
 *                                   as English to a decoder with no system
 *                                   prompt costs 31 tokens (bench/x123/contract-price.ts).
 *                                   Net -8. Requirement (b) is > 10, so the arm
 *                                   does not ship in the chain.
 *   bench/x123/platos-inline.ts  -- putting that same instruction IN the marker
 *                                   line, so the child can grammar-compress it,
 *                                   is worse (-2 on dpkg-l, +22 on kubectl): the
 *                                   sentence is incompressible and it splits the
 *                                   record block the fitter just built.
 *   bench/x123/platos-probe2.ts  -- wired in and gated on a strict win, ΠΛΑΤΟΣ
 *                                   changed NOTHING on 8 lanes (Δ 0, 8/8 exact)
 *                                   while costing a whole extra chain encode
 *                                   (+40% wall clock on ps-aux-real).
 *
 * `OMEGA_PLATOS=1` turns it on for anyone who wants to re-measure; the module,
 * its fitter and all three receipts stay in the tree.
 */
export function platosDisabled(): boolean {
  if (typeof process === 'undefined' || !process.env) return true;
  return process.env.OMEGA_PLATOS !== '1' || process.env.OMEGA_NO_PLATOS === '1';
}

export function platosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: PlatosOptions = {},
): PlatosResult {
  const parentTokens = options.incumbent ?? countTokens(text, enc);
  const identity = (notes: string): PlatosResult => ({
    applied: false, message: text, decoded: text, messageTokens: parentTokens, parentTokens,
    transformed: text, rows: 0, cols: 0, padMass: 0, sideStreamTokens: 0, notes,
  });
  if (options.disabled || platosDisabled()) return identity('disabled (OMEGA_NO_PLATOS=1)');
  if (!text.length || text.length > 400_000) return identity('length out of range');

  let tr: { text: string; mk: string; blk: PlatosBlock } | null = null;
  try {
    tr = platosTransform(text);
  } catch {
    return identity('fit threw');
  }
  if (!tr) return identity('no reconstructible padded record block');
  const { blk } = tr;

  let child: ReturnType<typeof archetyponEncode>;
  try {
    child = archetyponEncode(tr.text, enc);
  } catch {
    return identity('child encoder threw');
  }
  if (child.decoded !== tr.text) return identity('child did not round-trip its own input');
  const decoded = undo(child.decoded);
  if (decoded !== text) return identity('undo(child output) !== source');

  const message = PLATOS_CONTRACT + '\n' + child.message;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= parentTokens) {
    return identity(`no win: ${messageTokens} >= ${parentTokens}`);
  }
  const sideStreamTokens = messageTokens - child.messageTokens;
  return {
    applied: true, message, decoded, messageTokens, parentTokens,
    transformed: tr.text, rows: blk.rows.length, cols: blk.n, padMass: blk.padMass,
    sideStreamTokens,
    notes: `ΠΛΑΤΟΣ ${blk.rows.length}x${blk.n} pad ${blk.padMass} side=${blk.side} ` +
      `M ${parentTokens}->${messageTokens} (side-stream ${sideStreamTokens}); ${child.notes}`,
  };
}

/** Decode the child layer, then undo the padding. Total: never throws. */
export function platosDecode(childDecoded: string): string {
  return undo(childDecoded);
}

/* -------------------------------------------------------------------------- *
 * 5. SELF TEST
 * -------------------------------------------------------------------------- */

export function platosSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const out: Array<{ name: string; ok: boolean; detail: string }> = [];
  const pad = (s: string, w: number, r: boolean) => (r ? s.padStart(w) : s.padEnd(w));

  // a synthetic ls -l block: perms left, links right, size right, name last
  const rows: string[][] = [
    ['drwxr-xr-x', '4', '128', 'ImageMagick-6.9.11'],
    ['-rw-r--r--', '1', '496', 'Mcrt1.o'],
    ['lrwxrwxrwx', '12', '8192', 'gconv'],
    ['-rw-r--r--', '2', '64', 'a b c'],
    ['drwxr-xr-x', '1', '1032', 'zzz'],
    ['-rw-r--r--', '3', '96', 'd'],
    ['-rw-r--r--', '1', '7008', 'e f'],
    ['-rw-r--r--', '1', '54', 'g'],
  ];
  const lines = rows.map((r) => `${pad(r[0]!, 10, false)} ${pad(r[1]!, 2, true)} ${pad(r[2]!, 5, true)} ${r[3]}`);
  const text = '# source\n' + lines.join('\n') + '\n';
  const tr = platosTransform(text);
  out.push({ name: 'synthetic block fits', ok: !!tr, detail: tr ? `${tr.blk.rows.length}x${tr.blk.n} pad ${tr.blk.padMass}` : 'no fit' });
  if (tr) {
    out.push({ name: 'synthetic undo is exact', ok: undo(tr.text) === text, detail: 'undo(transform(t)) === t' });
    const r = platosEncode(text, enc, { incumbent: countTokens(text, enc) + 10000 });
    out.push({ name: 'synthetic encode round-trips', ok: !r.applied || r.decoded === text,
      detail: r.applied ? r.notes : 'declined: ' + r.notes });
  }
  // a prose sample must not fit
  const prose = 'The quick brown fox jumps over the lazy dog.\n'.repeat(1) +
    Array.from({ length: 12 }, (_, i) => `Paragraph ${i} has a few words in it that differ.`).join('\n');
  out.push({ name: 'prose does not fit', ok: platosFit(prose.split('\n')) === null, detail: 'no false positive' });
  // a non-block text is returned unchanged by undo
  out.push({ name: 'undo is total on plain text', ok: undo(prose) === prose, detail: 'identity' });
  // csv must not fit (single-space padding is absent)
  const csv = Array.from({ length: 12 }, (_, i) => `row${i},value${i},${1000 + i}`).join('\n');
  out.push({ name: 'csv does not fit', ok: platosFit(csv.split('\n')) === null, detail: 'no false positive' });
  return out;
}
