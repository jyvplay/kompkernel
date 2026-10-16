/**
 * ∴ ΣΤΙΓΜΗ — STIGME (στίγμη, "a point, a punctuation mark"): digit-group punctuation elision (X19).
 * =============================================================================
 *
 * THE MECHANISM (what is new in this stack)
 * -----------------------------------------------------------------------------
 * o200k_base chunks a run of ASCII digits THREE at a time: "2026" costs two
 * tokens ("202" + "6"), and every punctuation mark that sits *inside* a number
 * costs its own token. Measured on this repository's 28 holdout lanes
 * (bench/x19/probe-shapes.mjs):
 *
 *     2026-08-14             6 tokens    (202 | 6 | - | 08 | - | 14)
 *     20260814               3 tokens
 *     10:00:01.234           7 tokens    100001234            3 tokens
 *     18,442.17              5 tokens    1844217              3 tokens
 *     192.168.1.101          7 tokens    1921681101           4 tokens
 *
 * Across the 28 lanes the corpus contains 2 002 "digit clusters" (a maximal
 * chain  D s D s … D  of digit runs joined by one punctuation character each).
 * Deleting their inner punctuation and re-chunking the digits saves 8 345 raw
 * o200k tokens — 13.3 % of the 62 954 raw tokens of the whole corpus, and about
 * 30 % of the frontier minimum. Nothing in `src/lib/omega` removes the
 * punctuation *inside* a number: AKOLOUTHIA/HORA/HEMERA replace whole numbers by
 * markers computed from neighbours; STATHMOS removes trailing zeros of a
 * fixed-width decimal column; DENDRON factors shared path prefixes; DAEDALUS's
 * dictionary cannot see it because a separator that occurs once per line is not
 * a repeat worth a rule.
 *
 * WHY THE READER CAN PUT IT BACK
 * -----------------------------------------------------------------------------
 * The shapes are extremely concentrated. Measured counts of the most frequent
 * shape per lane (same probe): vix-daily-1990.csv 126/126 clusters have one
 * shape; ops-ls-l-omega 159/159; find-listing 240 clusters in 2 shapes;
 * ls-full-iso 56 in 2; openstack 189 in 4. So ONE declarative sentence per
 * shape, naming (a) the total digit count, (b) the run lengths, (c) the
 * separators, and (d) one worked example, restores nearly every cluster in a
 * lane. Each cluster therefore costs zero tokens of per-occurrence overhead.
 *
 * THE WIRE
 * -----------------------------------------------------------------------------
 *   transformed text → (LAKONIKOS-D | DENDRON-S | AKOLOUTHIA-2) → wire
 *   message = <wire> \n <chiron clauses> \n <stigme sentence>
 *
 * The STIGME sentence is appended after the CHIRON clauses exactly as STATHMOS
 * appends its `@dp` sentence, and it says the restore happens *in the printed
 * result*, i.e. after the CHIRON rules (and, on the AKOLOUTHIA arm, after the
 * progression markers) have been expanded. The reader's pipeline is:
 *
 *   expand CHIRON rules → expand AKOLOUTHIA markers → restore digit punctuation
 *
 * CORRECTNESS INVARIANT (this is the whole proof of byte-exactness)
 * -----------------------------------------------------------------------------
 * Let `T` be the transformed text. The decoder rule is a function R applied to
 * the *expanded* text. The encoder guarantees:
 *
 *   (I1)  T is produced from the source S by a per-cluster substitution, so
 *         R(T) = S. (Each cluster is replaced by its digit concatenation; the
 *         sentence fixes the lengths, so the split is unique.)
 *   (I2)  Every maximal digit run in T whose length is the total of a DEFAULT
 *         (unmarked) shape is a packed cluster of that shape. Every other
 *         maximal digit run of that length is suffixed with the escape glyph and
 *         the reader deletes the glyph. So R cannot fire on a run it should not.
 *   (I3)  A marked shape fires only immediately after its own glyph, and that
 *         glyph occurs in T only as that shape's marker.
 *   (I4)  The downstream codec is byte-exact, so the expanded text equals T.
 *
 * The encoder verifies R(decoded) === S before shipping; anything else falls
 * back to the identity arm. The invariant is re-checked on the *decoded* text,
 * not on the wire, so a DAEDALUS rule that happens to end in the middle of a
 * digit run cannot corrupt the restore.
 *
 * GATE
 * -----------------------------------------------------------------------------
 * The encoder runs every arm on the raw text and on the transformed text and
 * keeps the cheapest message, so STIGME can never cost more than any arm it
 * contains. Disclosed: the arms inherit the DAEDALUS wall-clock budget.
 *
 * ESCAPE
 * -----------------------------------------------------------------------------
 * Two escapes, both rare. (a) A digit run that was NOT produced by packing but
 * whose length equals a default shape's total would be re-split by mistake, so
 * the encoder suffixes it with a one-token glyph and one clause says to delete
 * the glyph. (b) A payload that already begins with the marker string is simply
 * not transformed, so no prefix scheme is needed at all.
 */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosDualEncode } from './lakonikos-d';
import { densEncode, densDecode } from './dendrons';
import { akolouthia2Encode, akolouthia2Decode } from './akolouthia2';

export const STIGME_RAW = '@stigme:raw\n';

/** Default characters allowed *inside* a digit cluster. */
export const STIGME_SEPS = '-.:/,;_+*';
/** Letters that sit *inside* a value often enough to pay: ISO-8601 T and Z, and the x of a resolution. */
export const STIGME_SEPS_LETTERS = 'TxZ';
export const STIGME_VARIANTS: Array<[string, Set<string>]> = [
  ['punct', new Set([...STIGME_SEPS])],
  ['punct+letters', new Set([...STIGME_SEPS, ...STIGME_SEPS_LETTERS])],
];

/**
 * Marker candidates: single-token characters that are NOT members of any CHIRON
 * glyph script, so they can never be read as a CHIRON rule reference. Latin-1
 * symbols (U+00A4..U+00BF) are one token under both o200k_base and cl100k_base;
 * the CHIRON frame characters (\u00a7 \u00b6 \u00d7 \u2026) are excluded by hand.
 * CHIRON additionally removes any character present in the payload from its own
 * pools, so a marker can never be assigned as a rule glyph either.
 */
const MARK_CANDIDATES = [
  '\u00a4', '\u00a6', '\u00a9', '\u00ab', '\u00ac', '\u00ae', '\u00af', '\u00b0', '\u00b1',
  '\u00b2', '\u00b3', '\u00b4', '\u00b5', '\u00b7', '\u00b8', '\u00b9', '\u00ba', '\u00bb',
  '\u00bc', '\u00bd', '\u00be', '\u00bf',
  '\u03b1', '\u03b2', '\u03b3', '\u0561', '\u0562', '\u10d0', '\u10d1',
];

const MAX_RUNS = 12;      // a cluster is refused if it has more runs than this
const MAX_RUNLEN = 24;    // …or a run longer than this

export interface StigmeCluster {
  start: number;
  end: number;
  runs: string[];
  seps: string[];
  raw: string;
}

export interface StigmeShape {
  runs: number[];
  seps: string[];
  total: number;
  count: number;
  /** raw tokens saved by packing every cluster of this shape, measured standalone */
  gross: number;
  /** one worked example: the packed form and the original */
  exPacked: string;
  exRaw: string;
}

export interface StigmeShapeUse {
  shape: StigmeShape;
  /** '' = the default shape for this total length (no per-occurrence cost) */
  mark: string;
}

export interface StigmePlan {
  uses: StigmeShapeUse[];
  /** which separator alphabet produced this plan */
  variant: string;
  seps: Set<string>;
  escape: string;
  escapes: number;
  /** the sentence appended to the decoder message */
  contract: string;
  /** o200k tokens of `contract` */
  contractTokens: number;
  /** tokens(text) - tokens(transformed) measured on the whole text */
  rawDelta: number;
  clusters: number;
  packed: number;
}

export interface StigmeForward {
  text: string;
  plan: StigmePlan;
}

const isDigit = (c: string) => c >= '0' && c <= '9';

/** Every maximal chain of digit runs joined by one separator character. */
export function stigmeClusters(text: string, seps: Set<string>): StigmeCluster[] {
  const out: StigmeCluster[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    if (!isDigit(text[i])) { i++; continue; }
    let j = i;
    const runs: string[] = [];
    const seplist: string[] = [];
    while (j < n) {
      const st = j;
      while (j < n && isDigit(text[j])) j++;
      if (j - st > MAX_RUNLEN) break;
      runs.push(text.slice(st, j));
      if (j >= n) break;
      const c = text[j];
      if (seps.has(c) && j + 1 < n && isDigit(text[j + 1])) { seplist.push(c); j++; } else break;
      if (runs.length >= MAX_RUNS) break;
    }
    if (runs.length >= 2) out.push({ start: i, end: j, runs, seps: seplist, raw: text.slice(i, j) });
    i = j;
  }
  return out;
}

const shapeKey = (c: StigmeCluster) => c.runs.map(r => r.length).join(',') + '|' + c.seps.join('');

function buildShapes(text: string, enc: EncodingName, seps: Set<string>): StigmeShape[] {
  const cs = stigmeClusters(text, seps);
  const by = new Map<string, { runs: number[]; seps: string[]; count: number; gross: number; exPacked: string; exRaw: string; cntEx: number }>();
  const exCount = new Map<string, number>();
  for (const c of cs) {
    const k = shapeKey(c);
    const packed = c.runs.join('');
    const gross = countTokens(c.raw, enc) - countTokens(packed, enc);
    const e = by.get(k);
    if (!e) {
      by.set(k, { runs: c.runs.map(r => r.length), seps: c.seps, count: 1, gross, exPacked: packed, exRaw: c.raw, cntEx: 1 });
      exCount.set(k, 1);
    } else {
      e.count++; e.gross += gross;
      // keep the shortest example (cheapest clause)
      if (c.raw.length < e.exRaw.length) { e.exPacked = packed; e.exRaw = c.raw; }
    }
  }
  const shapes: StigmeShape[] = [];
  for (const [k, e] of by) {
    if (e.gross <= 0) continue;
    shapes.push({ runs: e.runs, seps: e.seps, total: e.runs.reduce((a, b) => a + b, 0), count: e.count, gross: e.gross, exPacked: e.exPacked, exRaw: e.exRaw });
  }
  shapes.sort((a, b) => b.gross - a.gross || a.total - b.total);
  return shapes;
}

/**
 * The sentence a reader is given. Two templates are measured and the cheaper is
 * shipped; both always contain at least one worked example, because the example
 * is what makes the clause checkable by a reader rather than merely parsable.
 *
 *   T1  one worked example per shape      (cheapest when the shapes are short)
 *   T3  one shared example in the lead-in, terse clauses after it
 *       (cheapest when a shape is long, e.g. the 40-digit CSV row of vix)
 */
const T1_BASE = 'Nums drop inner punctuation; restore in the result:';
const T3_BASE = 'Nums drop inner punctuation; restore in the result: 20260930 = 2026-09-30, i.e. LEN=run lengths with "..." between them.';

const runsOf = (s: StigmeShape) => s.runs.join('-');
const sepsOf = (s: StigmeShape) => '"' + s.seps.join('') + '"';
const headOf = (u: StigmeShapeUse) => (u.mark ? ` ${u.mark}${u.shape.total}` : ` ${u.shape.total}`);

function contractT1(uses: StigmeShapeUse[]): string {
  return T1_BASE + uses.map(u => ` ${headOf(u)}=${runsOf(u.shape)}${sepsOf(u.shape)} (${u.shape.exPacked}=${u.shape.exRaw}).`).join('');
}
function contractT3(uses: StigmeShapeUse[]): string {
  return T3_BASE + uses.map(u => ` ${headOf(u)}=${runsOf(u.shape)}${sepsOf(u.shape)}.`).join('');
}

export function stigmeContractTemplates(uses: StigmeShapeUse[]): string[] {
  return [contractT1(uses), contractT3(uses)];
}

/** The sentence a reader is given (cheapest template, plus the escape clause when it is used). */
export function stigmeContract(uses: StigmeShapeUse[], escape: string, escapes: number, enc: EncodingName): string {
  let best = '';
  let bestN = Infinity;
  for (const c of stigmeContractTemplates(uses)) {
    const n = countTokens(c, enc);
    if (n < bestN) { bestN = n; best = c; }
  }
  if (escapes > 0) best += ` A digit run followed by ${escape} keeps its digits; delete the ${escape}.`;
  return best;
}

/** Apply the plan. Returns the transformed text and the packed ranges (for the escape scan). */
function applyPlan(text: string, uses: StigmeShapeUse[], seps: Set<string>): { text: string; packedStarts: Set<number> } {
  const cs = stigmeClusters(text, seps);
  const keyOf = new Map<string, StigmeShapeUse>();
  for (const u of uses) keyOf.set(u.shape.runs.join(',') + '|' + u.shape.seps.join(''), u);
  let out = '';
  let at = 0;
  const packedStarts = new Set<number>();
  for (const c of cs) {
    const u = keyOf.get(shapeKey(c));
    out += text.slice(at, c.start);
    if (!u) { out += c.raw; at = c.end; continue; }
    packedStarts.add(out.length + u.mark.length);
    out += u.mark + c.runs.join('');
    at = c.end;
  }
  out += text.slice(at);
  return { text: out, packedStarts };
}

/** Invariant (I2): neutral runs whose length collides with a default shape get the escape glyph. */
function insertEscapes(text: string, defaultLengths: Set<number>, packedStarts: Set<number>, escape: string): { text: string; n: number } {
  if (!defaultLengths.size) return { text, n: 0 };
  let out = '';
  let n = 0;
  let i = 0;
  const len = text.length;
  while (i < len) {
    if (!isDigit(text[i])) { out += text[i]; i++; continue; }
    let j = i;
    while (j < len && isDigit(text[j])) j++;
    out += text.slice(i, j);
    if (defaultLengths.has(j - i) && !packedStarts.has(i)) { out += escape; n++; }
    i = j;
  }
  return { text: out, n };
}

export interface StigmePlanOptions {
  seps?: Set<string>;
  /** how many shapes to admit, at most */
  maxShapes?: number;
}

/**
 * Choose the shape set, the separator alphabet and the contract template.
 * Tries every (variant, K) pair and both templates, measures the whole-text
 * token delta against the measured contract cost, and keeps the best net.
 */
export function stigmePlan(text: string, enc: EncodingName, options: StigmePlanOptions = {}): StigmePlan | null {
  const maxShapes = options.maxShapes ?? 4;
  const variants = options.seps ? [['custom', options.seps] as [string, Set<string>]] : STIGME_VARIANTS;
  if (text.startsWith(STIGME_RAW)) return null;

  const payloadChars = new Set(text);
  // A marker must be one token under BOTH tokenisers (the arms include DAEDALUS-D)
  // and must not occur in the payload.
  const marks = MARK_CANDIDATES.filter(
    m => !payloadChars.has(m) && countTokens(m, 'o200k_base') === 1 && countTokens(m, 'cl100k_base') === 1,
  );
  if (marks.length < 2) return null;
  const escape = marks[marks.length - 1];
  const markPool = marks.slice(0, marks.length - 1);

  const rawTokens = countTokens(text, enc);
  let best: StigmePlan | null = null;
  let bestNet = 0;

  for (const [vname, seps] of variants) {
    const shapes = buildShapes(text, enc, seps);
    if (!shapes.length) continue;
    const clusters = stigmeClusters(text, seps).length;
    const usedLengths = new Set<number>();
    const chosen: StigmeShapeUse[] = [];
    for (let k = 0; k < Math.min(maxShapes, shapes.length); k++) {
      const sh = shapes[k];
      let mark = '';
      if (usedLengths.has(sh.total)) {
        const g = markPool[chosen.filter(c => c.mark).length];
        if (!g) continue;
        mark = g;
      } else usedLengths.add(sh.total);
      chosen.push({ shape: sh, mark });

      const applied = applyPlan(text, chosen, seps);
      const defLen = new Set(chosen.filter(c => !c.mark).map(c => c.shape.total));
      const esc = insertEscapes(applied.text, defLen, applied.packedStarts, escape);
      const rawDelta = rawTokens - countTokens(esc.text, enc);
      for (const contract of stigmeContractTemplates(chosen)) {
        const cFull = esc.n > 0
          ? contract + ` A digit run followed by ${escape} keeps its digits; delete the ${escape}.`
          : contract;
        const contractTokens = countTokens(cFull, enc);
        const net = rawDelta - contractTokens;
        if (net > bestNet) {
          bestNet = net;
          best = {
            uses: [...chosen], variant: vname, seps, escape, escapes: esc.n,
            contract: cFull, contractTokens, rawDelta, clusters,
            packed: chosen.reduce((a, c) => a + c.shape.count, 0),
          };
        }
      }
    }
  }
  return best;   // null when no (variant, K, template) pays
}

/** Forward transform: source text → transformed text. */
export function stigmeForward(text: string, plan: StigmePlan): string {
  const applied = applyPlan(text, plan.uses, plan.seps);
  const defLen = new Set(plan.uses.filter(u => !u.mark).map(u => u.shape.total));
  return insertEscapes(applied.text, defLen, applied.packedStarts, plan.escape).text;
}

/** Inverse: the reader's rule, applied to the printed result. */
export function stigmeRestore(t: string, plan: StigmePlan): string {
  if (t.startsWith(STIGME_RAW)) return t.slice(STIGME_RAW.length);
  const defaultByLen = new Map<number, StigmeShape>();
  const marked = new Map<string, StigmeShape>();
  for (const u of plan.uses) {
    if (u.mark) marked.set(u.mark, u.shape);
    else defaultByLen.set(u.shape.total, u.shape);
  }
  const expand = (shape: StigmeShape, digits: string): string => {
    if (digits.length !== shape.total) return digits;
    let out = '';
    let at = 0;
    for (let i = 0; i < shape.runs.length; i++) {
      if (i) out += shape.seps[i - 1];
      out += digits.slice(at, at + shape.runs[i]);
      at += shape.runs[i];
    }
    return out;
  };
  let out = '';
  let i = 0;
  const n = t.length;
  while (i < n) {
    const ch = t[i];
    const sh = marked.get(ch);
    if (sh !== undefined) {
      let j = i + 1;
      while (j < n && isDigit(t[j])) j++;
      const digits = t.slice(i + 1, j);
      out += digits.length === sh.total ? expand(sh, digits) : digits;
      i = j;
      continue;
    }
    if (isDigit(ch)) {
      let j = i;
      while (j < n && isDigit(t[j])) j++;
      const digits = t.slice(i, j);
      if (j < n && t[j] === plan.escape) { out += digits; i = j + 1; continue; }
      const shd = defaultByLen.get(digits.length);
      out += shd ? expand(shd, digits) : digits;
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Arm plumbing: each arm is (encode → message text, decode → text).
 * ------------------------------------------------------------------------- */

interface ArmOut {
  wire: string;
  message: string;
  /** the reader's own decode of `wire`, arm-aware */
  decode: () => string;
  /** arm-internal state the decoder needs (AKOLOUTHIA-2's progression/identity arm) */
  armState?: string;
  tokens: number;
  note: string;
}

interface Arm {
  name: string;
  encode: (t: string, enc: EncodingName) => ArmOut;
}

const arms: Arm[] = [
  {
    name: 'lkd',
    encode: (t, enc) => {
      const r = lakonikosDualEncode(t, enc);
      return { wire: r.wire, message: r.decoderPrompt || t, decode: () => chironDecode(r.wire), tokens: r.messageTokens[enc], note: r.mode };
    },
  },
  {
    name: 'dens',
    encode: (t, enc) => {
      const r = densEncode(t, enc, {});
      return { wire: r.wire, message: r.decoderPrompt, decode: () => densDecode(r.wire), tokens: r.messageTokens, note: r.applied ? `tree(${r.sep})` : 'frontier' };
    },
  },
  {
    name: 'ak2',
    encode: (t, enc) => {
      const r = akolouthia2Encode(t, enc);
      return { wire: r.wire, message: r.decoderPrompt, decode: () => akolouthia2Decode(r.wire, r.arm), armState: r.arm, tokens: r.messageTokens, note: r.arm };
    },
  },
];

export interface StigmeResult {
  codec: 'stigme';
  wire: string;
  /** the full message: arm contract + wire, plus the STIGME sentence when the transform was taken */
  message: string;
  decoded: string;
  exact: boolean;
  mode: 'raw' | 'stigme';
  arm: string;
  transformed: boolean;
  shapes: number;
  packed: number;
  escapes: number;
  rawDelta: number;
  contractTokens: number;
  messageTokens: number;
  /** M of the best arm on the untouched text (the gate's comparison base) */
  baseTokens: number;
  inTokens: number;
  /** the chosen plan, when the transform was taken (needed by stigmeDecode) */
  plan: StigmePlan | null;
  armState?: string;
  notes: string;
}

/**
 * The reader's own decode of a STIGME message: the arm's decoder, then the
 * digit-punctuation restore. `plan === null` is the identity arm.
 */
export function stigmeDecode(wire: string, arm: string, plan: StigmePlan | null, armState?: string): string {
  const t =
    arm === 'dens' ? densDecode(wire)
    : arm === 'ak2' ? akolouthia2Decode(wire, (armState as 'progression' | 'identity') ?? 'progression')
    : chironDecode(wire);
  return plan ? stigmeRestore(t, plan) : t;
}

/**
 * The codec. Runs every arm on the raw text and on the transformed text, keeps
 * the cheapest exact message. Never worse than the best arm it contains.
 */
export function stigmeEncode(text: string, enc: EncodingName = 'o200k_base'): StigmeResult {
  const inTokens = countTokens(text, enc);
  // No escape prefix is needed: the transform never touches leading characters,
  // and a payload that already begins with STIGME_RAW is simply not transformed.
  const rawIn = text;

  // baseline: the arms on the untouched text
  let base: { wire: string; message: string; tokens: number; arm: string; armState?: string; note: string } | null = null;
  for (const a of arms) {
    try {
      const r = a.encode(rawIn, enc);
      if (r.decode() !== rawIn) continue;
      if (!base || r.tokens < base.tokens) base = { wire: r.wire, message: r.message, tokens: r.tokens, arm: a.name, armState: r.armState, note: r.note };
    } catch { /* arm failed on this input; skip */ }
  }
  if (!base) {
    return {
      codec: 'stigme', wire: text, message: text, decoded: text, exact: true, mode: 'raw', arm: 'none',
      transformed: false, shapes: 0, packed: 0, escapes: 0, rawDelta: 0, contractTokens: 0,
      messageTokens: inTokens, baseTokens: inTokens, inTokens, plan: null, notes: 'identity: no arm produced an exact wire',
    };
  }

  const out = (over: Partial<StigmeResult> = {}): StigmeResult => ({
    codec: 'stigme', wire: base!.wire, message: base!.message, decoded: text, exact: true, mode: 'raw',
    arm: base!.arm, transformed: false, shapes: 0, packed: 0, escapes: 0, rawDelta: 0, contractTokens: 0,
    messageTokens: base!.tokens, baseTokens: base!.tokens, inTokens, plan: null, armState: base!.armState,
    notes: `identity (best raw arm ${base!.arm}, ${base!.tokens} tok)`, ...over,
  });

  let plan: StigmePlan | null = null;
  try { plan = stigmePlan(text, enc); } catch { plan = null; }
  if (!plan) return out();

  const transformed = stigmeForward(text, plan);
  if (stigmeRestore(transformed, plan) !== text) return out({ notes: `restore check failed; ${out({}).notes}` });

  let bestTr: { wire: string; message: string; tokens: number; arm: string; armState?: string } | null = null;
  for (const a of arms) {
    try {
      const r = a.encode(transformed, enc);
      const back = stigmeRestore(r.decode(), plan);
      if (back !== text) continue;
      const message = r.message + '\n' + plan.contract;
      const tokens = countTokens(message, enc);
      if (!bestTr || tokens < bestTr.tokens) bestTr = { wire: r.wire, message, tokens, arm: a.name, armState: r.armState };
    } catch { /* skip */ }
  }
  if (!bestTr) return out({ notes: `no arm decoded the transformed text exactly; ${out({}).notes}` });
  if (bestTr.tokens >= base.tokens) {
    return out({ notes: `transformed arm ${bestTr.arm} ${bestTr.tokens} >= raw ${base.tokens} (delta ${plan.rawDelta}, contract ${plan.contractTokens}); ${out({}).notes}` });
  }
  return {
    codec: 'stigme', wire: bestTr.wire, message: bestTr.message, decoded: text, exact: true, mode: 'stigme',
    arm: bestTr.arm, transformed: true, shapes: plan.uses.length, packed: plan.packed, escapes: plan.escapes,
    rawDelta: plan.rawDelta, contractTokens: plan.contractTokens, messageTokens: bestTr.tokens,
    baseTokens: base.tokens, inTokens, plan, armState: bestTr.armState,
    notes: `arm=${bestTr.arm}; shapes=${plan.uses.map(u => (u.mark || '*') + u.shape.runs.join('-') + '×' + u.shape.count).join(' ')}; packed=${plan.packed}/${plan.clusters}; escapes=${plan.escapes}; rawDelta=${plan.rawDelta}; contract=${plan.contractTokens}; ${base.tokens} -> ${bestTr.tokens}`,
  };
}
