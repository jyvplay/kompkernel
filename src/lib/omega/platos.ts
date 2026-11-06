/**
 * src/lib/omega/platos.ts — X76. ΠΛΆΤΟΣ (platos), "width".
 * =============================================================================
 *
 * THE MEASUREMENT (bench/x76/t3.ts, receipts/padding.json)
 * --------------------------------------------------------
 * In an aligned table the spaces between columns are not data. They are a FUNCTION of
 * the column width and the length of the value in the cell, so every one of them is
 * determined by information the reader already has. Measured over 20 lanes, replacing
 * every run of two-or-more spaces with a single space costs:
 *
 *     ps-aux-real   3 054 -> 2 585   (-469, -15.4 %)
 *     ls-l-real     5 194 -> 4 752   (-442,  -8.5 %)
 *     ps-ef         1 144 ->   984   (-160, -14.0 %)
 *     ps-real       1 106 ->   948   (-158, -14.3 %)
 *     dpkg-l        1 000 ->   858   (-142, -14.2 %)
 *     kubectl       1 006 ->   868   (-138, -13.7 %)
 *     node-help     1 099 ->   953   (-146, -13.3 %)
 *     vmstat          229 ->   182   (-47,  -20.5 %)
 *     ...                            TOTAL -2 034 of 23 020 (-8.8 %)
 *     metrics.tsv, prices.csv, du-real, apt-real, kb-article:  0 (no padding exists)
 *
 * THE MECHANIC: IMPROVE THE REPRESENTATION THE PARENT FRONTIER SEES
 * -----------------------------------------------------------------
 * Every codec in this stack takes the source as given and writes a wire for it. PLATOS
 * does not touch the wire at all. It changes the frontier's INPUT: it removes the
 * padding, hands the squeezed text to the parent frontier, and ships the few tokens
 * needed for the reader to put the padding back.
 *
 *     message  =  "<width declaration>"  ‖  frontier(squeeze(text))
 *
 * This is the PROSPHYSIS shape (rewrite the source, pay a key, feed the frontier, gate
 * on byte-exact reconstruction and a strict win) applied to a redundancy that PROSPHYSIS
 * does not touch, because PROSPHYSIS's relation is between two *fields* and this one is
 * inside a *field's own whitespace*.
 *
 * WHY THE WIDTHS DO NOT HAVE TO BE PAID FOR PER CELL
 * --------------------------------------------------
 * A padding run's length is (column width - value length). The value is transmitted, so
 * only the column width is missing, and there is one width per COLUMN, not per cell and
 * not per row. A table with R rows and C columns therefore costs C numbers instead of
 * R*C padding runs. That ratio is the whole codec.
 *
 * HOW IT DIFFERS FROM STOICHEION (X74), WHICH LOST ON ALL 29 LANES
 * ----------------------------------------------------------------
 * STOICHEION recoded each column into a new alphabet (dictionary, run-length,
 * arithmetic progression, clock) and had to ship a key AND a width vector AND a
 * per-column model tag. Its reconstruction depended on all of that being right. PLATOS
 * recodes NOTHING: the cells are transmitted verbatim, the frontier compresses them
 * however it likes, and the only thing the reader must do is put spaces back. The
 * declaration is a width vector and an alignment string; it does not participate in
 * reconstructing any cell's CONTENT, only its position.
 *
 * GREEDY? PARTLY, AND THE PART IS STATED
 * --------------------------------------
 * Column detection is greedy and parameter-free: a position is a gap if every line has a
 * space there, columns are the maximal runs between gaps, and a column's alignment is
 * whatever all of its cells agree on. There is no search over segmentations, no
 * coordinate descent, and no clock. The only decision is ADMIT OR NOT, and it is taken by
 * measuring the complete message against the frontier's, in the same process.
 *
 * VERIFICATION
 * ------------
 *   GATE 1  RESTORE. Decode the frontier's output, re-pad it, and compare to the source
 *           byte for byte. Executed on every encode; a mismatch refuses the codec.
 *   GATE 2  CONFORMANCE. Every line must respect every column boundary and the column's
 *           alignment. A single violation refuses the codec (fails closed).
 *   GATE 3  GAP SOUNDNESS. A gap position must have a space on EVERY line; otherwise two
 *           columns would be merged and the reconstruction would be wrong.
 *   GATE 4  STRICT WIN. The complete message, declaration included, must be strictly
 *           smaller than the frontier's message on the unsqueezed source.
 *
 * WHAT IS NOT CLAIMED
 * -------------------
 * Nothing on a document that is not an aligned table: TSV, CSV, prose and logs have no
 * multi-space runs and the detector correctly refuses them (measured: 0 padding
 * characters on metrics.tsv, prices.csv, du-real, apt-real, kb-article). Nothing for a
 * table whose cells do not agree on an alignment. Nothing for a table with a cell that
 * bleeds across a column boundary.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

export interface PlatosColumn {
  /** inclusive start index in the original line */
  start: number;
  /** width in characters; the last column runs to end of line */
  width: number;
  /** how the value sits inside the column */
  align: 'L' | 'R';
}

export interface PlatosPlan {
  columns: PlatosColumn[];
  squeezed: string;
  /** how many multi-space characters were removed */
  removed: number;
}

export interface PlatosResult {
  codec: 'platos';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  declarationTokens: number;
  columns: number;
  removed: number;
  frontierParent: string;
  notes: string;
}

/** A gap position must have a space on EVERY line considered. */
function gapsOf(lines: string[]): boolean[] {
  let maxLen = 0;
  for (const l of lines) if (l.length > maxLen) maxLen = l.length;
  const isGap = new Array<boolean>(maxLen);
  for (let i = 0; i < maxLen; i++) {
    let gap = true;
    for (const l of lines) {
      if (i < l.length && l[i] !== ' ') { gap = false; break; }
    }
    isGap[i] = gap;
  }
  return isGap;
}

function spansOf(isGap: boolean[]): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < isGap.length) {
    if (!isGap[i]) {
      let j = i;
      while (j < isGap.length && !isGap[j]) j++;
      spans.push({ start: i, end: j });
      i = j;
    } else i++;
  }
  return spans;
}

/** Build a column layout from the given lines. Null if they do not share one. */
function layoutFrom(lines: string[], minColumns: number): PlatosColumn[] | null {
  if (lines.length < 4) return null;
  const isGap = gapsOf(lines);
  const spans = spansOf(isGap);
  if (spans.length < minColumns) return null;
  const last = spans[spans.length - 1];
  const cols: PlatosColumn[] = [];
  for (const sp of spans) {
    if (sp === last) {
      for (const l of lines) {
        if (l.length < sp.start) continue;
        const v = l.slice(sp.start);
        const t = v.replace(/\s+$/, '');
        if (t !== '' && !v.startsWith(t)) return null;
      }
      cols.push({ start: sp.start, width: 0, align: 'L' });
      continue;
    }
    let left = true;
    let right = true;
    for (const l of lines) {
      if (l.length < sp.start) { left = false; right = false; break; }
      const v = l.slice(sp.start, sp.end);
      const t = v.trim();
      if (t === '') continue;
      if (!v.startsWith(t)) left = false;
      if (!v.endsWith(t)) right = false;
      if (!left && !right) return null;
    }
    if (!left && !right) return null;
    cols.push({ start: sp.start, width: sp.end - sp.start, align: left ? 'L' : 'R' });
  }
  for (const l of lines) if (l.length < last.start) return null;
  return cols;
}

/** Does this line round-trip under `cols`? (Used to separate table lines from the rest.) */
function conforms(line: string, cols: PlatosColumn[]): boolean {
  if (line.trim() === '') return true;
  if (/\s$/.test(line)) return false;
  if (line.length < cols[cols.length - 1].start) return false;
  for (let i = 0; i < cols.length - 1; i++) {
    const v = line.slice(cols[i].start, cols[i].start + cols[i].width).trim();
    if (v === '' || /\s/.test(v)) return false;
  }
  return rebuildFrom(platosSqueezeLine(line, cols).split(' '), cols) === line;
}

/** Rebuild one line from its column values. Shared by conformance and by the decoder. */
function rebuildFrom(vals: string[], cols: PlatosColumn[]): string {
  let s = '';
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const v = vals[i] ?? '';
    while (s.length < c.start) s += ' ';
    if (i === cols.length - 1) s += v;
    else s += c.align === 'R' ? v.padStart(c.width, ' ') : v.padEnd(c.width, ' ');
  }
  return s;
}

function platosSqueezeLine(line: string, cols: PlatosColumn[]): string {
  const vals: string[] = [];
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    if (i === cols.length - 1) vals.push(line.slice(c.start));
    else vals.push(line.slice(c.start, c.start + c.width).trim());
  }
  return vals.join(' ');
}

/**
 * Detect the fixed-width layout, tolerating lines that are not part of the table.
 *
 * A fixture is not a clean table: `ps` output opens with a `# source:` comment, `dpkg -l`
 * has five header lines, `ls -l` has a `total N` line. Demanding that every line conform
 * (the first implementation) refused every single lane. So the layout is found by a
 * fixpoint: compute a layout from the lines, keep the lines that round-trip under it,
 * recompute, repeat. Lines that never conform are carried verbatim and marked.
 */
export function platosDetect(lines: string[], minColumns = 3): PlatosColumn[] | null {
  let cur = lines.filter((l) => l.trim() !== '');
  // SEEDING. A fixture is not a clean table: `ps` opens with a `# source:` comment,
  // `dpkg -l` has five preamble lines, `ls -l` has a `total N` line. None of those
  // contain a run of two-or-more spaces; table rows essentially always do. Starting the
  // fixpoint from the double-space lines is what makes detection fire at all — starting
  // from every line (the first implementation) returned null on every single lane.
  if (layoutFrom(cur, minColumns) === null) {
    const spaced = cur.filter((l) => / {2,}/.test(l));
    if (spaced.length >= 4) cur = spaced;
  }
  let cols: PlatosColumn[] | null = null;
  for (let round = 0; round < 4; round++) {
    const next = layoutFrom(cur, minColumns);
    if (next === null) return cols;
    cols = next;
    const keep = cur.filter((l) => conforms(l, cols!));
    if (keep.length === cur.length) break;
    if (keep.length < 4) return cols;
    cur = keep;
  }
  return cols;
}

/** A marker character that does not occur anywhere in the text. */
export function platosMarker(text: string): string | null {
  for (const m of ['~', '|', '\u00ac', '\u00a6', '\u2021', '\u00b6']) {
    if (!text.includes(m)) return m;
  }
  return null;
}

export interface PlatosTransform {
  cols: PlatosColumn[];
  marker: string | null;
  /** squeezed text; lines that do not conform are `marker` + the original line */
  squeezed: string;
  removed: number;
  /** number of lines carried verbatim */
  verbatim: number;
}

export function platosTransform(text: string, cols: PlatosColumn[], marker: string | null): PlatosTransform | null {
  const out: string[] = [];
  let removed = 0;
  let verbatim = 0;
  for (const line of text.split('\n')) {
    if (line.trim() === '') { out.push(line); continue; }
    if (!conforms(line, cols)) {
      if (marker === null) return null;
      out.push(marker + line);
      verbatim++;
      continue;
    }
    const vals: string[] = [];
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (i === cols.length - 1) vals.push(line.slice(c.start));
      else {
        const v = line.slice(c.start, c.start + c.width);
        const t = v.trim();
        removed += v.length - t.length;
        vals.push(t);
      }
    }
    out.push(vals.join(' '));
  }
  return { cols, marker, squeezed: out.join('\n'), removed, verbatim };
}

/** Inverse of `platosTransform`. Executed as GATE 1 on every encode. */
export function platosUntransform(squeezed: string, cols: PlatosColumn[], marker: string | null): string {
  const out: string[] = [];
  for (const line of squeezed.split('\n')) {
    if (line.trim() === '') { out.push(line); continue; }
    if (marker !== null && line.startsWith(marker)) { out.push(line.slice(marker.length)); continue; }
    const parts: string[] = [];
    let rest = line;
    for (let i = 0; i < cols.length - 1; i++) {
      const sp = rest.indexOf(' ');
      if (sp < 0) { parts.push(rest); rest = ''; }
      else { parts.push(rest.slice(0, sp)); rest = rest.slice(sp + 1); }
    }
    parts.push(rest);
    out.push(rebuildFrom(parts, cols));
  }
  return out.join('\n');
}

/** The declaration the reader needs: column widths and how each value sits in its column. */
export function platosDeclaration(cols: PlatosColumn[], marker: string | null): string {
  const w = cols.slice(0, -1).map((c) => String(c.width)).join(',');
  const a = cols.map((c) => c.align).join('');
  const align = a.includes('R') ? 'right-aligned where the letter is R, left-aligned where it is L' : 'left-aligned';
  const mk = marker === null ? '' : ` ${marker}=literal line.`;
  return `w ${w} ${a}; pad each value into its column, last to EOL.${mk}`;
}

export function platosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): PlatosResult {
  const frontier: TagstackResult = frontierFn(text, enc);
  const refuse = (notes: string): PlatosResult => ({
    codec: 'platos', message: frontier.message, decoded: frontier.decoded,
    exact: frontier.decoded === text, applied: false,
    frontierTokens: frontier.messageTokens, messageTokens: frontier.messageTokens,
    declarationTokens: 0, columns: 0, removed: 0, frontierParent: frontier.parentCodec, notes,
  });

  if (frontier.decoded !== text) return refuse('platos: parent is not exact');

  const cols = platosDetect(text.split('\n'));
  if (cols === null) return refuse('platos: no fixed-width layout');

  const marker = platosMarker(text);
  const tr = platosTransform(text, cols, marker);
  if (tr === null) return refuse('platos: a line cannot be carried verbatim (no free marker)');

  // GATE 1 — restore must reproduce the source byte for byte BEFORE spending a frontier
  // encode on it. Cheap, and it catches every boundary mistake.
  if (platosUntransform(tr.squeezed, cols, marker) !== text) {
    return refuse('platos: restore does not reproduce the source byte for byte');
  }

  const inner: TagstackResult = frontierFn(tr.squeezed, enc);
  if (inner.decoded !== tr.squeezed) return refuse('platos: parent is not exact on the squeezed text');

  // GATE 1 on the SHIPPED message: restore the parent's reconstruction.
  const restored = platosUntransform(inner.decoded, cols, marker);
  if (restored !== text) return refuse('platos: decoded message does not reproduce the source');

  const decl = platosDeclaration(cols, marker);
  const declTokens = countTokens(decl, enc);
  const message = `${decl}\n${inner.message}`;
  const tokens = countTokens(message, enc);

  // GATE 4 — strict win, declaration included.
  if (tokens >= frontier.messageTokens) {
    return refuse(`platos loses: ${tokens} vs ${frontier.messageTokens} (decl ${declTokens}, removed ${tr.removed})`);
  }

  return {
    codec: 'platos', message, decoded: text, exact: true, applied: true,
    frontierTokens: frontier.messageTokens, messageTokens: tokens,
    declarationTokens: declTokens, columns: cols.length, removed: tr.removed,
    frontierParent: frontier.parentCodec,
    notes: `${cols.length} columns, ${tr.removed} pad chars removed, ${tr.verbatim} lines verbatim, decl ${declTokens} tok, ${frontier.messageTokens}->${tokens} (${tokens - frontier.messageTokens})`,
  };
}
