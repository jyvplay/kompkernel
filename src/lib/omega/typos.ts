/**
 * ⊙ TYPOS — shape-stated separator elision for numeric runs (X20).
 * =============================================================================
 *
 * MECHANISM (new in this stack)
 * -----------------------------------------------------------------------------
 * Every maximal "numeric run" of a text — digits interleaved with separators
 * from a fixed set (- . : / T, optionally space) — has a SHAPE: the run with
 * each digit replaced by 9. `2026-09-30` has shape `9999-99-99`,
 * `07:59:52.640393881` has shape `99:99:99.999999999`, `17.240000` has shape
 * `99.999999`. Real text repeats a handful of shapes hundreds of times (ISO
 * dates, clock times, log timestamps, fixed-precision prices, dotted versions)
 * while the DIGITS inside them are all different, so no dictionary can merge
 * them: DAEDALUS sees 100 distinct strings where TYPOS sees one shape stated
 * once and 100 digit strings.
 *
 * TYPOS deletes the separators of every run whose shape is declared and states
 * the shapes once in the contract, e.g.
 *
 *   Digits are packed; split each digit run to its shape (9=digit): 9999-99-99, 99:99:99.999999999.
 *
 * The reader restores a digit run by matching its digit count to a shape. One
 * sentence pays for every occurrence in the message.
 *
 * THREE READER RULES, CHEAPEST ADMISSIBLE ONE WINS
 * -----------------------------------------------------------------------------
 *  strict    every digit run of a declared length is split. Cheapest sentence.
 *            Admissible only when no foreign digit run carries a declared length.
 *  isolated  only a digit run that is not glued to a word character is split, so
 *            the "692162415" inside `a692162415ae` is out of scope. Costs one
 *            extra clause; unlocks texts with identifiers.
 *  marked    each declared shape gets its own one-token mark, written in front of
 *            the digits (`†20260930`). No length collision is possible at all, so
 *            it always works; it costs one token per occurrence, so only shapes
 *            that lose at least two separator tokens are declared.
 * The encoder scores all three with a tokenizer-only estimate, encodes the best
 * one once, and gates it. That is a predictor plus a gate, not a tournament.
 *
 * WHY IT IS EXACT
 * -----------------------------------------------------------------------------
 * Let C be the declared shapes and L(s) the digit count of s.
 *  (i)  L is injective on C (enforced while the set is filled).
 *  (ii) In the transformed text, every digit run that is in the reader's scope
 *       and has a length in L(C) is the image of a declared run.
 * Maximal numeric runs of the input are pairwise separated by at least one
 * character that belongs to no run (a run is a greedy match, so the character
 * after one is a non-separator or a separator not followed by a digit), so
 * deleting the separators inside a run never merges it with a neighbour and
 * every digit run of the transformed text is the image of exactly one input run.
 * Under (i)+(ii) the map digit-run -> shape is therefore injective on the runs in
 * scope, and expansion is the exact inverse. The encoder still runs the inverse
 * and compares bytes, and refuses the arm on any mismatch. In marked mode the
 * mark itself names the shape, so (i) and (ii) are not needed at all.
 *
 * RELATION TO THE REST OF THE STACK (what it is NOT)
 * -----------------------------------------------------------------------------
 *  - STATHMOS strips trailing zeros of a fixed-width DECIMAL COLUMN and ships a
 *    per-column header line; TYPOS strips SEPARATORS of any recurring shape
 *    anywhere in the text (prose included) and ships one sentence.
 *  - AKOLOUTHIA/-2 replace a NUMBER by a marker when it continues an arithmetic
 *    progression down a column; TYPOS never predicts a value, it re-spells it.
 *  - HORA/HEMERA send a timestamp as a DELTA from the previous one; TYPOS sends
 *    the whole timestamp minus its separators and needs no ordering.
 *  - CRASIS deletes a space after punctuation where the live tokenizer merges the
 *    two sides; TYPOS deletes separators inside numbers whatever the tokenizer
 *    does, and restores them by shape.
 *  - TABMIN/PADTAB re-lay-out TABLES; TYPOS is a character-level transform that
 *    applies to prose, logs, listings and tables alike.
 *
 * GATE / COST MODEL
 * -----------------------------------------------------------------------------
 * The arm is LAKONIKOS-D(transformed) + the shape sentence. The base arm is
 * LAKONIKOS-D(input). The arm is returned only when its one-chat M is strictly
 * lower AND the inverse reproduces the input byte for byte, so
 *     M(TYPOS) <= M(LAKONIKOS-D)      on every input.
 * Disclosed inheritance: the wire comes from DAEDALUS-D, which has a wall-clock
 * budget (constant under OMEGA_DET=1), so production timing can vary exactly as
 * it does for DAEDALUS-D.
 *
 * SELECTION SHAPE: greedy, not a tournament over occurrences. Candidate shapes
 * are scored by an estimated net saving and taken in that order while (i) holds;
 * every in-scope occurrence of a taken shape is transformed. One whole-message
 * gate at the end. No search over which occurrences to transform.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosDualEncode } from './lakonikos-d';
import { stathmosEncode, stathmosDecode, stathmosForward, stathmosRestore, STATHMOS_CONTRACT, STATHMOS_MARK } from './stathmos';

/** separators that may appear between digits of one numeric run (default) */
export const TYPOS_SEPS = '-:./T';
/** the wider set, which also lets a space join two numeric fields into one run */
export const TYPOS_SEPS_WIDE = '-:./T ';
/** one-token marks for the marked rule, in preference order; none is a CHIRON frame character */
export const TYPOS_MARKS = ['†', '‡', '◆', '●', '■', '▲', '▼', '◀', '▶', '¤', '◊', '⌘'];

export type TyposMode = 'strict' | 'isolated' | 'marked';

export interface TyposOptions {
  /** a shape must occur at least this often to be declared (default 2) */
  minCount?: number;
  /** separator set (default TYPOS_SEPS) */
  seps?: string;
  /** hard cap on declared shapes (default 12) */
  maxShapes?: number;
  /** force one reader rule; default: score all three and cascade by estimate */
  mode?: TyposMode;
  /** how many plans the cascade may encode (default 3) */
  maxPlans?: number;
  enc?: EncodingName;
}

export interface TyposForward {
  text: string;
  shapes: string[];
  /** mark per shape, marked mode only (empty otherwise) */
  marks: string[];
  /** per-shape occurrence count */
  counts: number[];
  /** occurrences transformed */
  occurrences: number;
  mode: TyposMode;
  /** tokenizer-only estimate of the saving: tok(input) - tok(text) - tok(sentence) */
  est: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function typosRunRe(seps: string = TYPOS_SEPS): RegExp {
  return new RegExp(`[0-9](?:[0-9]|[${escapeRe(seps)}](?=[0-9]))*`, 'g');
}

/** the shape of a numeric run: every digit becomes 9 */
export function typosShape(run: string): string {
  return run.replace(/[0-9]/g, '9');
}

/** digit count of a shape */
export function typosLen(shape: string): number {
  let n = 0;
  for (const ch of shape) if (ch === '9') n++;
  return n;
}

/** Is `ch` a word character (letter or number, any script)? */
function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
}

function fill(shape: string, digits: string): string | null {
  let i = 0;
  let out = '';
  for (const ch of shape) out += ch === '9' ? digits[i++] : ch;
  return i === digits.length ? out : null;
}

/** Reader rule 1: expand every maximal digit run whose length matches a shape. */
export function typosExpand(t: string, shapes: string[]): string {
  if (!shapes.length) return t;
  const byLen = new Map<number, string>();
  for (const sh of shapes) byLen.set(typosLen(sh), sh);
  return t.replace(/[0-9]+/g, (m) => {
    const sh = byLen.get(m.length);
    if (!sh) return m;
    return fill(sh, m) ?? m;
  });
}

/** Reader rule 2: as above, but a digit run glued to a word character is left alone. */
export function typosExpandIsolated(t: string, shapes: string[]): string {
  if (!shapes.length) return t;
  const byLen = new Map<number, string>();
  for (const sh of shapes) byLen.set(typosLen(sh), sh);
  let out = '';
  let last = 0;
  for (const m of t.matchAll(/[0-9]+/g)) {
    const i = m.index ?? 0;
    const sh = byLen.get(m[0].length);
    if (!sh) continue;
    if (isWordChar(t[i - 1]) || isWordChar(t[i + m[0].length])) continue;
    const rep = fill(sh, m[0]);
    if (rep === null) continue;
    out += t.slice(last, i) + rep;
    last = i + m[0].length;
  }
  return out + t.slice(last);
}

/** Reader rule 3: the mark in front of a digit run names its shape; drop the mark. */
export function typosExpandMarked(t: string, shapes: string[], marks: string[]): string {
  if (!shapes.length) return t;
  const byMark = new Map<string, string>();
  shapes.forEach((sh, i) => byMark.set(marks[i], sh));
  const re = new RegExp(`[${escapeRe(marks.join(''))}]([0-9]+)`, 'g');
  return t.replace(re, (_m, digits: string, off: number, whole: string) => {
    const sh = byMark.get(whole[off]);
    if (!sh) return _m;
    return fill(sh, digits) ?? _m;
  });
}

/** The one contract sentence. Only the shapes actually used are named. */
export function typosContract(shapes: string[], mode: TyposMode = 'strict', marks: string[] = []): string {
  if (mode === 'marked') {
    const pairs = shapes.map((sh, i) => `${marks[i]}=${sh}`).join(', ');
    return `A mark before a digit run gives its shape; drop the mark and split (9=digit): ${pairs}.`;
  }
  const base = `Digits are packed; split each digit run to its shape (9=digit): ${shapes.join(', ')}.`;
  return mode === 'isolated' ? `${base} Leave a digit run inside a word alone.` : base;
}

interface RunRec { s: number; e: number; t: string; pure: boolean; shape: string; iso: boolean }

function scanRuns(input: string, seps: string): RunRec[] {
  const re = typosRunRe(seps);
  const out: RunRec[] = [];
  for (const m of input.matchAll(re)) {
    const t = m[0];
    const i = m.index ?? 0;
    const shape = typosShape(t);
    out.push({ s: i, e: i + t.length, t, pure: shape === t, shape, iso: !isWordChar(input[i - 1]) && !isWordChar(input[i + t.length]) });
  }
  return out;
}

type Cand = { sh: string; c: number; len: number; gross: number; net: number };

function candidates(runs: RunRec[], minCount: number, enc: EncodingName, iso: boolean, minGross: number): Cand[] {
  const counts = new Map<string, number>();
  for (const r of runs) {
    if (r.pure) continue;
    if (iso && !r.iso) continue;
    counts.set(r.shape, (counts.get(r.shape) ?? 0) + 1);
  }
  const out: Cand[] = [];
  for (const [sh, c] of counts) {
    if (c < minCount) continue;
    const len = typosLen(sh);
    if (len === 0) continue;
    const gross = countTokens(sh, enc) - countTokens('9'.repeat(len), enc);
    if (gross < minGross) continue;
    const clause = countTokens(sh + ', ', enc);
    const net = c * gross - clause;
    if (net <= 0) continue;
    out.push({ sh, c, len, gross, net });
  }
  out.sort((a, b) => b.net - a.net || a.len - b.len);
  return out;
}

/** Build the transformed text for a shape set; returns null when nothing changed. */
function build(input: string, runs: RunRec[], shapes: string[], iso: boolean, markOf: Map<string, string>): { text: string; occ: number; images: Set<number> } | null {
  const want = new Set(shapes);
  let out = '';
  let last = 0;
  let occ = 0;
  const images = new Set<number>();
  for (const r of runs) {
    if (!want.has(r.shape)) continue;
    if (iso && !r.iso) continue;
    const mk = markOf.get(r.shape) ?? '';
    out += input.slice(last, r.s) + mk;
    images.add(out.length);
    out += r.t.replace(/[^0-9]/g, '');
    last = r.e;
    occ++;
  }
  out += input.slice(last);
  return occ ? { text: out, occ, images } : null;
}

/** One admissible plan per reader rule, best estimate first. */
export function typosPlans(input: string, opts: TyposOptions = {}): TyposForward[] {
  const minCount = opts.minCount ?? 2;
  const seps = opts.seps ?? TYPOS_SEPS;
  const maxShapes = opts.maxShapes ?? 12;
  const enc = opts.enc ?? 'o200k_base';
  const runs = scanRuns(input, seps);
  if (!runs.length) return [];
  const rawTok = countTokens(input, enc);
  const plans: TyposForward[] = [];

  for (const mode of (opts.mode ? [opts.mode] : ['strict', 'isolated', 'marked'] as TyposMode[])) {
    const marked = mode === 'marked';
    const iso = mode === 'isolated';
    // a mark costs one token per occurrence, so a marked shape must lose >= 2 separator tokens
    const cands = candidates(runs, minCount, enc, iso, marked ? 2 : 1);
    if (!cands.length) continue;
    const marks: string[] = [];
    if (marked) {
      const free = TYPOS_MARKS.filter(m => !input.includes(m) && countTokens(m, enc) === 1);
      if (free.length < Math.min(maxShapes, cands.length)) continue;
    }

    const dead = new Set<string>();
    for (let pass = 0; pass < 32; pass++) {
      const takenLen = new Set<number>();
      const shapes: string[] = [];
      const markOf = new Map<string, string>();
      let mi = 0;
      for (const cd of cands) {
        if (shapes.length >= maxShapes) break;
        if (dead.has(cd.sh)) continue;
        if (!marked) { if (takenLen.has(cd.len)) continue; takenLen.add(cd.len); }   // condition (i)
        shapes.push(cd.sh);
        if (marked) {
          const free = TYPOS_MARKS.filter(m => !input.includes(m) && !marks.includes(m) && countTokens(m, enc) === 1);
          if (!free.length) { shapes.pop(); break; }
          marks.push(free[0]);
          markOf.set(cd.sh, free[0]);
          mi++;
        }
      }
      if (!shapes.length) break;
      const built = build(input, runs, shapes, iso, markOf);
      if (!built) break;
      let ok = true;
      if (!marked) {
        const declaredLen = new Set(shapes.map(typosLen));
        const bad = new Set<number>();
        for (const m of built.text.matchAll(/[0-9]+/g)) {
          const i = m.index ?? 0;
          const L = m[0].length;
          if (!declaredLen.has(L)) continue;
          if (iso && (isWordChar(built.text[i - 1]) || isWordChar(built.text[i + L]))) continue;
          if (!built.images.has(i)) bad.add(L);                    // condition (ii)
        }
        if (bad.size) { for (const sh of shapes) if (bad.has(typosLen(sh))) dead.add(sh); ok = false; }
      }
      if (ok) {
        const back = marked
          ? typosExpandMarked(built.text, shapes, marks)
          : iso ? typosExpandIsolated(built.text, shapes) : typosExpand(built.text, shapes);
        if (back === input) {
          const sentence = typosContract(shapes, mode, marks);
          const est = rawTok - countTokens(built.text, enc) - countTokens(sentence, enc);
          if (est > 0) {
            plans.push({
              text: built.text, shapes, marks: marked ? marks : [],
              counts: shapes.map(sh => cands.find(c => c.sh === sh)?.c ?? 0),
              occurrences: built.occ, mode, est,
            });
          }
        }
        break;
      }
    }
  }
  plans.sort((a, b) => b.est - a.est);
  return plans;
}

/** The chosen forward transform: the admissible plan with the best estimate. */
export function typosForward(input: string, opts: TyposOptions = {}): TyposForward | null {
  return typosPlans(input, opts)[0] ?? null;
}

/** The one-chat reading of a TYPOS message: CHIRON decode, then shape expansion. */
export function typosDecode(wire: string, shapes: string[], mode: TyposMode = 'strict', marks: string[] = [], chained = false): string {
  const d = chironDecode(wire);
  const t = mode === 'marked' ? typosExpandMarked(d, shapes, marks)
    : mode === 'isolated' ? typosExpandIsolated(d, shapes) : typosExpand(d, shapes);
  if (!chained) return t;
  /* chained arm: the reader undoes TYPOS first, then the STATHMOS @dp header */
  if (!t.startsWith(STATHMOS_MARK)) return t;
  return stathmosRestore(t) ?? t;
}

export interface TyposResult {
  codec: 'typos';
  wire: string;
  /** the full message: LAKONIKOS-D decoder prompt plus the shape sentence (transformed arm) */
  message: string;
  decoded: string;
  exact: boolean;
  mode: 'base' | 'typos';
  transformed: boolean;
  shapes: string[];
  marks: string[];
  rule: TyposMode | 'none';
  /** true when the arm is TYPOS on top of the STATHMOS fixed-decimal transform */
  chained: boolean;
  occurrences: number;
  contractTokens: number;
  messageTokens: Record<'o200k_base' | 'cl100k_base', number>;
  /** LAKONIKOS-D on the raw text: the arm the gate compares against */
  baseTokens: Record<'o200k_base' | 'cl100k_base', number>;
  inTokens: Record<'o200k_base' | 'cl100k_base', number>;
  ms: number;
  notes: string;
}

export function typosEncode(text: string, enc: EncodingName = 'o200k_base', opts: TyposOptions = {}): TyposResult {
  const t0 = Date.now();
  /* Base arm is STATHMOS, which gates itself against LAKONIKOS-D, so the floor
   * of this codec is the best of the two earlier codecs in the chain. */
  const base = stathmosEncode(text, enc);
  const inTokens = base.inTokens;
  const baseTokens = base.messageTokens;
  /* The base arm's `decoded` is the ACTUAL decode of the base wire, not the
   * input. LAKONIKOS-D reports exact=true for an input that already begins with
   * the CHIRON frame, while chironDecode of its forced-wrap wire returns
   * something else (measured X20, bench/x20/dbg-frame.ts). TYPOS does not
   * inherit that claim. */
  const baseDecoded = stathmosDecode(base.wire);
  const baseOut: TyposResult = {
    codec: 'typos', wire: base.wire, message: base.message, decoded: baseDecoded,
    exact: baseDecoded === text, mode: 'base', transformed: false, shapes: [],
    marks: [], rule: 'none', chained: base.mode === 'stathmos', occurrences: 0,
    contractTokens: 0, messageTokens: baseTokens,
    baseTokens, inTokens, ms: Date.now() - t0, notes: `base=STATHMOS(${base.mode})`,
  };
  /* CASCADE over arms, not a tournament over mechanisms. The estimate that
   * orders the plans is a source-level bound and is NOT predictive of the wire
   * cost, because DAEDALUS already absorbs much of the numeric redundancy
   * (measured X20: find-listing loses 1080 source tokens to the transform and
   * still comes back 64 tokens worse on the wire). Arms are tried best-estimate
   * first and the first one that passes both gates ships. The base arm is
   * STATHMOS, which is itself gated against LAKONIKOS-D, so
   *     M(TYPOS) <= M(STATHMOS) <= M(LAKONIKOS-D)   on every input. */
  const st = stathmosForward(text);
  const plans: Array<{ fw: TyposForward; chained: boolean }> = [];
  for (const fw of typosPlans(text, { ...opts, enc })) plans.push({ fw, chained: false });
  /* chained arm: STATHMOS strips the trailing zeros of a fixed-width decimal
   * column, TYPOS then strips the separators of the recurring shapes in the
   * REST of the table. The @dp header line is left out of the TYPOS scan, so
   * its single digits can never be mistaken for a declared shape. Reader order
   * is the reverse of the encoder: CHIRON, then shapes, then @dp. */
  if (st) {
    const nl = st.text.indexOf('\n');
    const head = nl < 0 ? st.text : st.text.slice(0, nl + 1);
    const rest = nl < 0 ? '' : st.text.slice(nl + 1);
    for (const fw of typosPlans(rest, { ...opts, enc })) {
      plans.push({ fw: { ...fw, text: head + fw.text }, chained: true });
    }
  }
  plans.sort((a, b) => b.fw.est - a.fw.est);
  const tried: string[] = [];
  for (const { fw, chained } of plans.slice(0, opts.maxPlans ?? 4)) {
    const tr = lakonikosDualEncode(fw.text, enc);
    if (tr.mode !== 'daedalus') { tried.push(`${chained ? 'chain:' : ''}${fw.mode}:wire-did-not-pay`); continue; }
    const sentence = typosContract(fw.shapes, fw.mode, fw.marks);
    const message = chained
      ? `${tr.decoderPrompt}\n${STATHMOS_CONTRACT}\n${sentence}`
      : `${tr.decoderPrompt}\n${sentence}`;
    const messageTokens = { o200k_base: countTokens(message, 'o200k_base'), cl100k_base: countTokens(message, 'cl100k_base') };
    if (messageTokens[enc] >= baseTokens[enc]) { tried.push(`${chained ? 'chain:' : ''}${fw.mode}:${messageTokens[enc]}>=${baseTokens[enc]}`); continue; }
    const decoded = typosDecode(tr.wire, fw.shapes, fw.mode, fw.marks, chained);
    if (decoded !== text) { tried.push(`${chained ? 'chain:' : ''}${fw.mode}:inverse-not-exact`); continue; }
    return {
      codec: 'typos', wire: tr.wire, message, decoded: text, exact: true, mode: 'typos', transformed: true,
      shapes: fw.shapes, marks: fw.marks, rule: fw.mode, chained, occurrences: fw.occurrences,
      contractTokens: messageTokens[enc] - tr.messageTokens[enc === 'cl100k_base' ? 'cl100k_base' : 'o200k_base'],
      messageTokens, baseTokens, inTokens, ms: Date.now() - t0,
      notes: `rule=${fw.mode}${chained ? '+stathmos' : ''}; shapes=${fw.shapes.join('|')}; occ=${fw.occurrences}; STATHMOS ${baseTokens[enc]} -> ${messageTokens[enc]} (${enc}); est=${fw.est}; arms=${plans.length}`,
    };
  }
  return { ...baseOut, notes: `${baseOut.notes}; typos arms rejected [${tried.join(', ')}]` };
}
