/**
 * src/lib/omega/kannabos.ts — ΚΆΝΝΑΒΟΣ (KANNABOS, "grid, ruled canvas") — X42.
 *
 * ============================================================================
 * THE HOLE THIS FILLS, IN THE STACK'S OWN WORDS
 * ============================================================================
 * X39's report says it plainly: for space-aligned tables — `df -h`, `ps aux`,
 * `kubectl get pods`, `docker ps`, `ls -l`, `netstat` — "APOGRAPHE **refuses**
 * (no single-character field separator). The most common shape of CLI output is
 * exactly the shape it cannot parse." X40 repeated it as "the largest
 * unaddressed ops shape". Every structured codec in this stack parses a record
 * set by SPLITTING ON A SEPARATOR CHARACTER, so the whole family is blind to the
 * format every Unix tool actually prints: fixed-width columns padded with runs
 * of spaces.
 *
 * ============================================================================
 * THE MECHANISM: THE GRID IS THE SCHEMA, AND IT IS INFERRED FROM OFFSETS
 * ============================================================================
 * A space-aligned table carries its schema implicitly, in its GEOMETRY: column j
 * starts at character offset 37 on every row, or ends at offset 42 on every row.
 * KANNABOS reads the source as OFFSETS, not fields. For each line it records
 * every maximal non-space run as (value, start, end), then tests each column
 * position for one anchor supported by the rows:
 *
 *      L12   the cell STARTS at character 12 (left-aligned column)
 *      R42   the cell ENDS at character 42 (right-aligned column, i.e. numbers)
 *      T1    the cell is the verbatim rest of the line, 1 space after the previous
 *            cell — this is what keeps `ls -l`'s NAME (which may contain a space)
 *            and every COMMAND field with arguments inside the grid
 *
 * The padding is never transmitted. Given the values and the anchors, the reader
 * rebuilds each line deterministically: a left anchor fixes where a cell begins,
 * a right anchor where it ends, and the previous cell's end fixes how many spaces
 * to write. That is a STRUCTURAL saving the parent cannot copy: the parent pays
 * one mark per space run, once per row, forever. Measured cost of a space run in
 * o200k: 1 token for 20 spaces, 2 for 120 — the run's width is free, but its
 * OCCURRENCE is not.
 *
 * ============================================================================
 * WHY THIS IS NOT X41 TYPOS AGAIN (the mask codec, which measured as a refusal)
 * ============================================================================
 * TYPOS was a re-presentation: it de-interleaved the same values into columns and
 * let the parent compress them, and the parent — which already charges a repeated
 * skeleton once — preferred the original text (it lost by +14…+66 tokens on five
 * of five lanes). KANNABOS transmits strictly LESS:
 *
 *   1. PADDING IS REGENERATED, never sent.
 *   2. A COLUMN IS RUN-LENGTH CODED DOWN THE GRID. A per-occurrence substitution
 *      — what the parent does, and the best it can do on interleaved text — costs
 *      one mark per occurrence. A run costs one value plus one count, however
 *      long the run. On real `ps aux` output the TTY / START / TIME / %CPU / %MEM
 *      columns are constant or near-constant over 42 rows: 42 marks vs one run.
 *   3. A COLUMN THAT IS A GENERATOR COSTS ZERO PER ROW: METRON's `lin` and
 *      `clock` families, imported, applied to a grid instead of a separator.
 *
 * All three are chosen per column by MEASURED token count on the rendered column,
 * never by a formula, and a column that nothing fits is still carried raw — the
 * padding around it is free from then on.
 *
 * ============================================================================
 * WHAT IS HONESTLY NEW, AGAINST THE LITERATURE
 * ============================================================================
 * Fixed-width record framing is old (Hollerith cards, COBOL copybooks, ETL
 * "fixed-width" files) and every one of those systems REQUIRES the copybook: the
 * field positions are declared by a schema writer and reader already share.
 * Columnar stores make the same move in the other direction (Abadi, Madden &
 * Ferreira, SIGMOD 2006, doi:10.1145/1142473.1142548) and also require a schema.
 * What is not in that literature, and is the contribution here:
 *
 *   (i)  FIELD BOUNDARIES ARE INFERRED FROM CHARACTER OFFSETS with no schema, no
 *        separator, no header contract and no sample from the producer;
 *   (ii) the grid, the per-column codecs and the row/literal pattern are emitted
 *        in ONE self-describing text message a reader executes directly, so the
 *        decoder needs nothing but the message (no system prompt, no tool);
 *   (iii) the L/R/T hybrid anchor set, which makes ragged CLI output exactly
 *        representable instead of forcing every COMMAND-with-arguments row out
 *        of the grid — the reason this shape has stayed unaddressed.
 *
 * ============================================================================
 * CONTRACT
 * ============================================================================
 * Byte-exact or refused. `kannabosEncode` transforms, decodes the transform in
 * the same process and requires byte equality BEFORE the parent sees it, then
 * encodes the transform with the parent (OURA) and compares real one-message
 * token counts. Not exact, or not cheaper after the parent re-encode plus the
 * clause ⇒ the codec reports `kannabos: false` and the frontier is unchanged.
 *
 * Time/CPU bound: grid inference is O(lines × candidate cell counts) over
 * offsets — milliseconds. The cost is the gate: exactly one extra parent encode.
 */

import { countTokens, type EncodingName } from './bpe';
import { ouraEncode } from './oura';
import {
  parseNumTemplate, renderNumTemplate, parseClockTemplate, renderClockTemplate,
  apographeDecodeResult, type NumTemplate, type ClockTemplate,
} from './apographe';

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

const OPEN = '\u27e8';   // ⟨
const CLOSE = '\u27e9';  // ⟩
/** Header field delimiters, in preference order; must be absent from the source. */
const DELIMS = ['\u00a6', '\u241f', '\u2016', '\u205e', '\u00b7', '\u2021'];
/** Value separators inside a body line; must be absent from every value. */
const SEPS = ['\u241f', '\u00a6', '\u2016', '\u205e', '\u00b7', '\u00a7', '\u2021', '\u00a4'];
/** Dictionary index alphabet: one character per row. */
const IDX = 'abcdefghijklmnopqrstuvwxyz0123456789';
/**
 * Run marker. `value*count` is only unambiguous when `*` cannot occur inside a
 * value; a real `ps` COMMAND or an `ls` filename can contain one, so the marker
 * is CHOSEN FROM THIS LIST (first candidate absent from the whole source) and
 * declared once in the header. `*` is the default and costs nothing extra.
 */
const RUNMARKS = ['*', '\u00a7', '\u00d7', '\u00b7', '~', '#', '@', '\u2021', '\u00a4'];
let RUNMARK = '*';

export const KANNABOS_MIN_ROWS = 6;
export const KANNABOS_MIN_COLS = 3;
export const KANNABOS_MAX_CHARS = 400_000;
const MAX_LITERAL_FRACTION = 0.45;
const MAX_COL_CANDIDATES = 3;
const MAX_COLS = 24;

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

export interface KannabosCell { v: string; s: number; e: number }

export type KannabosAnchor =
  | { kind: 'L'; at: number }
  | { kind: 'R'; at: number }
  | { kind: 'T'; at: number };

export type KannabosCodec =
  | { kind: 'x' }
  | { kind: 'w'; w: number }
  | { kind: 'r'; runs: Array<{ v: string; n: number }> }
  | { kind: 'd'; dict: string[]; idx: string }
  | { kind: 'l'; t: NumTemplate; v: number; at: number; s: number }
  | { kind: 'k'; t: ClockTemplate; v: number; at: number; s: number }
  | { kind: 't'; lits: string[]; fields: CompoundField[]; sample: string; steps: number[]; mods: number[] };

/** One numeric field of a compound template: `0003` in `a0003`, `2` in `2d0h`. */
export interface CompoundField { v: number; w: number; pad: boolean }

export interface KannabosColumn {
  anchor: KannabosAnchor;
  codec: KannabosCodec;
  body: string | null;
  values: string[];
}

export interface KannabosPlan {
  header: string;
  text: string;
  cols: number;
  rows: number;
  literals: number;
  codecs: string[];
  /** true when some column is a `t:` law with a `s%M` field */
  periodic: boolean;
  /** informational only: the text-alone gain, never the decision */
  proxyGain: number;
}

export interface KannabosResult {
  wire: string;
  contract: string;
  decoded: string;
  exact: boolean;
  messageTokens: number;
  inTokens: number;
  kannabos: boolean;
  kannabosHeader: string;
  kannabosCodecs: string;
  kannabosRows: number;
  kannabosLiterals: number;
  notes: string;
  /**
   * The parent's decode view, carried verbatim. `wire` was produced by the parent
   * from the GRID WIRE, and undoing it needs the parent's own options (stats,
   * order, alphabet, markers, and — when the parent framed the wire — the shape
   * it chose). Without these a receiver holds a wire it cannot decode, and any
   * external check of this codec degenerates into trusting the encoder's private
   * copy of the round trip.
   */
  stats?: unknown;
  order?: unknown;
  alphabet?: string;
  marker?: string;
  marker2?: string;
  syncopeGroup?: unknown;
  framing?: unknown;
  ouraShape?: unknown;
  ouraMode?: unknown;
  ouraSentinel?: unknown;
}

// ---------------------------------------------------------------------------
// lines and cells
// ---------------------------------------------------------------------------

export function kannabosLines(text: string): Array<{ body: string; eol: string }> {
  const out: Array<{ body: string; eol: string }> = [];
  let i = 0;
  while (i <= text.length) {
    const j = text.indexOf('\n', i);
    if (j < 0) { out.push({ body: text.slice(i), eol: '' }); break; }
    let body = text.slice(i, j);
    let eol = '\n';
    if (body.endsWith('\r')) { body = body.slice(0, -1); eol = '\r\n'; }
    out.push({ body, eol });
    i = j + 1;
  }
  return out;
}

/** Every maximal run of non-space characters, with its exact character offsets. */
export function kannabosCells(line: string): KannabosCell[] {
  const cells: KannabosCell[] = [];
  const re = /[^ ]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) cells.push({ v: m[0], s: m.index, e: m.index + m[0].length });
  return cells;
}

// ---------------------------------------------------------------------------
// the grid
// ---------------------------------------------------------------------------

interface Grid {
  cols: number;
  anchors: KannabosAnchor[];
  rowVals: Array<string[] | null>;
  rows: number;
  literals: number;
}

function modal(xs: number[]): { v: number; n: number } {
  const h = new Map<number, number>();
  for (const x of xs) h.set(x, (h.get(x) ?? 0) + 1);
  let best = { v: 0, n: -1 };
  for (const [v, n] of [...h.entries()].sort((a, b) => a[0] - b[0])) if (n > best.n) best = { v, n };
  return best;
}

/**
 * Fit a grid with exactly `k` columns.
 *
 * Anchors are chosen by SUPPORT, not unanimity: one odd row must not veto a
 * 150-row grid. Rows that miss an anchor become literal lines, and the literal
 * fraction is capped, so a genuine non-grid is still refused rather than
 * approximated.
 */
function fitGrid(lines: Array<{ body: string }>, k: number, dropHead = 0): Grid | null {
  const cells = lines.map((l) => kannabosCells(l.body));
  const cand = cells.slice(dropHead).filter((c) => c.length >= k);
  if (cand.length < KANNABOS_MIN_ROWS) return null;

  const anchors: KannabosAnchor[] = [];
  for (let j = 0; j < k - 1; j++) {
    const L = modal(cand.map((c) => c[j].s));
    const R = modal(cand.map((c) => c[j].e));
    anchors.push(R.n > L.n ? { kind: 'R', at: R.v } : { kind: 'L', at: L.v });
  }
  // The tail is the one column that may contain spaces, so it is the one column
  // with two legitimate anchors: an ABSOLUTE start (L: the value begins at char
  // n) and a GAP-RELATIVE start (T: n spaces after the previous cell). Real CLI
  // output has both — `kubectl` right-shifts the NAME column when the IP above
  // it is wider (absolute), while `ls -l` always leaves exactly one space after
  // the date (relative). The anchor with more support wins; the rest are literal.
  const lm = modal(cand.map((c) => c[k - 1].s));
  const gm = modal(cand.map((c) => c[k - 1].s - c[k - 2].e));
  anchors.push(lm.n >= gm.n && lm.v >= 0
    ? { kind: 'L', at: lm.v }
    : { kind: 'T', at: gm.v > 0 ? gm.v : 1 });

  const rowVals: Array<string[] | null> = [];
  let rows = 0, literals = 0;
  for (let i = 0; i < lines.length; i++) {
    const c = cells[i];
    let ok = i >= dropHead && c.length >= k;
    if (ok) {
      for (let j = 0; j < k - 1; j++) {
        const a = anchors[j];
        if (a.kind === 'L' && c[j].s !== a.at) { ok = false; break; }
        if (a.kind === 'R' && c[j].e !== a.at) { ok = false; break; }
      }
    }
    if (ok) {
      const a = anchors[k - 1];
      if (a.kind === 'L' && c[k - 1].s !== a.at) ok = false;
      else if (a.kind === 'T' && c[k - 1].s - c[k - 2].e !== a.at) ok = false;
    }
    if (ok) {
      const vals: string[] = [];
      for (let j = 0; j < k - 1; j++) vals.push(c[j].v);
      vals.push(lines[i].body.slice(c[k - 1].s));
      rowVals.push(vals);
      rows++;
    } else { rowVals.push(null); literals++; }
  }
  if (rows < KANNABOS_MIN_ROWS) return null;
  if (literals > Math.max(2, Math.floor((rows + literals) * MAX_LITERAL_FRACTION))) return null;
  return { cols: k, anchors, rowVals, rows, literals };
}

// ---------------------------------------------------------------------------
// per-column codecs
// ---------------------------------------------------------------------------

function sameT(a: NumTemplate, b: NumTemplate): boolean {
  return a.pre === b.pre && a.suf === b.suf && a.dec === b.dec && a.width === b.width;
}

/** Arithmetic generator: value at row r is V + r·S in the sample's exact format. */
function fitGen(values: string[]): KannabosCodec | null {
  if (values.length < 3) return null;
  const first = parseNumTemplate(values[0]);
  if (!first) return null;
  const nums: number[] = [];
  for (const v of values) {
    const p = parseNumTemplate(v);
    if (!p || !sameT(first.t, p.t)) return null;
    nums.push(p.v);
  }
  const step = nums[1] - nums[0];
  if (!Number.isSafeInteger(step) || step === 0) return null;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== nums[0] + step * i) return null;
    if (renderNumTemplate(first.t, nums[i]) !== values[i]) return null;
  }
  return { kind: 'l', t: first.t, v: nums[0], at: 0, s: step };
}

/** Clock generator: same rule, on wall-clock readings, unit = seconds. */
function fitClockGen(values: string[]): KannabosCodec | null {
  if (values.length < 3) return null;
  const first = parseClockTemplate(values[0]);
  if (!first) return null;
  const secs: number[] = [];
  for (const v of values) {
    const p = parseClockTemplate(v);
    if (!p || p.t.pre !== first.t.pre || p.t.suf !== first.t.suf || p.t.fields !== first.t.fields) return null;
    secs.push(p.v);
  }
  const step = secs[1] - secs[0];
  if (!Number.isSafeInteger(step) || step === 0) return null;
  for (let i = 0; i < secs.length; i++) {
    if (secs[i] !== secs[0] + step * i) return null;
    if (renderClockTemplate(first.t, secs[i]) !== values[i]) return null;
  }
  return { kind: 'k', t: first.t, v: secs[0], at: 0, s: step };
}

/**
 * COMPOUND FIELD GENERATOR — the answer to METRON's own stated limit.
 *
 * METRON's `lin`/`clock` declare a column as ONE arithmetic progression in ONE
 * fixed textual format, and it explicitly refuses "a column whose values are not
 * an arithmetic progression in a single fixed format". That refusal is where real
 * CLI output lives: `kubectl` ages (`2d0h`, `3d1h`), dotted-quad addresses
 * (`10.244.1.11`), zero-padded counters (`a0003`), two-decimal prices (`12.50`),
 * durations (`1.5s`). None of them is a single number; every one of them is a
 * template of literals with SEVERAL numeric fields, and each field is often its
 * own affine function of the row.
 *
 * So: split the value into alternating literal / digit runs, fit an affine law
 * PER FIELD, and declare the whole thing as `t:<sample>/<step0,step1,…>`. The
 * sample carries the literals, the field widths and the zero-padding (exactly the
 * argument METRON makes for its own sample-as-format), and the step vector carries
 * the laws. A field is width-free unless its sample is zero-padded, which is why
 * `40G → 51G → 100G` (a widening field) is expressible here and is not
 * expressible by `lin`, whose renderer refuses to widen.
 *
 * Cost of the declaration: (sample + steps) tokens ONCE, against one value per
 * row — 3–5 tokens per row for ages, addresses and durations.
 */
function splitFields(v: string): { lits: string[]; nums: Array<{ d: string }> } | null {
  const lits: string[] = [];
  const nums: Array<{ d: string }> = [];
  const re = /(\d+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(v))) {
    lits.push(v.slice(last, m.index));
    nums.push({ d: m[1] });
    last = m.index + m[1].length;
  }
  lits.push(v.slice(last));
  if (!nums.length || nums.length > 6) return null;
  return { lits, nums };
}

function renderCompound(
  lits: string[], fields: CompoundField[], steps: number[], r: number, mods: number[] = [],
): string | null {
  let out = '';
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    let v = f.v + steps[i] * r;
    // A field may be PERIODIC: `s%M` means (v0 + s·r) mod M. Round-robin node
    // assignment, ring buffers, weekday cycles and `i mod 8` address blocks are
    // all of this shape, and a plain affine law refuses every one of them.
    if (mods[i] && mods[i] > 1) v = ((v % mods[i]) + mods[i]) % mods[i];
    if (!Number.isSafeInteger(v) || v < 0) return null;
    const d = String(v);
    out += lits[i] + (f.pad ? d.padStart(f.w, '0') : d);
  }
  out += lits[fields.length];
  return out;
}

function verifyCompound(
  lits: string[], fields: CompoundField[], steps: number[], mods: number[], values: string[],
): boolean {
  for (let r = 0; r < values.length; r++) {
    if (renderCompound(lits, fields, steps, r, mods) !== values[r]) return false;
  }
  return true;
}

function fitCompound(values: string[]): KannabosCodec | null {
  if (values.length < 3) return null;
  const first = splitFields(values[0]);
  if (!first) return null;
  const fields: CompoundField[] = first.nums.map((n) => ({
    v: Number(n.d), w: n.d.length, pad: n.d.length > 1 && n.d[0] === '0',
  }));
  if (fields.some((f) => !Number.isSafeInteger(f.v))) return null;
  const second = splitFields(values[1]);
  if (!second || second.lits.join('\u0000') !== first.lits.join('\u0000')) return null;
  const steps: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    // A CONSTANT field is legal and common (`10.244.…`, `node-5`, `v1.2.3`):
    // only the fields that actually move need a non-zero law.
    const s = Number(second.nums[i].d) - fields[i].v;
    if (!Number.isSafeInteger(s)) return null;
    steps.push(s);
  }
  if (verifyCompound(first.lits, fields, steps, [], values)) {
    return { kind: 't', lits: first.lits, fields, sample: values[0], steps, mods: [] };
  }
  // second chance: PER-FIELD periodicity. For each field that does not fit a
  // plain line, search a small set of periods; keep the first exact combination.
  const PERIODS = [2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24, 32, 60, 100, 128, 256];
  const bad: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    let okField = true;
    for (let r = 0; r < values.length; r++) {
      const sf = splitFields(values[r]);
      if (!sf || sf.nums.length !== fields.length) return null;
      if (sf.lits.join('\u0000') !== first.lits.join('\u0000')) return null;
      const want = Number(sf.nums[i].d);
      if (!Number.isSafeInteger(want)) { okField = false; break; }
      const got = fields[i].v + steps[i] * r;
      const render = fields[i].pad ? String(got).padStart(fields[i].w, '0') : String(got);
      if (render !== sf.nums[i].d) { okField = false; break; }
    }
    if (!okField) bad.push(i);
  }
  if (!bad.length) return null;
  const mods: number[] = fields.map(() => 0);
  for (const i of bad) {
    let found = 0;
    for (const M of PERIODS) {
      const trial = mods.slice(); trial[i] = M;
      if (verifyCompound(first.lits, fields, steps, trial, values)) { found = M; break; }
    }
    if (!found) return null;
    mods[i] = found;
  }
  if (!verifyCompound(first.lits, fields, steps, mods, values)) return null;
  return { kind: 't', lits: first.lits, fields, sample: values[0], steps, mods };
}

export function kannabosRuns(values: string[]): Array<{ v: string; n: number }> {
  const out: Array<{ v: string; n: number }> = [];
  for (const v of values) {
    const last = out[out.length - 1];
    if (last && last.v === v) last.n++;
    else out.push({ v, n: 1 });
  }
  return out;
}

export function kannabosRunBlock(runs: Array<{ v: string; n: number }>, marker = RUNMARK): string {
  return runs.map((r) => (r.n === 1 ? r.v : r.v + marker + r.n)).join('\n');
}

/** The header spec for a codec, WITHOUT the block length (buildPlan adds it). */
function codecSpec(c: KannabosCodec, values: string[]): string {
  switch (c.kind) {
    case 'l': return 'l:' + renderNumTemplate(c.t, c.v)! + '/' + c.at + ',' + c.s;
    case 'k': return 'k:' + renderClockTemplate(c.t, c.v)! + '/' + c.at + ',' + c.s;
    case 't': return 't:' + c.sample + '/'
      + c.steps.map((st, i) => (c.mods[i] ? st + '%' + c.mods[i] : String(st))).join(',');
    case 'r': return 'r' + String(kannabosRuns(values).length);
    case 'd': return 'd' + String(c.dict.length);
    case 'w': return 'w' + String(c.w);
    default: return 'x';
  }
}

/**
 * Pick the cheapest codec for one column.
 *
 * Every candidate is RENDERED and MEASURED, never estimated, and every candidate
 * is rendered SEPARATOR-FREE: a value per line (`x`, `r`), a concatenation whose
 * width is declared (`w`), a dictionary plus index letters (`d`). That is not a
 * stylistic choice, it is a measurement: in o200k a `␟` between two values costs
 * ~2 tokens while a newline costs ~1 and often merges into the value's last
 * token, so the X41-era habit of gluing values with an exotic character was
 * quietly paying double per cell. X42's census (`bench/x42/septest.ts`) is the
 * receipt: 38 COMMAND values cost 435 tokens joined by `␟` and 76 joined by `\n`.
 */
function chooseCodec(values: string[], enc: EncodingName): KannabosCodec {
  const cands: Array<{ codec: KannabosCodec; cost: number }> = [];
  cands.push({ codec: { kind: 'x' }, cost: countTokens(values.join('\n'), enc) + 1 });
  if (values.length > 1) {
    const runs = kannabosRuns(values);
    if (runs.length < values.length) {
      cands.push({ codec: { kind: 'r', runs }, cost: countTokens(kannabosRunBlock(runs), enc) + 1 });
    }
    const dict: string[] = [];
    const seen = new Map<string, number>();
    let wide = false;
    for (const v of values) {
      if (!seen.has(v)) { seen.set(v, dict.length); dict.push(v); }
      if (seen.get(v)! >= IDX.length) wide = true;
    }
    if (!wide && dict.length < values.length) {
      const idx = values.map((v) => IDX[seen.get(v)!]).join('');
      const body = dict.join('\n') + '\n' + idx;
      cands.push({ codec: { kind: 'd', dict, idx }, cost: countTokens(body, enc) + 1 });
    }
    const w = values[0].length;
    if (w > 1 && values.every((v) => v.length === w)) {
      cands.push({ codec: { kind: 'w', w }, cost: countTokens(values.join(''), enc) + 1 });
    }
  }
  const g = fitGen(values);
  if (g) cands.push({ codec: g, cost: countTokens(codecSpec(g, values), enc) + 1 });
  const tc = fitCompound(values);
  if (tc) cands.push({ codec: tc, cost: countTokens(codecSpec(tc, values), enc) + 1 });
  const c = fitClockGen(values);
  if (c) cands.push({ codec: c, cost: countTokens(codecSpec(c, values), enc) + 1 });
  cands.sort((a, b) => a.cost - b.cost);
  return cands[0].codec;
}

function bodyOf(codec: KannabosCodec, values: string[]): string | null {
  switch (codec.kind) {
    case 'x': return values.join('\n');
    case 'w': return values.join('');
    case 'r': return kannabosRunBlock(codec.runs);
    case 'd': return codec.dict.join('\n') + '\n' + codec.idx;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// header helpers
// ---------------------------------------------------------------------------

function runsOfPattern(pat: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < pat.length) {
    const c = pat[i];
    let j = i;
    while (j < pat.length && pat[j] === c) j++;
    out.push(c + String(j - i));
    i = j;
  }
  return out.join('');
}

function expandRuns(r: string): string | null {
  let out = '';
  let i = 0;
  while (i < r.length) {
    const c = r[i];
    if (c !== 'R' && c !== 'L') return null;
    let j = i + 1;
    while (j < r.length && r[j] >= '0' && r[j] <= '9') j++;
    if (j === i + 1) return null;
    const n = Number(r.slice(i + 1, j));
    if (!Number.isSafeInteger(n) || n < 1 || n > 1e6) return null;
    out += c.repeat(n);
    i = j;
  }
  return out.length ? out : null;
}

// ---------------------------------------------------------------------------
// plan
// ---------------------------------------------------------------------------

export function kannabosPlan(text: string, enc: EncodingName = 'o200k_base'): KannabosPlan | null {
  if (!text.length || text.length > KANNABOS_MAX_CHARS) return null;
  const lines = kannabosLines(text);
  if (lines.length < KANNABOS_MIN_ROWS + 1) return null;

  const hist = new Map<number, number>();
  for (const l of lines) {
    const k = kannabosCells(l.body).length;
    if (k >= KANNABOS_MIN_COLS) hist.set(k, (hist.get(k) ?? 0) + 1);
  }
  const cands = [...hist.entries()]
    .filter(([k, n]) => k <= MAX_COLS && n >= KANNABOS_MIN_ROWS)
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])
    .slice(0, MAX_COL_CANDIDATES)
    .map(([k]) => k);
  if (!cands.length) return null;

  // The header delimiter is CHOSEN BY MEASUREMENT: an exotic character absent
  // from the source is safe but not necessarily cheap (U+241F costs ~2 tokens
  // per field), so every safe candidate is rendered and the cheapest wins.
  const delims = DELIMS.filter((d) => !text.includes(d));
  if (!delims.length) return null;
  const marker = RUNMARKS.find((m) => !text.includes(m));
  if (!marker) return null;
  RUNMARK = marker;

  let best: KannabosPlan | null = null;
  let bestCost = Infinity;
  for (const k of cands) {
    // THE HEADER ROW IS USUALLY A CONFORMING ROW. `NAME READY STATUS …` sits on
    // the same anchors as the data, so it enters every column's value list and
    // poisons every generator (the first value of `AGE` becomes the string
    // `AGE`). It is one line: the search below tries ejecting the first 0, 1 or
    // 2 lines into the literal set and keeps the cheapest plan. Outlier ejection
    // is what turns a nearly-regular table into a modelled one.
    for (let dropHead = 0; dropHead <= 2; dropHead++) {
    const g = fitGrid(lines, k, dropHead);
    if (!g) continue;
    for (const delim of delims) {
      const plan = buildPlan(text, lines, g, delim, enc);
      if (!plan) continue;
      const cost = countTokens(plan.text, enc);
      if (cost < bestCost) { bestCost = cost; best = plan; }
    }
    }
  }
  if (!best) return null;
  best.proxyGain = countTokens(text, enc) - bestCost;
  return best;
}

function buildPlan(
  text: string,
  lines: Array<{ body: string; eol: string }>,
  g: Grid,
  delim: string,
  enc: EncodingName,
): KannabosPlan | null {
  const rowIdx: number[] = [];
  for (let i = 0; i < g.rowVals.length; i++) if (g.rowVals[i]) rowIdx.push(i);

  const columns: KannabosColumn[] = [];
  for (let j = 0; j < g.cols; j++) {
    const values = rowIdx.map((i) => g.rowVals[i]![j]);
    if (values.some((v) => v.includes(delim))) return null;
    const codec = chooseCodec(values, enc);
    if (codec.kind === 'l' || codec.kind === 'k') {
      for (let r = 0; r < values.length; r++) {
        const got = codec.kind === 'l'
          ? renderNumTemplate(codec.t, codec.v + codec.s * (r - codec.at))
          : renderClockTemplate(codec.t, codec.v + codec.s * (r - codec.at));
        if (got !== values[r]) return null;
      }
    }
    if (codec.kind === 't') {
      for (let r = 0; r < values.length; r++) {
        if (renderCompound(codec.lits, codec.fields, codec.steps, r, codec.mods) !== values[r]) return null;
      }
    }
    columns.push({ anchor: g.anchors[j], codec, body: bodyOf(codec, values), values });
  }

  // EOL: LF is the wire's own line break; CRLF is declared once and applied to
  // every rebuilt line. Mixed EOLs are not a table and are refused.
  const eols = lines.slice(0, Math.max(0, lines.length - 1)).map((l) => l.eol);
  const crlf = eols.length > 0 && eols.every((e) => e === '\r\n');
  if (!crlf && eols.some((e) => e !== '\n')) return null;

  const specs = columns.map((c) => c.anchor.kind + String(c.anchor.at) + codecSpec(c.codec, c.values));
  let pat = '';
  for (const v of g.rowVals) pat += v ? 'R' : 'L';
  const header = OPEN + [String(g.cols), ...specs, 'p' + runsOfPattern(pat)].join(delim)
    + CLOSE + delim + (crlf ? 'S' : 's') + (RUNMARK === '*' ? '' : RUNMARK);

  const body: string[] = [];
  for (const c of columns) if (c.body !== null) body.push(c.body);
  for (let i = 0; i < g.rowVals.length; i++) if (!g.rowVals[i]) body.push(lines[i].body);

  return {
    header, text: header + '\n' + body.join('\n'), cols: g.cols, rows: g.rows,
    literals: g.literals,
    codecs: columns.map((c) => c.anchor.kind + c.anchor.at + ':' + c.codec.kind
      + (c.codec.kind === 'x' ? '' : String(c.values.length))),
    // A `%` in the header text is NOT evidence of a periodic law — `30%` is a
    // data value in `df -h`. Periodicity is recorded where it is known.
    periodic: columns.some((c) => c.codec.kind === 't'
      && (c.codec as any).mods.some((m: number) => m > 1)),
    proxyGain: 0,
  };
}

// ---------------------------------------------------------------------------
// decode — the header is the program
// ---------------------------------------------------------------------------

export function kannabosDecode(wire: string): string {
  if (!wire.startsWith(OPEN)) return wire;
  const nl = wire.indexOf('\n');
  const head = nl < 0 ? wire : wire.slice(0, nl);
  const rest = nl < 0 ? '' : wire.slice(nl + 1);
  // The spec fields carry SAMPLES, and a sample can contain the close glyph:
  // `L0t:⟨x⟩0/1` is a legal column whose values literally start with `⟨`. So the
  // first `⟩` is not necessarily the header's. The terminator is the last `⟩`
  // followed by a delimiter and the EOL flag (`s`/`S`), which no sample can
  // contain because the delimiter is chosen ABSENT from the source.
  let close = -1;
  for (let i = head.indexOf(CLOSE); i >= 0; i = head.indexOf(CLOSE, i + 1)) {
    const d = head[i + 1];
    const f = head[i + 2];
    if (d && DELIMS.includes(d) && (f === 's' || f === 'S')) close = i;
  }
  if (close < 0) return wire;
  const inner = head.slice(OPEN.length, close);
  const delim = head[close + 1];
  if (!delim || !DELIMS.includes(delim)) return wire;
  const fields = inner.split(delim);
  if (fields.length < 4) return wire;
  const k = Number(fields[0]);
  if (!Number.isInteger(k) || k < 1 || k > MAX_COLS) return wire;
  if (fields.length !== k + 2) return wire;

  const tailFields = head.slice(close + 1).split(delim);
  if (tailFields.length !== 2 || tailFields[0] !== '') return wire;
  const tf = tailFields[1];
  const crlf = tf[0] === 'S';
  if (!crlf && tf[0] !== 's') return wire;
  if (tf.length > 2) return wire;
  const marker = tf.length === 2 ? tf[1] : '*';

  interface Spec { anchor: KannabosAnchor; codec: KannabosCodec; block: number }
  const specs: Spec[] = [];
  for (let j = 0; j < k; j++) {
    const f = fields[j + 1];
    const m = /^([LRT])(\d+)([a-z].*)$/.exec(f);
    if (!m) return wire;
    const at = Number(m[2]);
    const kind = m[1] as 'L' | 'R' | 'T';
    if (!Number.isSafeInteger(at) || at < 0) return wire;
    if (kind === 'T' && at < 1) return wire;
    const c = m[3];
    let codec: KannabosCodec;
    let block = 0;
    if (c === 'x') codec = { kind: 'x' };
    else if (c[0] === 'w') {
      const w = Number(c.slice(1));
      if (!Number.isInteger(w) || w < 1) return wire;
      codec = { kind: 'w', w };
    } else if (c[0] === 'r') {
      block = Number(c.slice(1));
      if (!Number.isInteger(block) || block < 1 || block > 1e6) return wire;
      codec = { kind: 'r', runs: [] };
    } else if (c[0] === 'd') {
      block = Number(c.slice(1));
      if (!Number.isInteger(block) || block < 1 || block > 1e6) return wire;
      codec = { kind: 'd', dict: [], idx: '' };
    } else if (c.startsWith('t:')) {
      const spec2 = c.slice(2);
      const slash2 = spec2.lastIndexOf('/');
      if (slash2 < 0) return wire;
      const sample2 = spec2.slice(0, slash2);
      const stepsRaw = spec2.slice(slash2 + 1).split(',');
      const sf = splitFields(sample2);
      if (!sf) return wire;
      const fields2: CompoundField[] = sf.nums.map((n) => ({
        v: Number(n.d), w: n.d.length, pad: n.d.length > 1 && n.d[0] === '0',
      }));
      if (fields2.some((f) => !Number.isSafeInteger(f.v))) return wire;
      if (stepsRaw.length !== fields2.length) return wire;
      const steps2: number[] = [];
      const mods2: number[] = [];
      for (const x of stepsRaw) {
        const pct = x.indexOf('%');
        const st = Number(pct < 0 ? x : x.slice(0, pct));
        const modRaw = pct < 0 ? '' : x.slice(pct + 1);
        // `%` with no modulus, or a modulus of 0/1, is not a wire this encoder
        // can have written; decoding it as affine would be a guess.
        if (pct >= 0 && modRaw === '') return wire;
        const md = pct < 0 ? 0 : Number(modRaw);
        if (!Number.isSafeInteger(st) || !Number.isSafeInteger(md) || md < 0) return wire;
        if (pct >= 0 && md < 2) return wire;
        steps2.push(st); mods2.push(md);
      }
      codec = { kind: 't', lits: sf.lits, fields: fields2, sample: sample2, steps: steps2, mods: mods2 };
    } else if (c.startsWith('l:') || c.startsWith('k:')) {
      const spec = c.slice(2);
      const cut = spec.lastIndexOf(',');
      const slash = spec.lastIndexOf('/', cut);
      if (cut < 0 || slash < 0) return wire;
      const sample = spec.slice(0, slash);
      const atRow = Number(spec.slice(slash + 1, cut));
      const step = Number(spec.slice(cut + 1));
      if (!Number.isSafeInteger(atRow) || !Number.isSafeInteger(step)) return wire;
      if (c[0] === 'l') {
        const p = parseNumTemplate(sample);
        if (!p || renderNumTemplate(p.t, p.v) !== sample) return wire;
        codec = { kind: 'l', t: p.t, v: p.v, at: atRow, s: step };
      } else {
        const p = parseClockTemplate(sample);
        if (!p || renderClockTemplate(p.t, p.v) !== sample) return wire;
        codec = { kind: 'k', t: p.t, v: p.v, at: atRow, s: step };
      }
    } else return wire;
    specs.push({ anchor: { kind, at } as KannabosAnchor, codec, block });
  }

  const pField = fields[k + 1];
  if (!pField.startsWith('p')) return wire;
  const pat = expandRuns(pField.slice(1));
  if (!pat) return wire;

  let rows = 0;
  for (const ch of pat) if (ch === 'R') rows++;
  // A body of ONE EMPTY LINE is indistinguishable from no body at all: the
  // encoder writes it as `header + "\n"`. That case is not exotic — it is the
  // trailing-newline phantom line (every file ending in "\n" has one), and when
  // every column is a generator the phantom is the ONLY body line, so the whole
  // wire is `header + "\n"`. Without this the planner emits a wire that decodes
  // to itself (silent identity) and the gate measures a phantom.
  let bodyLines = rest === '' ? [] : rest.split('\n');
  if (!bodyLines.length && pat.split('L').length - 1 === 1) bodyLines = [''];

  const colValues: string[][] = [];
  let bi = 0;
  for (const sp of specs) {
    const c = sp.codec;
    if (c.kind === 'l' || c.kind === 'k' || c.kind === 't') {
      const vs: string[] = [];
      for (let r = 0; r < rows; r++) {
        const got = c.kind === 't'
          ? renderCompound(c.lits, c.fields, c.steps, r, c.mods)
          : c.kind === 'l'
            ? renderNumTemplate(c.t, c.v + c.s * (r - c.at))
            : renderClockTemplate(c.t, c.v + c.s * (r - c.at));
        if (got === null) return wire;
        vs.push(got);
      }
      colValues.push(vs);
      continue;
    }
    if (c.kind === 'x') {
      if (bi + rows > bodyLines.length) return wire;
      const vs = bodyLines.slice(bi, bi + rows);
      bi += rows;
      colValues.push(vs);
      continue;
    }
    if (c.kind === 'w') {
      // a `w` block is ONE line: the values concatenated at a declared width,
      // so it carries no boundary character at all.
      const need = c.w * rows;
      if (bi >= bodyLines.length) return wire;
      const acc = bodyLines[bi++];
      if (acc.length !== need) return wire;
      const vs: string[] = [];
      for (let r = 0; r < rows; r++) vs.push(acc.slice(r * c.w, (r + 1) * c.w));
      colValues.push(vs);
      continue;
    }
    if (c.kind === 'r') {
      if (bi + sp.block > bodyLines.length) return wire;
      const linesR = bodyLines.slice(bi, bi + sp.block);
      bi += sp.block;
      const vs: string[] = [];
      for (const part of linesR) {
        const star = part.lastIndexOf(marker);
        let n = 1;
        let v = part;
        if (star > 0) {
          const t = part.slice(star + 1);
          if (!/^\d+$/.test(t)) return wire;
          n = Number(t);
          v = part.slice(0, star);
          if (!Number.isSafeInteger(n) || n < 1 || n > 1e6) return wire;
        }
        for (let i = 0; i < n; i++) vs.push(v);
      }
      if (vs.length !== rows) return wire;
      colValues.push(vs);
      continue;
    }
    // dictionary: `block` value lines then one index line
    if (bi + sp.block + 1 > bodyLines.length) return wire;
    const dict = bodyLines.slice(bi, bi + sp.block);
    bi += sp.block;
    const idx = bodyLines[bi++];
    if (idx.length !== rows) return wire;
    const vs: string[] = [];
    for (const ch of idx) {
      const p = IDX.indexOf(ch);
      if (p < 0 || p >= dict.length) return wire;
      vs.push(dict[p]);
    }
    colValues.push(vs);
  }

  const literals = bodyLines.slice(bi);
  let nLit = 0;
  for (const ch of pat) if (ch === 'L') nLit++;
  if (literals.length !== nLit) return wire;

  const out: string[] = [];
  let li = 0;
  let r = 0;
  for (const ch of pat) {
    if (ch === 'L') { out.push(literals[li++]); continue; }
    let pos = 0;
    let line = '';
    for (let j = 0; j < k; j++) {
      const v = colValues[j][r];
      const a = specs[j].anchor;
      let start: number;
      if (a.kind === 'L') start = a.at;
      else if (a.kind === 'R') start = a.at - v.length;
      else start = pos + a.at;
      if (start < 0) return wire;
      if (j > 0 && start <= pos) return wire;   // cells need at least one space between
      line += ' '.repeat(start - pos) + v;
      pos = start + v.length;
    }
    out.push(line);
    r++;
  }
  return out.join(crlf ? '\r\n' : '\n');
}

// ---------------------------------------------------------------------------
// clause ladder — measured, and gated like every other codec
// ---------------------------------------------------------------------------

/**
 * The contract is generated FROM THE PLAN: it names only the anchors and codecs
 * this wire actually uses. A fixed paragraph would charge every lane for rules it
 * does not need — `w` and `k` are rare, `T` is used only by tables whose last
 * column can contain spaces — and the clause is paid out of the same budget as
 * the data, which is why the stack has a clause ladder at all. This is the same
 * idea taken one step: the ladder has one rung per construct.
 */
export function kannabosClause(plan: KannabosPlan): string {
  const anchors = new Set<string>();
  const kinds = new Set<string>();
  for (const c of plan.codecs) {
    // `plan.codecs` entries are `anchor:kind<count>` — `L57:t22` — whereas the
    // WIRE header writes `anchor+spec` — `L57t:…`. Split on the first ':'.
    const [ap, kind] = c.split(':');
    anchors.add(ap[0]);
    kinds.add(kind[0]);
  }
  // Shortest wording that is still complete. Punctuation and `=` cost tokens, so
  // the clause is telegraphic; four clearer phrasings measured 94–123 tokens
  // against 59 here (bench/x42/clause.ts).
  const a: string[] = [];
  const lr = [anchors.has('L') ? 'Ln' : '', anchors.has('R') ? 'Rn' : ''].filter(Boolean).join('/');
  if (lr) a.push(`${lr} cell starts/ends char n`);
  if (anchors.has('T')) a.push('Tn tail n spaces after last cell');
  const b: string[] = [];
  if (kinds.has('x')) b.push('x one value/line');
  if (kinds.has('r')) b.push('rN N v*count lines');
  if (kinds.has('d')) b.push('dN N values then letters');
  if (kinds.has('w')) b.push('wW fixed width W');
  if (kinds.has('l') || kinds.has('k')) b.push('l/k V+(row−i)S');
  if (kinds.has('t')) {
    // The steps list can carry `s%M` — step s applied modulo M, i.e. a periodic
    // law (`i mod 8` address blocks, round-robin nodes). Say so only when the
    // plan actually uses one; otherwise the plain wording is cheaper.
    b.push(plan.periodic
      ? 't:V/steps, s%M means (V+s·row) mod M'
      : 't:V/steps V stepping per row');
  }
  return 'Grid: ' + a.join(', ') + '; blocks per column: ' + b.join(', ')
    + '; R = one value per column padded to anchors, L literal. Print.';
}

// ---------------------------------------------------------------------------
// encode — exactness first, then the parent's own measure
// ---------------------------------------------------------------------------

export interface KannabosOptions { kannabos?: boolean; [k: string]: unknown }

export function kannabosEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: KannabosOptions = {},
): KannabosResult {
  const parent = ouraEncode(text, enc, opts as any) as any;
  const plain: KannabosResult = {
    wire: parent.wire, contract: parent.contract, decoded: text, exact: true,
    messageTokens: parent.messageTokens, inTokens: countTokens(text, enc),
    kannabos: false, kannabosHeader: '', kannabosCodecs: '', kannabosRows: 0,
    kannabosLiterals: 0, notes: 'kannabos off',
    // Even the refusal carries the parent's decode view: a passthrough is a wire
    // too, and a caller must be able to undo it without re-encoding.
    stats: parent.stats, order: parent.order,
    alphabet: parent.alphabet, marker: parent.marker, marker2: parent.marker2,
    syncopeGroup: parent.syncopeGroup, framing: parent.framing,
    ouraShape: parent.ouraShape, ouraMode: parent.ouraMode, ouraSentinel: parent.ouraSentinel,
  };
  if (opts.kannabos === false) return plain;
  let plan: KannabosPlan | null = null;
  try { plan = kannabosPlan(text, enc); } catch { plan = null; }
  if (!plan) return plain;

  // SOUNDNESS BEFORE MEASUREMENT: byte equality on the real wire.
  if (kannabosDecode(plan.text) !== text) {
    return { ...plain, notes: 'grid refused: transform is not byte-exact' };
  }

  const clause = kannabosClause(plan);

  let alt: any;
  try { alt = ouraEncode(plan.text, enc, opts as any); } catch { return plain; }
  // End-to-end: the parent's own decoder must reproduce the transform, and the
  // grid must then reproduce the source. A wire that survives only the first of
  // those checks is a wire that measures its own bug.
  let decoded = text;
  try { decoded = kannabosDecode(apographeDecodeResult(alt)); } catch { decoded = 'THREW'; }
  if (decoded !== text) {
    return { ...plain, exact: false, notes: 'grid refused: end-to-end decode through the parent failed' };
  }
  const tail = '; print only.';
  const total = alt.messageTokens + countTokens(' ' + clause + tail, enc) - countTokens(tail, enc);
  if (total >= parent.messageTokens) {
    return {
      ...plain,
      notes: `grid found (${plan.cols} cols, ${plan.rows} rows, ${plan.literals} literal) but `
        + `${total} >= parent ${parent.messageTokens}: refused at the gate`,
    };
  }

  return {
    wire: alt.wire,
    contract: alt.contract
      ? alt.contract.replace(/; print only\.$/, ` ${clause} print only.`)
      : clause,
    decoded,
    exact: decoded === text,
    messageTokens: total,
    inTokens: countTokens(text, enc),
    kannabos: true,
    kannabosHeader: plan.header,
    kannabosCodecs: plan.codecs.join(','),
    kannabosRows: plan.rows,
    kannabosLiterals: plan.literals,
    stats: alt.stats, order: alt.order,
    alphabet: alt.alphabet, marker: alt.marker, marker2: alt.marker2,
    syncopeGroup: alt.syncopeGroup, framing: alt.framing,
    ouraShape: alt.ouraShape, ouraMode: alt.ouraMode, ouraSentinel: alt.ouraSentinel,
    notes: `cols=${plan.cols} rows=${plan.rows} literals=${plan.literals} `
      + `parent=${parent.messageTokens} kannabos=${total} proxy=${plan.proxyGain}`,
  };
}
