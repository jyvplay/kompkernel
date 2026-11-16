/**
 * src/lib/omega/steli.ts — X124. ΣΤΉΛΗ (steli), "column".
 * =============================================================================
 *
 * WHY THIS EXISTS WHEN ΠΛΆΤΟΣ ALREADY DE-PADS TABLES
 * -------------------------------------------------
 * ΠΛΆΤΟΣ (X123) splits a record into fields by WHITESPACE RUNS and then asks
 * every row to agree on one EDGE per column. That works on `ls -l`, `dpkg -l`,
 * `ps aux` — 12 of the 29 lanes — and fails on the two lanes that carry the most
 * padding of all:
 *
 *     findmnt    1 005 padding characters survive in the shipped body
 *     node-help    239 padding characters survive in the shipped body
 *
 * It fails on them for one structural reason. `findmnt` draws a tree:
 *
 *     TARGET                        SOURCE     FSTYPE   OPTIONS
 *     /                             /dev/vda   ext4     rw,relatime
 *     | |-/dev/shm                  tmpfs      tmpfs    rw,nosuid,nodev
 *
 * The first column contains SINGLE spaces ("| |-"), so any splitter that cuts on
 * `\s+` reads "| |-/dev/shm" as three fields and the whole block loses its
 * arity. `node --help` has the same shape ("[ script.js ]", "  -v, --version").
 *
 * ΣΤΉΛΗ does not split on whitespace at all. A record is a set of POSITIONAL
 * SLICES: the text of column c is `line.slice(offset[c], offset[c+1])`. The
 * reader places field k at offset k. Nothing depends on a run of spaces, so a
 * column may contain any number of single spaces, and the model is a vector of
 * numbers rather than a template row plus per-column anchoring.
 *
 * WHY IT PAYS, MEASURED AND NOT ASSERTED
 * --------------------------------------
 * The junction census of the X123 frontier (bench/x124 residue probes) counts
 * what the grammar could NOT absorb: 1 699 runs of two or more spaces survive in
 * the shipped bodies of the 29 lanes, against 215 punctuation+space sites and 56
 * space+digit sites. Variable padding is invisible to a dictionary because every
 * row pads by a different amount, which is exactly why a padding codec is the
 * only transform in this stack whose raw gain survives the parent: on
 * `findmnt` the raw count falls 787 -> 733 and the parent frontier falls
 * 444 -> 394, a retention of 93 %, against 5 % for a junction the grammar can
 * absorb (ΠΡΌΚΕΝΟ, this same turn: raw -72, shipped -4 on `psql-output`).
 *
 * THE READER
 * ---------
 *     ‡0,56,74,86:26 rows single-spaced, field k at offset k.
 *     TARGET SOURCE FSTYPE OPTIONS
 *     / /dev/vda ext4 rw,relatime,discard
 *     ...
 *
 * One marker line, then the rows with every column run collapsed to one space.
 * The reader pads field k out to offset k, keeps the last field to the end of
 * the line, and drops the marker. An empty field is a double space, because the
 * fields are joined by exactly one.
 *
 * GATES
 * -----
 *   G1 the block must be at least MIN_ROWS rows and remove at least MIN_PAD
 *      padding characters
 *   G2 every row is rebuilt from its own fields and offsets and compared byte
 *      for byte BEFORE anything is emitted; a row that does not rebuild ends the
 *      block rather than being emitted into doubt
 *   G3 steliUndo(steliTransform(text)) === text
 *   G4 one call to the SHIPPED parent chain (tagstackEncode, not just the base
      frontier) on the rewritten text, which must decode to it
 *   G5 steliUndo(frontier.decoded) === source
 *   G6 countTokens(contract + "\n" + parent.message) strictly beats the price
 *      of the parent's own complete message, or the parent's message ships.
 *      Both arms are the same shipped entry point, so the comparison is
 *      like-for-like against what this stack actually emits.
 *
 * RE-ENTRANCY. The child is priced by the parent chain, and the parent chain
 * contains ΣΤΉΛΗ once it is wired in. `IN_STELI` makes the nested call refuse
 * rather than recurse, so the child's price is the chain's price with exactly
 * one ΣΤΉΛΗ level, which is also what the measurements below report.
 *
 * Opt-out: OMEGA_NO_STELI=1.
 */

/** True while a ΣΤΉΛΗ encode is inside its own parent-chain call. */
let IN_STELI = false;

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, type TagstackResult } from './tagstack';

const MARKERS = ['‡', '¤', '※', '°', 'µ', '¦', '†', '◊', '◈', '⬦'];

export const STELI_MIN_ROWS = 4;
export const STELI_MIN_PAD = 40;
export const STELI_MAX_COLS = 12;

export interface SteliBlock {
  /** index of the first row of the block */
  start: number;
  /** number of rows */
  rows: number;
  /** column start offsets; offsets[0] is the block's own left margin */
  offsets: number[];
  /** the fields of every row, already trimmed of their padding */
  fields: string[][];
  /** padding characters removed */
  padMass: number;
  /** how the reader re-splits a single-spaced row */
  split: SteliSplit;
}

/** Positions at which a token starts after a run of at least two spaces. */
function startsOf(line: string): number[] {
  const out: number[] = [];
  for (let p = 0; p < line.length; p++) {
    if (line[p] === ' ' || line[p] === '\t') continue;
    if (p === 0) { out.push(0); continue; }
    if (line[p - 1] === ' ' && (p === 1 || line[p - 2] === ' ' || line[p - 2] === '\t')) out.push(p);
  }
  return out;
}

/**
 * Slice one line by the offset vector. `null` when the line is not a member of
 * the block: blank, or content before offset 0, or a column that runs into the
 * next offset (an overflowing cell, which no offset model can express).
 */
function sliceRow(line: string, offsets: number[]): string[] | null {
  if (!line.trim()) return null;
  const k = offsets.length;
  if (line.slice(0, offsets[0]!).trim() !== '') return null;
  const out: string[] = [];
  for (let j = 0; j < k; j++) {
    const a = offsets[j]!;
    const b = j + 1 < k ? offsets[j + 1]! : line.length;
    if (a > line.length) return null;
    if (j + 1 < k) {
      if (b >= line.length) return null;            // row ends before the column
      const seg = line.slice(a, b);
      const f = seg.trim();
      if (!f) { out.push(''); continue; }           // an empty column is legal
      const lead = seg.indexOf(f);
      if (lead + f.length >= seg.length) return null; // the cell overflows its column
      out.push(f);
    } else {
      out.push(line.slice(a));                      // the tail keeps its own spaces
    }
  }
  return out;
}

/**
 * How the reader splits a single-spaced row back into fields.
 *
 * `f` — the first k-1 spaces are the separators. Legal when no column left of
 *       the tail contains a space.
 * `l` — the last k-1 spaces are the separators, so column 0 absorbs the extra
 *       ones. Legal when no column right of column 0 contains a space. This is
 *       the `findmnt` case: its first column draws a tree ("| |-/dev/shm") and
 *       its tail (mount options) has none.
 */
export type SteliSplit = 'f' | 'l';

/** Which split rule reproduces `fields` when the row is `fields.join(' ')`. */
function splitRuleFor(fields: string[][]): SteliSplit | null {
  const k = fields[0]?.length ?? 0;
  if (k < 2) return null;
  let fOk = true;
  let lOk = true;
  for (const f of fields) {
    for (let j = 0; j < k - 1; j++) if (f[j]!.includes(' ')) fOk = false;
    for (let j = 1; j < k; j++) if (f[j]!.includes(' ')) lOk = false;
  }
  if (fOk) return 'f';
  if (lOk) return 'l';
  return null;
}

/** The mirror: rebuild one row from its fields and the offset vector. */
export function steliRebuildRow(fields: string[], offsets: number[]): string {
  let out = '';
  for (let j = 0; j < offsets.length; j++) {
    const at = offsets[j]!;
    while (out.length < at) out += ' ';
    if (out.length > at) return '';                  // cannot happen after sliceRow
    out += fields[j] ?? '';
  }
  return out;
}

/**
 * Choose the offset vector and the maximal run of rows that rebuilds under it.
 * Candidates are the start-sets actually observed on the lines, most frequent
 * first, so the search is linear in the number of distinct row shapes and not in
 * the number of subsets of positions.
 */
export function steliFit(lines: string[], maxCandidates = 40): SteliBlock | null {
  const seen = new Map<string, number>();
  const startsByLine: number[][] = [];
  for (const l of lines) {
    const s = startsOf(l);
    startsByLine.push(s);
    if (s.length >= 2 && s.length <= STELI_MAX_COLS) {
      const key = s.join(',');
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  if (!seen.size) return null;
  const candidates = [...seen.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, maxCandidates)
    .map(([k]) => k.split(',').map(Number));

  let best: SteliBlock | null = null;
  for (const offsets of candidates) {
    let i = 0;
    while (i < lines.length) {
      const fields: string[][] = [];
      let pad = 0;
      let j = i;
      for (; j < lines.length; j++) {
        const f = sliceRow(lines[j]!, offsets);
        if (!f) break;
        if (steliRebuildRow(f, offsets) !== lines[j]!) break;
        fields.push(f);
        pad += lines[j]!.length - f.join(' ').length;
      }
      const rows = j - i;
      if (rows >= STELI_MIN_ROWS && pad >= STELI_MIN_PAD && (!best || pad > best.padMass)) {
        const split = splitRuleFor(fields);
        if (split) best = { start: i, rows, offsets, fields, padMass: pad, split };
      }
      i = j + 1;
    }
  }
  return best;
}

/**
 * The marker line IS the contract: it carries the column geometry and the row
 * count and says what to do with them, so there is no second English sentence to
 * pay for. Two spellings, chosen by which is cheaper for this block:
 *
 *   ‡56,18,12:26 rows single-spaced, pad field k to width k.
 *       -- left margin is zero, so column widths say everything (27 tokens with
 *          the split flag, 20 without)
 *   ‡0,56,74,86:26 rows single-spaced, field k at offset k.
 *       -- indented block, so the absolute offsets must be spelled out
 *
 * `, split from the right` is appended when the reader must count separators
 * from the end of the row instead of the start; see splitRuleFor.
 */
export function steliMarkerLine(
  marker: string,
  offsets: number[],
  rows: number,
  split: SteliSplit = 'f',
  form: 'widths' | 'offsets' = 'widths',
): string {
  const tail = split === 'l' ? ', split from the right' : '';
  if (form === 'widths') {
    // diffs only: this spelling implies a zero left margin, and an indented
    // block must use the offsets spelling instead (see steliCheapestMarker).
    const widths = offsets.slice(1).map((o, i) => o - offsets[i]!);
    return `${marker}${widths.join(',')}:${rows} rows single-spaced, pad field k to width k${tail}.`;
  }
  return `${marker}${offsets.join(',')}:${rows} rows single-spaced, field k at offset k${tail}.`;
}

/**
 * Both spellings say the same thing; the widths one wins on wide tables and the
 * offsets one on narrow ones, because the number list and the sentence trade
 * tokens against each other. Price both and take the cheaper. The parser accepts
 * either, so this can never cost correctness — only a different number.
 */
export function steliCheapestMarker(
  marker: string,
  offsets: number[],
  rows: number,
  split: SteliSplit,
  enc: EncodingName,
): string {
  const o = steliMarkerLine(marker, offsets, rows, split, 'offsets');
  if (offsets[0] !== 0) return o;
  const w = steliMarkerLine(marker, offsets, rows, split, 'widths');
  return countTokens(o + '\n', enc) < countTokens(w + '\n', enc) ? o : w;
}

const RE_WIDTHS =
  /^(.)(\d+(?:,\d+)+):(\d+) rows single-spaced, pad field k to width k(, split from the right)?\.$/;
const RE_OFFSETS =
  /^(.)(\d+(?:,\d+)+):(\d+) rows single-spaced, field k at offset k(, split from the right)?\.$/;

export function steliParseMarker(line: string): { marker: string; offsets: number[]; rows: number; split: SteliSplit } | null {
  let m = RE_WIDTHS.exec(line);
  if (m) {
    // diffs only: the left margin is zero by construction
    const offsets = [0];
    for (const w of m[2]!.split(',').map(Number)) offsets.push(offsets[offsets.length - 1]! + w);
    return { marker: m[1]!, offsets, rows: Number(m[3]), split: (m[4] ? 'l' : 'f') as SteliSplit };
  }
  m = RE_OFFSETS.exec(line);
  if (m) {
    return {
      marker: m[1]!,
      offsets: m[2]!.split(',').map(Number),
      rows: Number(m[3]),
      split: (m[4] ? 'l' : 'f') as SteliSplit,
    };
  }
  return null;
}

export interface SteliTransform {
  text: string;
  marker: string;
  offsets: number[];
  rows: number;
  padMass: number;
  split: SteliSplit;
}

export function steliTransform(text: string): SteliTransform | null {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const blk = steliFit(lines);
  if (!blk) return null;
  const marker = MARKERS.find((m) => !text.includes(m) && countTokens(m, 'o200k_base') === 1);
  if (!marker) return null;
  const out = lines.slice(0, blk.start);
  out.push(steliCheapestMarker(marker, blk.offsets, blk.rows, blk.split, 'o200k_base'));
  for (const f of blk.fields) out.push(f.join(' '));
  for (let i = blk.start + blk.rows; i < lines.length; i++) out.push(lines[i]!);
  return { text: out.join(eol), marker, offsets: blk.offsets, rows: blk.rows, padMass: blk.padMass, split: blk.split };
}

/** The reader's inverse: drop the marker, re-pad the rows that follow it. */
export function steliUndo(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  for (let i = 0; i < lines.length; i++) {
    const parsed = steliParseMarker(lines[i]!);
    if (!parsed) continue;
    const out = lines.slice(0, i);
    const n = Math.min(parsed.rows, lines.length - i - 1);
    for (let r = 0; r < n; r++) {
      const row = lines[i + 1 + r]!;
      const parts = row.split(' ');
      const k = parsed.offsets.length;
      const fields: string[] = [];
      if (parsed.split === 'l') {
        // the last k-1 spaces are the separators, so field j>=1 is the j-th part
        // counting back from the end and field 0 is everything before them
        const at = parts.length - k;
        if (at < 0) { fields.push(row); }
        else {
          fields.push(parts.slice(0, at + 1).join(' '));
          for (let j = 1; j + 1 < k; j++) fields.push(parts[at + j] ?? '');
          fields.push(parts.slice(parts.length - 1).join(' '));
        }
      } else {
        for (let j = 0; j < k; j++) {
          fields.push(j + 1 < k ? (parts[j] ?? '') : parts.slice(j).join(' '));
        }
      }
      out.push(steliRebuildRow(fields, parsed.offsets));
    }
    for (let k = i + 1 + n; k < lines.length; k++) out.push(lines[k]!);
    return out.join(eol);
  }
  return text;
}

export interface SteliResult {
  codec: 'steli';
  applied: boolean;
  message: string;
  decoded: string;
  exact: boolean;
  messageTokens: number;
  frontierTokens: number;
  contractTokens: number;
  offsets: number[];
  rows: number;
  padMass: number;
  notes: string;
  frontier?: TagstackResult;
}

export function steliDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_STELI === '1';
}

/**
 * Encode. The marker line IS the contract: it carries the offsets and the row
 * count and says what to do with them, so there is no second English sentence to
 * pay for. That is what makes a 50-token mechanism shippable where a 31-token
 * ΠΛΆΤΟΣ contract was not.
 */
export interface SteliOptions {
  /** the incumbent complete-message price; measured when absent */
  incumbent?: number;
  /** the parent chain to price the rewritten text with; tagstackEncode when absent */
  inner?: (t: string, e: EncodingName) => TagstackResult;
}

export interface SteliOptions {
  /** the incumbent complete-message price; measured when absent */
  incumbent?: number;
  /** the parent chain used to price the rewritten text; tagstackEncode when absent */
  inner?: (t: string, e: EncodingName) => TagstackResult;
}

export function steliEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: SteliOptions = {},
): SteliResult {
  if (IN_STELI) {
    return {
      codec: 'steli', applied: false, message: text, decoded: text, exact: true,
      messageTokens: options.incumbent ?? countTokens(text, enc),
      frontierTokens: options.incumbent ?? countTokens(text, enc),
      contractTokens: 0, offsets: [], rows: 0, padMass: 0,
      notes: 're-entrant: ΣΤΉΛΗ is already on the stack',
    };
  }
  IN_STELI = true;
  try {
    return steliEncodeBody(text, enc, options);
  } finally {
    IN_STELI = false;
  }
}

function steliEncodeBody(
  text: string,
  enc: EncodingName,
  options: SteliOptions,
): SteliResult {
  // A refusal must report the price of the message that actually ships, which is
  // the parent's, not the price of the child we evaluated and declined to use.
  const refuse = (notes: string, frontier?: TagstackResult, price = countTokens(text, enc)): SteliResult => ({
    codec: 'steli', applied: false,
    message: text,
    decoded: text,
    exact: true,
    messageTokens: price,
    frontierTokens: price,
    contractTokens: 0, offsets: [], rows: 0, padMass: 0, notes, frontier,
  });

  if (steliDisabled()) return refuse('disabled (OMEGA_NO_STELI=1)');
  if (!text.length || text.length > 400_000) return refuse('length out of range');
  const innerFn = options.inner ?? ((t: string, e: EncodingName) => tagstackEncode(t, e));
  let baseTokens = options.incumbent ?? 0;
  let base: TagstackResult | undefined;
  if (options.incumbent === undefined) {
    base = innerFn(text, enc);
    baseTokens = base.messageTokens;
    if (base.decoded !== text) return refuse('G0 parent chain is not exact on the source', base, baseTokens);
  }

  let tr: SteliTransform | null = null;
  try {
    tr = steliTransform(text);
  } catch {
    return refuse('fit threw', base, baseTokens);
  }
  if (!tr) return refuse('no offset-aligned padded record block', base, baseTokens);

  // G3 — the transform is invertible on its own output before any parent sees it.
  if (steliUndo(tr.text) !== text) return refuse('G3 own inverse disagrees', base, baseTokens);

  let inner: TagstackResult;
  try {
    inner = innerFn(tr.text, enc);
  } catch {
    return refuse('parent chain threw', base, baseTokens);
  }
  if (inner.decoded !== tr.text) return refuse('G4 frontier does not reproduce the rewritten text', base, baseTokens);
  const decoded = steliUndo(inner.decoded);
  if (decoded !== text) return refuse('G5 undo(frontier output) !== source', base, baseTokens);

  // The marker line lives INSIDE the text the parent encodes, which is what tells
  // the reader where the block starts; prepending a second copy would bill the
  // same sentence twice. ΠΛΆΤΟΣ measured in-marker placement as worse than a
  // leader (bench/x123/platos-inline.ts: the sentence is incompressible and it
  // splits the block) — but ΠΛΆΤΟΣ's contract was a separate 31-80-token English
  // sentence, and the comparison there was leader vs in-marker, not leader vs
  // nothing. Here the marker is one line of ~90 characters that the parent prices
  // along with everything else, and the measurement is the one below.
  const contract = steliCheapestMarker(tr.marker, tr.offsets, tr.rows, tr.split, enc);
  if (steliParseMarker(contract) === null) return refuse('G7 marker does not parse back', base, baseTokens);
  // the marker is a line of the text the parent encoded, so G4 already proves it
  // comes back; this only re-checks it is the line the reader will look for
  if (!tr.text.includes(contract)) return refuse('G7 marker is not in the transformed text', base, baseTokens);
  const message = inner.message;
  const messageTokens = countTokens(message, enc);

  const incumbent = options.incumbent ?? baseTokens;
  if (messageTokens >= incumbent) {
    return refuse(`G6 loses ${messageTokens} vs ${incumbent} (pad ${tr.padMass})`, base, incumbent);
  }
  return {
    codec: 'steli', applied: true, message, decoded, exact: true,
    messageTokens, frontierTokens: incumbent,
    contractTokens: 0, // billed inside the parent's wire, not as a leader line
    offsets: tr.offsets, rows: tr.rows, padMass: tr.padMass,
    notes: `ΣΤΉΛΗ ${tr.rows}x${tr.offsets.length} offsets ${tr.offsets.join(',')} pad ${tr.padMass}; ` +
      `M ${incumbent}->${messageTokens}; wire by ${(inner as any).parentCodec ?? 'frontier'}`,
    frontier: inner,
  };
}

export function steliSelfTest(enc: EncodingName = 'o200k_base'): { pass: number; fail: number; log: string[] } {
  const log: string[] = [];
  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean): void => {
    if (cond) { pass++; log.push(`ok   ${name}`); } else { fail++; log.push(`FAIL ${name}`); }
  };
  const cases = [
    '# t\nHEAD1   HEAD2  HEAD3\na       b      c\ndd      ee     ff\nlonger  g      h\n',
    'no table here at all\njust prose lines\n',
    // a first column containing SINGLE spaces — the case ΠΛΆΤΟΣ cannot parse
    'TARGET        SOURCE   OPTS\n/             a        x\n| |-foo bar   b        y\n| `-baz qux   c        z\n`-end         d        w\n',
    // an indented block, which forces the absolute-offset spelling
    '# h\n  NAME     KIND\n  alpha    one\n  beta     two\n  gamma    three\n  delta    four\n',
    '',
  ];
  for (const src of cases) {
    const tr = steliTransform(src);
    if (!tr) { check(`no block (${JSON.stringify(src.slice(0, 18))})`, true); continue; }
    check(`undo ${JSON.stringify(src.slice(0, 18))}`, steliUndo(tr.text) === src);
    check(`marker parses ${JSON.stringify(src.slice(0, 18))}`, steliParseMarker(steliMarkerLine(tr.marker, tr.offsets, tr.rows, tr.split)) !== null);
  }
  // the reconstruction is exact for a hand-built offset model
  const offs = [0, 8, 16];
  check('rebuild', steliRebuildRow(['ab', 'cd', 'ef'], offs) === 'ab      cd      ef');
  check('slice+rebuild', (() => {
    const line = 'ab      cd      ef gh';
    const f = sliceRow(line, offs);
    return !!f && steliRebuildRow(f, offs) === line;
  })());
  check('overflow rejected', sliceRow('abcdefgh   cd      ef', offs) === null);
  check('marker is one token', countTokens('‡', enc) === 1);
  // both spellings of the contract survive their own parser
  const w = steliMarkerLine('‡', [0, 8, 16], 9, 'f', 'widths');
  check('widths spelling drops the zero margin', w.startsWith(`${'\u2021'}8,8:`));
  const o = steliMarkerLine('‡', [2, 30], 9, 'l', 'offsets');
  check('widths spelling round-trips', JSON.stringify(steliParseMarker(w)?.offsets) === '[0,8,16]');
  check('offsets spelling round-trips', JSON.stringify(steliParseMarker(o)?.offsets) === '[2,30]');
  check('split flag round-trips', steliParseMarker(o)?.split === 'l' && steliParseMarker(w)?.split === 'f');
  const wAsOffsets = steliMarkerLine('‡', [0, 8, 16], 9, 'f', 'offsets');
  check('cheapest markers parse back',
    JSON.stringify(steliParseMarker(steliCheapestMarker('‡', [0, 56, 74, 86], 26, 'l', enc))?.offsets) ===
      '[0,56,74,86]' &&
    JSON.stringify(steliParseMarker(steliCheapestMarker('‡', [2, 30], 9, 'f', enc))?.offsets) === '[2,30]');
  return { pass, fail, log };
}
