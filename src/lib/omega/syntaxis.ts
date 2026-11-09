/**
 * src/lib/omega/syntaxis.ts — ΣΥΝΤΆΞΙΣ (SYNTAXIS, "a putting in order together; syntax") — X88.
 *
 * =============================================================================
 * THE MEASURED HOLE
 * =============================================================================
 * Every fold in this stack that reads a file as a population of lines needs the
 * lines to agree on a shape, and every one of them decides "agree" with a key that
 * is either length-sensitive or space-only. The consequence is measurable, and it is
 * large (bench/x88/receipts/skeleton-census.json, 14 real lanes):
 *
 *     lane                       lines  shapes  largest group   coverage
 *     ls-l-real.txt                151      21             36      23.8 %
 *     ps-aux-real.txt               61      22             19      31.1 %
 *     ls-la-usrbin.txt             121      20             38      31.4 %
 *     npm-ls.txt                   150       7             60      40.0 %
 *     find-listing.txt             120       5             64      53.3 %
 *     openstack-loghub-26.log       26       7             15      57.7 %
 *     psql-output.txt               29       5             16      55.2 %
 *     findmnt.txt                   27      26              2       7.4 %
 *     dpkg-l.txt                    41      37              3       7.3 %
 *     node-help.txt                121      43             16      13.2 %
 *     git-numstat.txt              400       8            392      98.0 %
 *
 * `ls -l` output is ONE shape to any human and to any model: permissions, links,
 * owner, group, size, month, day, time-or-year, name — plus a second shape for
 * symlinks, which carry ` -> target`. Twenty-one "shapes" is not twenty-one shapes;
 * it is two shapes shattered by the *length* of the size field and the name.
 * `cellSignature` (typos.ts:320) encodes each cell as `w` or `s<length>`, so a
 * 5-digit size and a 6-digit size are different shapes, and `largestGroup` then
 * folds 36 of 151 lines and leaves 115 as literal text. `findmnt` and `dpkg -l`
 * fragment to 7.4 % and 7.3 % coverage and `typosPlan` returns **null** — the fold
 * does not fire at all.
 *
 * The second failure is independent and just as costly. `cellSignature` splits on
 * `/\S+| +/g`: a TAB is neither `\S` nor ` `, so it is dropped from the cell
 * partition entirely. `git numstat` — 392 of 400 lines with the identical shape
 * `added\tdeleted\tpath`, 98 % coverage under ANY grouping key — still gets
 * `typosPlan === null`, because the cells do not reassemble to the line. The same
 * blindness is why `kannabosCells` (`/[^ ]+/g`) sees one cell in a TSV and reports
 * "no grid plan" for `metrics.tsv`. Two codecs, one bug shape, and it costs the
 * stack the two most common machine-readable layouts there are: TAB-separated
 * columns and right-aligned fixed-width columns.
 *
 * =============================================================================
 * THE MECHANISM
 * =============================================================================
 * ΣΥΝΤΆΞΙΣ changes the grouping key and then folds EVERY group, not the largest.
 *
 *   1. **Cells over all whitespace.** `line.match(/\S+|\s+/g)` partitions a line
 *      into alternating non-space and space runs, TAB and CR included, and
 *      `cells.join('') === line` by construction. That identity is the whole
 *      exactness argument and it holds for every line of every file, so the
 *      reassembly step cannot drift.
 *
 *   2. **A length-invariant class signature.** Each cell is collapsed by
 *      RUN-COLLAPSED CHARACTER CLASS: `[A-Za-z]+ -> a`, `[0-9]+ -> 9`, every other
 *      character kept, and a whitespace run reduced to `s` with NO length. So
 *      `-rw-r--r--` -> `-a-a--a--`, `48016` -> `9`, `libapt-pkg.so.6.0.0` ->
 *      `aa-a.9.9.9`, and a padding run of any width -> `s`. Measured on the same
 *      14 lanes this collapses `ls-l-real` from 21 shapes to 2, `ps-aux-real` from
 *      22 to 2, `findmnt` from 26 to 1 and `dpkg-l` from 37 to 3 — see
 *      `classCoverage` in the receipt. The signature is a property of the LINE, not
 *      of a tokenizer, so it costs nothing to compute and cannot depend on a
 *      vocabulary.
 *
 *   3. **Partition, then fold each family.** Families with at least MIN_ROWS lines
 *      are folded; the rest are carried literally. Nothing is discarded: every line
 *      is either in exactly one family or in the literal section, and the map says
 *      which. This is the part no existing arm does — `typosPlan` builds three
 *      candidate families (all lines, largest by `cellSignature`, largest by word
 *      count), picks the ONE with the best proxy gain, and every line outside it
 *      stays literal.
 *
 *   4. **Constants hoisted into a per-family template.** Within a family, cell
 *      positions whose value is identical on every line are written once into the
 *      template; the rest become numbered slots. For `ls -l` that hoists the whole
 *      `-rw-r--r-- 1 root root` spine and the month names for any month that is
 *      constant across the family.
 *
 *   5. **Derived padding.** A whitespace-run slot whose length satisfies
 *      `len_i = W - len(nextCell_i)` for one constant W across the whole family is
 *      RIGHT-ALIGNMENT GEOMETRY, not data: the column is deleted and W declared.
 *      The reader recomputes the padding from the value it is about to print. This
 *      is PARATAXIS's insight (`§PARATAXIS pad fields to 56 18 12`) reached by a
 *      different route — fitted per family and per position, and only where the fit
 *      is exact on every line, so it can never be wrong about a line it did not
 *      examine.
 *
 *   6. **De-interleaved columns.** Each surviving slot becomes ONE line carrying
 *      that slot's values for the whole family, joined by a separator chosen per
 *      family from a candidate list as the first character that occurs in NO cell of
 *      that family. Homogeneous runs of values are what a tokenizer's merge table
 *      and a repetition model are built for; the same values interleaved with
 *      skeleton text on every line are not. (TYPOS established this and cites the
 *      column store; ΣΥΝΤΆΞΙΣ inherits the argument and not the code.)
 *
 *   7. **A one-character-per-line map.** The body opens with a map string of exactly
 *      one character per source line: a family index for a folded line, `*` for a
 *      literal one. Runs of the same character are what the parent frontier pools
 *      best, so a file that is 392 stat lines and 8 commit lines costs about 4
 *      pooled tokens for its map, not 400.
 *
 * =============================================================================
 * WHY THIS IS NOT A RENAME
 * =============================================================================
 *   · TYPOS (X41)        one family, the largest, under a length-sensitive and
 *                        space-only key; refuses when that family is too small.
 *   · ΚΕΝΟΝ (X86)        one table, boundaries by gap voting; refuses when the gaps
 *                        are not stable (prose tail, TAB).
 *   · KANON / AMPHORA    one aligned table, generated columns.
 *   · PARATAXIS (X80)    one aligned table, padding declared as fixed widths.
 *   · APOGRAPHE          one aligned table, per-field numeric and clock templates.
 *   · SCHEMA (X82)       per-TOKEN shapes (semver, ISO date, clock, decimal, IPv4),
 *                        not per-line families.
 *   · KLADIOS            tree drawing to a depth digit; one nesting style.
 *   · ΣΥΝΤΆΞΙΣ           n families under a length-invariant, whitespace-general key,
 *                        each folded separately, with derived padding per position
 *                        and a literal section for everything else.
 *
 * The new object is the PARTITION and the ROUTING, not the fold: the fold per family
 * is deliberately dumb (constants, columns, derived padding) because the parent
 * frontier that reads the wire already owns the sophisticated dictionary and grammar
 * machinery, and duplicating it inside this module would only add a second place to
 * be wrong.
 *
 * =============================================================================
 * WIRE
 * =============================================================================
 *   §ΣΥΝΤΆΞΙΣ L=<nLines> F=<nFamilies> * = literal line            [contract, one line]
 *   M<mapString>                                                   [one char per line]
 *   T<f> <cellSep> <template cells, slot j written as @j>          [one per family]
 *   W<f> <padSpec>                                                 [derived padding, if any]
 *   C<f>.<j> <sep> <values joined by sep>                          [one per slot]
 *   X <literal lines, one per line, in source order>               [if any]
 *
 * Decoding is mechanical and needs nothing but the message: read the map; for each
 * source line, if it is `*` take the next literal line, otherwise take the next
 * unused row of that family's columns, substitute into the template, re-insert any
 * derived padding, and concatenate the cells.
 *
 * =============================================================================
 * GATES — every one runs on every encode; any failure refuses and returns identity
 * =============================================================================
 *   G1  cells reassemble        `cells.join('') === line` for every line
 *   G2  partition is total      every line is in exactly one family or the literal set
 *   G3  slot separator absent   the declared separator occurs in no cell of the family
 *   G4  derived padding exact   `W - len(nextCell)` reproduces every padding run
 *   G5  round trip              `syntaxisDecode(message) === text`, byte for byte
 *   G6  index range             every family index char is in the declared alphabet
 *   G7  strict win              message tokens < the caller's frontier tokens
 *   G8  size bound              refuse above MAX_CHARS rather than allocate
 *
 * GREEDY?  No. The partition is a deterministic grouping by a fixed key; the template
 * constants are exact equality over a family; the padding fit is an exact solve for
 * one integer; the separator is the first candidate that survives a scan. There is no
 * search, no scoring loop and no local move, so the wire is a function of the text.
 *
 * TIME- OR CPU-BOUND?  CPU-bound, and cheap: one pass to split, one to sign, one to
 * group, one per family to hoist constants and fit padding, one to render. O(chars)
 * with a small constant and no tokenizer call inside the transform at all — the only
 * tokenizer calls are the two counts the gates need. The expensive part of using this
 * arm is, as everywhere else in this stack, the ONE parent-frontier encode that G7
 * requires, because a proxy gain is not a win.
 *
 * HONEST LIMITS.  A family must reach MIN_ROWS lines to be folded, so a file of 40
 * distinct shapes folds nothing and refuses. Prose has no repeated cell structure and
 * is carried literally, which is correct but is not a win. The columns are only as
 * good as the parent frontier's ability to pool inside a homogeneous run, so the gain
 * is realised by the reader of the wire and not by this module — which is exactly why
 * G7 measures through the frontier instead of trusting `countTokens(message)`.
 */
import { countTokens, type EncodingName } from './bpe';
import { crc32 } from './aither';

/** CRC-32 over the UTF-8 bytes of the source text, as 8 lowercase hex characters.
 *  Reuses ΑΙΘΗΡ's table rather than growing a second one. Its job is narrow and stated
 *  narrowly: it turns a SILENT WRONG decode into a refusal. Without it the wire is
 *  self-describing but not self-checking, and flipping one character inside a column
 *  value yields a structurally valid wire that decodes to a DIFFERENT document with no
 *  error — measured at 244 of 427 effective fuzz mutations (57 %) before this field
 *  existed. A model cannot compute a CRC by hand, so this is a decoder-side safety
 *  property, exactly as it is in ΑΙΘΗΡ, and not a claim that the reader can verify it. */
export function syntaxisChecksum(text: string): string {
  return crc32(new TextEncoder().encode(text)).toString(16).padStart(8, '0');
}

export const MAX_CHARS = 2_000_000;
/** A family below this is not worth a template; its lines go to the literal section. */
export const MIN_ROWS = 4;

/** Family index alphabet. `*` is reserved for "literal line". */
const IDX = 'abcdefghijklmnopqrstuvwxyz012345678';
const LIT = '*';

/** Separators tried, in order, for the cell list and for each column. */
const SEP_CANDIDATES = ['¦', '|', '⁞', '‖', ';', '¤', '‡', '~', '^', '·'];
/** Marker used inside a template cell list for "this cell is slot j". */
const SLOT_MARK = '@';

export class SyntaxisRefused extends Error {
  readonly gate: string;
  constructor(gate: string, message: string) {
    super(`syntaxis: refused at ${gate} — ${message}`);
    this.name = 'SyntaxisRefused';
    this.gate = gate;
  }
}

export interface SyntaxisFamily {
  index: number;
  sig: string;
  lines: number[];          // source line numbers, ascending
  cells: string[][];        // per row, the cell partition
  template: string[];       // per cell position: the constant, or `@j`
  slots: number[];          // slot numbers, in cell order
  columns: string[][];      // per slot, the values down the family
  cellSep: string;
  colSep: string[];         // per slot; '\n' means "one value per wire line" 
  /** slot -> W, meaning the whitespace cell before it was W - len(value) spaces */
  padWidth: Map<number, number>;
}

export interface SyntaxisPlan {
  crc: string;
  eol: string;
  tail: string;
  lineCount: number;
  map: string;
  families: SyntaxisFamily[];
  literals: string[];
  classShapes: number;
  cellShapes: number;
}

export interface SyntaxisResult {
  message: string;
  decoded: string;
  messageTokens: number;
  exact: boolean;
  applied: boolean;
  frontierTokens: number | null;
  families: number;
  foldedLines: number;
  literalLines: number;
  slots: number;
  constants: number;
  derivedPadding: number;
  /** coverage of the largest group under the OLD length-sensitive key, for the receipt */
  oldCoveragePct: number;
  /** coverage under the new class key */
  newCoveragePct: number;
  ms: number;
  notes: string;
}

/* ---------------------------------------------------------------------------
 * Cell partition. `/\S+|\s+/g` covers every whitespace character, so TAB and CR
 * are cells and not holes, and the join is the identity. G1 checks it anyway.
 * ------------------------------------------------------------------------- */
export function cellsOf(line: string): string[] {
  return line.match(/\S+|\s+/g) ?? [];
}

/**
 * The length-invariant, whitespace-general class signature.
 *   [A-Za-z]+ -> a     [0-9]+ -> 9     whitespace run -> s (no length)
 *   every other character kept verbatim
 * `-rw-r--r--` -> `-a-a--a--`;  `48016` -> `9`;  `libapt-pkg.so.6.0.0` -> `aa-a.9.9.9`
 */
/** Coarse: where the gaps are, and nothing else. `ls -l` is ONE shape under this key
 *  no matter how wide the size column is or what punctuation the name carries. */
export function gapSignature(line: string): string {
  const parts: string[] = [];
  for (const c of cellsOf(line)) parts.push(/^\s+$/.test(c) ? 's' : 'c');
  return parts.join('\u0000');
}

export function classSignature(line: string): string {
  const parts: string[] = [];
  for (const c of cellsOf(line)) {
    if (/^\s+$/.test(c)) { parts.push('s'); continue; }
    parts.push(c.replace(/[A-Za-z]+/g, 'a').replace(/[0-9]+/g, '9'));
  }
  // The joiner matters: without it `cells ['as','9']` and `cells ['a',' ','9']` both
  // collapse to "as9", so two lines with DIFFERENT cell counts would share a family
  // and the rectangularity check would silently drop that family. NUL cannot appear
  // in a collapsed cell unless the source contains NUL, and if it does the
  // rectangularity check still catches the mismatch.
  return parts.join('\u0000');
}

/** The key TYPOS uses, reproduced here only so the receipt can compare coverages. */
export function cellSignatureLengthSensitive(line: string): string {
  const cells = line.match(/\S+| +/g) ?? [];
  let sig = ''; let words = 0;
  for (const c of cells) {
    if (c[0] === ' ') sig += 's' + c.length + ',';
    else { sig += 'w,'; words++; }
  }
  return words + '|' + sig;
}

function coverageOf(lines: string[], key: (s: string) => string): { shapes: number; largest: number; pct: number } {
  const g = new Map<string, number>();
  let n = 0;
  for (const l of lines) { if (!l.length) continue; n++; const k = key(l); g.set(k, (g.get(k) ?? 0) + 1); }
  let largest = 0;
  for (const v of g.values()) if (v > largest) largest = v;
  return { shapes: g.size, largest, pct: n ? +(100 * largest / n).toFixed(1) : 0 };
}

function detectEol(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function pickSep(used: Set<string>, banned: string[]): string | null {
  for (const c of SEP_CANDIDATES) {
    if (banned.includes(c)) continue;
    let ok = true;
    for (const s of used) if (s.includes(c)) { ok = false; break; }
    if (ok) return c;
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Plan
 * ------------------------------------------------------------------------- */
export function syntaxisPlan(text: string): SyntaxisPlan | null {
  if (!text || text.length > MAX_CHARS) return null;
  const eol = detectEol(text);
  const tail = text.endsWith(eol) ? eol : '';
  const lines = (tail ? text.slice(0, -tail.length) : text).split(eol);

  // G1 — the identity every later step relies on.
  for (let i = 0; i < lines.length; i++) {
    if (cellsOf(lines[i]).join('') !== lines[i]) return null;
  }

  const oldCov = coverageOf(lines, cellSignatureLengthSensitive);
  const newCov = coverageOf(lines, gapSignature);

  // Partition by gap signature. Order of first appearance, so the wire is a
  // function of the text and not of Map iteration luck.
  const order: string[] = [];
  const bySig = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.length || !l.trim()) continue;              // blank lines go literal
    const sig = gapSignature(l);
    if (!bySig.has(sig)) { bySig.set(sig, []); order.push(sig); }
    bySig.get(sig)!.push(i);
  }

  const families: SyntaxisFamily[] = [];
  const mapChars: string[] = new Array(lines.length).fill(LIT);
  let nextIdx = 0;

  for (const sig of order) {
    const idxs = bySig.get(sig)!;
    if (idxs.length < MIN_ROWS) continue;
    if (nextIdx >= IDX.length) break;                  // G6: out of index alphabet
    const rowsCells = idxs.map((i) => cellsOf(lines[i]));

    // A family must be rectangular in CELLS, not just in signature. The class
    // signature collapses runs, so two lines can share a signature and still have
    // different cell counts (`a9` from `a 9` and from `a9`). Check and refuse the
    // family rather than the lane.
    const n = rowsCells[0].length;
    if (!rowsCells.every((c) => c.length === n)) continue;

    const fam: SyntaxisFamily = {
      index: nextIdx, sig, lines: idxs, cells: rowsCells, template: [], slots: [],
      columns: [], cellSep: '', colSep: [], padWidth: new Map(),
    };

    // Constants vs slots, per cell position.
    const slotOfCell: number[] = new Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      const v0 = rowsCells[0][j];
      const constant = rowsCells.every((r) => r[j] === v0);
      if (constant) { fam.template.push(v0); continue; }
      const s = fam.slots.length;
      fam.slots.push(j);
      slotOfCell[j] = s;
      fam.template.push(SLOT_MARK + s);
      fam.columns.push(rowsCells.map((r) => r[j]));
    }
    if (!fam.slots.length) continue;                    // nothing varies: not worth a family

    // Separators: one for the template cell list, one per column. Neither may occur
    // in any cell of this family, nor in the slot marker.
    const allCells = new Set<string>();
    for (const r of rowsCells) for (const c of r) allCells.add(c);
    for (const t of fam.template) allCells.add(t);
    const cellSep = pickSep(allCells, [SLOT_MARK]);
    if (!cellSep) continue;
    fam.cellSep = cellSep;
    for (let s = 0; s < fam.slots.length; s++) {
      const vals = fam.columns[s];
      // A newline is ~0.2 tokens (five of them merge into one o200k token) where a
      // standing separator glyph is 1.0 per value. On git-numstat that difference is
      // 3 columns x 391 separators = ~1170 tokens, which is why the first build of
      // this file LOST 2061 tokens gross on a lane whose shape coverage is 98 %.
      // Newline separation is only legal when no value is itself whitespace-only or
      // empty, because then the value's own line would be indistinguishable.
      const nlSafe = vals.every((v) => v.length > 0 && !/^\s+$/.test(v));
      if (nlSafe) { fam.colSep.push('\n'); continue; }
      const sep = pickSep(new Set(vals), [cellSep, SLOT_MARK, LIT]);
      if (!sep) { fam.cellSep = ''; break; }
      fam.colSep.push(sep);
    }
    if (!fam.cellSep) continue;

    // Derived padding: a whitespace-run slot immediately followed by a non-space cell
    // whose length makes the run exactly `W - len` for one constant W.
    for (let s = 0; s < fam.slots.length; s++) {
      const j = fam.slots[s];
      if (!/^\s+$/.test(fam.columns[s][0])) continue;
      if (j + 1 >= n) continue;
      const nextIsSlot = slotOfCell[j + 1] >= 0;
      if (!nextIsSlot) {
        // next cell is a constant: its length is fixed, so the padding is not derived
        // from a value the reader has; it may still be constant, which is already hoisted
        continue;
      }
      const ns = slotOfCell[j + 1];
      const padCol = fam.columns[s];
      const valCol = fam.columns[ns];
      const W = padCol[0].length + valCol[0].length;
      let fits = true;
      for (let r = 0; r < padCol.length; r++) {
        if (!/^\s+$/.test(padCol[r])) { fits = false; break; }
        if (padCol[r].length !== W - valCol[r].length) { fits = false; break; }
      }
      if (!fits || W <= 0) continue;
      fam.padWidth.set(s, W);
    }

    fam.index = nextIdx++;
    families.push(fam);
    for (const i of idxs) mapChars[i] = IDX[fam.index];
  }

  if (!families.length) return null;

  const literals: string[] = [];
  for (let i = 0; i < lines.length; i++) if (mapChars[i] === LIT) literals.push(lines[i]);

  return {
    crc: syntaxisChecksum(text),
    eol, tail, lineCount: lines.length, map: mapChars.join(''), families, literals,
    classShapes: newCov.shapes, cellShapes: oldCov.shapes,
  };
}

/* ---------------------------------------------------------------------------
 * Render
 * ------------------------------------------------------------------------- */
export function syntaxisRender(plan: SyntaxisPlan): string {
  const out: string[] = [];
  out.push(`§ΣΥΝΤΆΞΙΣ H=${plan.crc} L=${plan.lineCount} F=${plan.families.length} E=${plan.eol === '\r\n' ? 2 : 1} T=${plan.tail ? 1 : 0} lines share shapes; each shape is a family letter. M: one char per line, ${LIT}=that line is under X, else its family. T<f> <sep><cells joined by sep>: the line's cells in order; @n = slot n. W<f> n:W,... : slot n is not sent, it is spaces of length W minus the next cell's length. C<f>.n<sep><that slot's values down the family, joined by sep>. X: the ${LIT} lines, in order. Rebuild a line: put its cells together with nothing between, padding slots recomputed from W, then read line i of the source as row i of its family. H is the CRC-32 of the rebuilt text in hex, checked on decode.`);
  out.push('M' + plan.map);
  for (const f of plan.families) {
    out.push(`T${IDX[f.index]} ${f.cellSep}${f.template.join(f.cellSep)}`);
    if (f.padWidth.size) {
      out.push(`W${IDX[f.index]} ` + [...f.padWidth.entries()].map(([s, W]) => `${s}:${W}`).join(','));
    }
    const rows = f.lines.length;
    f.slots.forEach((_j, s) => {
      if (f.padWidth.has(s)) return;                    // derived, not transmitted
      const sep = f.colSep[s];
      if (sep === '\n') {
        // `C<f>.<s>x<rows>` then one value per line. The row count is declared so the
        // reader never has to guess where the block ends, and checked at decode (G2).
        out.push(`C${IDX[f.index]}.${s}x${rows}`);
        for (const v of f.columns[s]) out.push(v);
      } else {
        out.push(`C${IDX[f.index]}.${s}:${sep}${f.columns[s].join(sep)}`);
      }
    });
  }
  if (plan.literals.length) {
    out.push('X');
    for (const l of plan.literals) out.push(l);
  }
  return out.join('\n') + plan.tail;
}

/* ---------------------------------------------------------------------------
 * Decode — reads only the message. Refuses rather than guessing.
 * ------------------------------------------------------------------------- */
export function syntaxisDecode(message: string): string {
  if (typeof message !== 'string') throw new SyntaxisRefused('G5', 'message is not a string');
  // The wire's own line joiner is ALWAYS '\n'; the SOURCE's joiner is declared, because
  // a CRLF file's wire contains no CRLF and detecting it from the message would silently
  // rebuild every line with the wrong ending. The declared tail is stripped from the raw
  // message BEFORE splitting, so no '\r' can survive into a wire field.
  if (!message.startsWith('§ΣΥΝΤΆΞΙΣ')) {
    throw new SyntaxisRefused('G5', 'message does not open with the ΣΥΝΤΆΞΙΣ contract');
  }
  const head0 = message.slice(0, message.indexOf('\n') < 0 ? message.length : message.indexOf('\n'));
  const mT0 = / T=([01]) /.exec(head0);
  const mE0 = / E=([12]) /.exec(head0);
  const tail0 = mT0 && mE0 ? (mT0[1] === '1' ? (mE0[1] === '2' ? '\r\n' : '\n') : '') : '';
  const stripped = tail0 && message.endsWith(tail0) ? message.slice(0, -tail0.length) : message;
  const lines = stripped.split('\n');
  if (!lines.length || !lines[0].startsWith('§ΣΥΝΤΆΞΙΣ')) {
    throw new SyntaxisRefused('G5', 'message does not open with the ΣΥΝΤΆΞΙΣ contract');
  }
  const mL = /L=(\d+)/.exec(lines[0]);
  if (!mL) throw new SyntaxisRefused('G5', 'contract carries no L=');
  const lineCount = Number(mL[1]);
  if (!Number.isFinite(lineCount) || lineCount < 0) throw new SyntaxisRefused('G5', 'L= is not a number');
  const mE = / E=([12]) /.exec(lines[0]);
  if (!mE) throw new SyntaxisRefused('G5', 'contract carries no E=');
  const eol = mE[1] === '2' ? '\r\n' : '\n';
  const mT = / T=([01]) /.exec(lines[0]);
  if (!mT) throw new SyntaxisRefused('G5', 'contract carries no T=');
  const tail = mT[1] === '1' ? eol : '';

  if (!lines[1] || lines[1][0] !== 'M') throw new SyntaxisRefused('G5', 'second line is not the map');
  const map = lines[1].slice(1);
  if (map.length !== lineCount) throw new SyntaxisRefused('G6', `map has ${map.length} chars, contract says ${lineCount} lines`);

  interface Fam { cellSep: string; template: string[]; pad: Map<number, number>; cols: Map<number, { sep: string; vals: string[] }> }
  const fams = new Map<string, Fam>();
  let litAt = -1;
  for (let i = 2; i < lines.length; i++) {
    const l = lines[i];
    if (l === 'X') { litAt = i + 1; break; }
    if (l[0] === 'T') {
      const idx = l[1];
      const rest = l.slice(2);
      if (!rest.startsWith(' ')) throw new SyntaxisRefused('G5', `T${idx} has no separator field`);
      const cellSep = rest[1];
      const template = rest.slice(2).split(cellSep);
      fams.set(idx, { cellSep, template, pad: new Map(), cols: new Map() });
    } else if (l[0] === 'W') {
      const f = fams.get(l[1]);
      if (!f) throw new SyntaxisRefused('G5', `W${l[1]} names an undeclared family`);
      // `W<idx> n:W,n:W` — the specs start at index 3, not 2. An earlier build read
      // index 2, got the space, and silently dropped EVERY derived-padding spec, which
      // made the padded slot look like a transmitted one and refused three lanes at G5.
      for (const part of l.slice(3).split(',')) {
        if (!part) continue;
        const [a, b] = part.split(':');
        const s = Number(a), W = Number(b);
        if (!Number.isFinite(s) || !Number.isFinite(W)) throw new SyntaxisRefused('G4', `W spec ${part} is not numeric`);
        f.pad.set(s, W);
      }
    } else if (l[0] === 'C') {
      const mx = /^C([a-z0-9])\.(\d+)x(\d+)$/.exec(l);
      if (mx) {
        const f = fams.get(mx[1]);
        if (!f) throw new SyntaxisRefused('G5', `C${mx[1]} names an undeclared family`);
        const n = Number(mx[3]);
        if (!Number.isFinite(n) || n < 0) throw new SyntaxisRefused('G2', `C${mx[1]}.${mx[2]} declares ${mx[3]} rows`);
        const vals = lines.slice(i + 1, i + 1 + n);
        if (vals.length !== n) throw new SyntaxisRefused('G2', `C${mx[1]}.${mx[2]} wants ${n} value lines, ${vals.length} remain`);
        f.cols.set(Number(mx[2]), { sep: '\n', vals });
        i += n;
        continue;
      }
      const m = /^C([a-z0-9])\.(\d+):([\s\S]*)$/.exec(l);
      if (!m) throw new SyntaxisRefused('G5', `column line does not parse: ${l.slice(0, 40)}`);
      const f = fams.get(m[1]);
      if (!f) throw new SyntaxisRefused('G5', `C${m[1]} names an undeclared family`);
      const sep = m[3][0] ?? '';
      const body = m[3].slice(1);
      f.cols.set(Number(m[2]), { sep, vals: body.length ? body.split(sep) : [''] });
    } else if (l.length) {
      throw new SyntaxisRefused('G5', `unrecognised wire line: ${l.slice(0, 40)}`);
    }
  }

  const literals = litAt >= 0 ? lines.slice(litAt) : [];
  let litPtr = 0;
  const cursor = new Map<string, number>();
  const out: string[] = [];

  for (let i = 0; i < lineCount; i++) {
    const c = map[i];
    if (c === LIT) {
      if (litPtr >= literals.length) throw new SyntaxisRefused('G2', 'map asks for a literal line that is not there');
      out.push(literals[litPtr++]);
      continue;
    }
    const f = fams.get(c);
    if (!f) throw new SyntaxisRefused('G6', `map char ${JSON.stringify(c)} names an undeclared family`);
    const r = cursor.get(c) ?? 0;
    cursor.set(c, r + 1);
    // One pass: a template cell is either a literal, a slot with a transmitted column,
    // or a slot whose whitespace run is DERIVED from the width W and the cell that
    // follows it. G4 fitted W exactly at encode time, so the recomputation is exact.
    const rebuilt: string[] = [];
    for (let p = 0; p < f.template.length; p++) {
      const t = f.template[p];
      const m = /^@(\d+)$/.exec(t);
      if (!m) { rebuilt.push(t); continue; }
      const s = Number(m[1]);
      if (f.pad.has(s)) {
        const W = f.pad.get(s)!;
        const nt = f.template[p + 1];
        if (nt === undefined) throw new SyntaxisRefused('G4', 'padded slot is last in the template');
        let nextVal: string;
        const nm = /^@(\d+)$/.exec(nt);
        if (nm) {
          const col = f.cols.get(Number(nm[1]));
          if (!col) throw new SyntaxisRefused('G4', 'padded slot is not followed by a value slot');
          if (r >= col.vals.length) throw new SyntaxisRefused('G2', 'padded value ran out');
          nextVal = col.vals[r];
        } else {
          nextVal = nt;
        }
        const k = W - nextVal.length;
        if (k < 0) throw new SyntaxisRefused('G4', `width ${W} is shorter than the value ${JSON.stringify(nextVal)}`);
        rebuilt.push(' '.repeat(k));
        continue;
      }
      const col = f.cols.get(s);
      if (!col) throw new SyntaxisRefused('G5', `slot ${s} has no column`);
      if (r >= col.vals.length) throw new SyntaxisRefused('G2', `slot ${s} ran out of values at row ${r}`);
      rebuilt.push(col.vals[r]);
    }
    out.push(rebuilt.join(''));
  }
  if (litPtr !== literals.length) throw new SyntaxisRefused('G2', `${literals.length - litPtr} literal lines were never used`);
  const text = out.join(eol) + tail;
  // G9 — integrity. Every structural gate above can pass on a wire whose PAYLOAD was
  // edited, because an edited value is still a well-formed value. This is the gate that
  // makes a corrupted wire refuse instead of decoding to a confident, wrong document.
  const mH = / H=([0-9a-f]{8}) /.exec(lines[0]);
  if (!mH) throw new SyntaxisRefused('G9', 'contract carries no H= checksum');
  if (syntaxisChecksum(text) !== mH[1]) {
    throw new SyntaxisRefused('G9', `checksum mismatch: wire declares ${mH[1]}, rebuilt text gives ${syntaxisChecksum(text)}`);
  }
  return text;
}

/* ---------------------------------------------------------------------------
 * Encode
 * ------------------------------------------------------------------------- */
export function syntaxisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierTokens: number | null = null,
): SyntaxisResult {
  const t0 = Date.now();
  const refuse = (gate: string, notes: string): SyntaxisResult => ({
    message: text, decoded: text, messageTokens: countTokens(text, enc), exact: true, applied: false,
    frontierTokens, families: 0, foldedLines: 0, literalLines: 0, slots: 0, constants: 0,
    derivedPadding: 0, oldCoveragePct: 0, newCoveragePct: 0, ms: Date.now() - t0,
    notes: `refused ${gate}: ${notes}`,
  });

  if (typeof text !== 'string' || !text.length) return refuse('G8', 'empty input');
  if (text.length > MAX_CHARS) return refuse('G8', `${text.length} chars exceeds MAX_CHARS`);

  const eol = detectEol(text);
  const tail = text.endsWith(eol) ? eol : '';
  const lines = (tail ? text.slice(0, -tail.length) : text).split(eol);
  const oldCov = coverageOf(lines, cellSignatureLengthSensitive);
  const newCov = coverageOf(lines, gapSignature);

  let plan: SyntaxisPlan | null = null;
  try { plan = syntaxisPlan(text); } catch { plan = null; }
  if (!plan) {
    return { ...refuse('G1', 'no family reached MIN_ROWS, or the cell partition is not an identity'),
      oldCoveragePct: oldCov.pct, newCoveragePct: newCov.pct };
  }

  let message = '';
  try { message = syntaxisRender(plan); } catch (e) { return refuse('G5', `render threw: ${(e as Error).message}`); }

  // G5 — byte-exact round trip through the public decoder, before anything is counted.
  let back = '';
  try { back = syntaxisDecode(message); } catch (e) {
    return { ...refuse('G5', `decode refused: ${(e as Error).message}`),
      oldCoveragePct: oldCov.pct, newCoveragePct: newCov.pct };
  }
  if (back !== text) {
    return { ...refuse('G5', 'round trip is not byte-exact'),
      oldCoveragePct: oldCov.pct, newCoveragePct: newCov.pct };
  }

  const messageTokens = countTokens(message, enc);

  // G7 — strict win, when the caller supplied a frontier cost.
  if (frontierTokens !== null && !(messageTokens < frontierTokens)) {
    return { ...refuse('G7', `${messageTokens} tokens is not strictly below the frontier's ${frontierTokens}`),
      families: plan.families.length, foldedLines: plan.lineCount - plan.literals.length,
      literalLines: plan.literals.length,
      slots: plan.families.reduce((a, f) => a + f.slots.length, 0),
      constants: plan.families.reduce((a, f) => a + f.template.filter((t) => !t.startsWith(SLOT_MARK)).length, 0),
      derivedPadding: plan.families.reduce((a, f) => a + f.padWidth.size, 0),
      oldCoveragePct: oldCov.pct, newCoveragePct: newCov.pct };
  }

  const folded = plan.lineCount - plan.literals.length;
  return {
    message, decoded: text, messageTokens, exact: true, applied: true, frontierTokens,
    families: plan.families.length, foldedLines: folded, literalLines: plan.literals.length,
    slots: plan.families.reduce((a, f) => a + f.slots.length, 0),
    constants: plan.families.reduce((a, f) => a + f.template.filter((t) => !t.startsWith(SLOT_MARK)).length, 0),
    derivedPadding: plan.families.reduce((a, f) => a + f.padWidth.size, 0),
    oldCoveragePct: oldCov.pct, newCoveragePct: newCov.pct,
    ms: Date.now() - t0,
    notes: `${plan.families.length} families fold ${folded}/${plan.lineCount} lines; ` +
      `${plan.families.reduce((a, f) => a + f.slots.length, 0)} slots, ` +
      `${plan.families.reduce((a, f) => a + f.padWidth.size, 0)} derived-padding columns dropped; ` +
      `shape coverage ${oldCov.pct}% (length-sensitive key) -> ${newCov.pct}% (class key); ` +
      `${oldCov.shapes} -> ${newCov.shapes} shapes; message ${messageTokens} tok`,
  };
}
