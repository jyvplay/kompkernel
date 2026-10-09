/**
 * src/lib/omega/synizesis.ts
 * =============================================================================
 * SYNIZESIS — PRE-TOKENIZER BOUNDARY COLLAPSE BY ADAPTIVE SHAPE-TEMPLATE
 *             FACTORING  (exact, byte-perfect, self-describing, direct-read)
 * -----------------------------------------------------------------------------
 *
 * συνίζησις — in Greek prosody, the collapse of the boundary between two
 * adjacent vowels so that they are scanned as ONE syllable.  That is exactly
 * what this lane does to the tokenizer.
 *
 * WHY THIS LANE EXISTS (the seam every other lane in this repo walks past)
 * -----------------------------------------------------------------------------
 * Every dictionary/grammar lane in this repository (CHIRON, ARIADNE, SIBYL,
 * SEQUOYAH, PALIMPSEST, DAEDALUS, KHOROS, …) attacks ONE thing: repeated
 * CONTENT.  They are, by their own measurements, close to exhausted — 55-75%
 * of every emitted wire is literal text covered by no rule.
 *
 * SYNIZESIS attacks something orthogonal that none of them model: the
 * tokenizer's PRE-TOKENIZER, which is applied BEFORE any BPE merge and which
 * no amount of dictionary work can reach.
 *
 * o200k_base / cl100k_base split text with (essentially)
 *
 *     [^\r\n\p{L}\p{N}]?\p{L}+        |   \p{N}{1,3}
 *   | ?[^\s\p{L}\p{N}]+[\r\n]*        |  \s*[\r\n]+ | \s+(?!\S) | \s+
 *
 * and **BPE merges never cross a chunk produced by that regex**.  Two hard
 * consequences follow, both measurable with the live tokenizer:
 *
 *   (C1) A digit run is cut every 3 digits, greedily, left to right.
 *   (C2) Every letter->digit, digit->letter and alnum->punct transition is a
 *        hard merge barrier.
 *
 * So a "class-alternating literal" — an ISO timestamp, a clock time, a dotted
 * quad, a semver string, an order id, a citation range, a coordinate pair —
 * is shattered into 1- and 2-character chunks.  MEASURED (o200k_base):
 *
 *     "2026-09-10T08:34:56.789Z"   = 15 tokens   (1.60 chars/token)
 *     "20260910083456789"          =  6 tokens   (2.83 chars/token)
 *     "08:34:56"                   =  5 tokens
 *     "083456"                     =  2 tokens
 *     "192.168.100.254"            =  7 tokens
 *     "192168100254"               =  4 tokens
 *
 * English prose, by comparison, runs at ~4.1 chars/token.  The separators are
 * not merely "extra tokens" — they *destroy the density of the digits around
 * them*, and that second-order loss is the larger half of the bill.
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * 1. SCAN.  Find every maximal class-alternating literal: an alnum run, then
 *    one or more (joiner, alnum-run) pairs, containing at least one digit and
 *    no whitespace.
 *
 * 2. SHAPE.  Reduce each literal to a SHAPE by replacing its variable
 *    characters with `#` and keeping everything else verbatim:
 *
 *       2026-09-10T08:34:56.789Z   ->  shape  ####-##-##T##:##:##.###Z
 *                                      payload 20260910083456789
 *
 *    Two shape keys are generated per literal — digits-only-variable (letters
 *    stay in the skeleton, which is what unifies `…T…Z`, `Sep`, `REF-`, unit
 *    suffixes) and alnum-variable (which unifies month names and hex nibbles).
 *    Both compete; the tournament keeps whichever actually pays.
 *
 * 3. FACTOR.  Each selected shape is written ONCE, in a legend, against a
 *    one-token sigil.  Each occurrence becomes `sigil + payload`.  The payload
 *    is now a single maximal same-class run, so the pre-tokenizer stops
 *    cutting it and BPE packs it at its full density.
 *
 * 4. HEX-SHIFT.  A long lowercase-hex run (git SHA, content digest, ETag,
 *    lockfile integrity, object id) alternates letters and digits at every
 *    character and is the worst case in the whole tokenizer: MEASURED 1.72
 *    chars/token on the real digests in this repo's corpora.  Mapping the ten
 *    DIGITS onto ten LETTERS makes the run pure-letter — one chunk, dense
 *    merges — MEASURED 2.04 chars/token, a 15.7% cut on real digests with a
 *    ten-entry substitution the reader can apply by eye.
 *
 * 5. TOURNAMENT.  Identity, SYNIZESIS alone, METATRON alone (which itself
 *    contains EPISTEME/PANOPTES/DAEDALUS), and METATRON∘SYNIZESIS all run;
 *    every arm is decoded and compared byte-for-byte against the input, and
 *    the cheapest surviving arm wins.  SYNIZESIS therefore cannot be worse
 *    than the incumbent stack on any input — it is a minimum over a set that
 *    contains it.
 *
 * WHAT IS *NOT* CLAIMED
 * -----------------------------------------------------------------------------
 * - This is not a prose codec.  Narrative English with no dates, no numbers
 *   and no identifiers gets EXACTLY zero from stage 1-4 and falls through to
 *   the incumbent arm.  That is reported, not hidden.
 * - The reader-side claim is mechanical: the decode rule is "substitute the
 *   next payload character for the next `#`", which is the single most
 *   reliable operation a language model can perform on text.  It is verified
 *   here by three independent decoders (this module, a from-scratch CPython
 *   reader in bench/synizesis_decode.py, and the red-team's own re-derivation
 *   from the contract prose alone).  No LLM API was called.
 *
 * GROUNDING
 * -----------------------------------------------------------------------------
 * - tiktoken pre-tokenizer regex and the `\p{N}{1,3}` greedy left-to-right
 *   digit clause (openai/tiktoken; xenova's HF conversion gist).
 * - "Digit Tokenization: Why Commas Fix LLM Arithmetic" (2026) — documents the
 *   same chunk-boundary effect from the arithmetic-accuracy side; SYNIZESIS
 *   uses it from the cost side, in the opposite direction.
 * - Drain / Drain3 (He et al., ICWS 2017; IBM Research Haifa) — fixed-depth
 *   parse-tree log-template mining.  Drain's templates are LOSSY (variables
 *   are replaced by `<*>` and discarded).  SYNIZESIS keeps the variables, and
 *   its objective is token cost under a specific BPE pre-tokenizer rather
 *   than clustering accuracy.
 * - LTSC / meta-token dictionaries (arXiv 2506.00307) and MedTPE
 *   (arXiv 2605.11774) factor repeated CONTENT; this lane factors repeated
 *   PUNCTUATION SKELETON and re-densifies the content that survives.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode } from './daedalus';

/* ---------------------------------------------------------------------------
 * 0. WIRE CONSTANTS
 * ------------------------------------------------------------------------- */

/** Legend / body separator.  One token in o200k_base and cl100k_base. */
export const SYN_SEP = '⇒';
/** Slot character inside a shape. */
export const SYN_SLOT = '#';
/** Sigil that introduces a hex-shifted run. */
export const SYN_HEX = '≈';

/**
 * Sigil pool.  Every entry is verified to be exactly one token at module load
 * (see `oneTokenSigils`), never assumed.  Ordered so that the cheapest and
 * least text-like glyphs are handed out first.
 */
const SIGIL_POOL_RAW = [
  '◆', '◇', '●', '○', '■', '□', '▲', '▼', '►', '★', '☆', '♦', '♥', '♠', '♣',
  '†', '‡', '§', '¶', '•', '«', '»', '↑', '↓', '←', '→', '∀', '√', '∞',
  '≤', '≥', '∆', '∇', '∫', '∑', '∏', '⊕', '⊗', '⊥', '∠', '∈', '∉', '≠', '¤',
];

/** Characters allowed to act as the fixed skeleton between variable runs. */
const JOINER_RE = /[-._:/,+@|~^!?&%$*=<>()[\]{}'"\\;]/;

/** digits 0..9 -> letters g..p, so a hex run becomes a pure-letter chunk. */
export const HEX_DIGIT_MAP = 'ghijklmnop';

export interface SynizesisResult {
  codec: 'synizesis';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  /** wire + contract, the only number a user pays */
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  shapes: number;
  instances: number;
  hexRuns: number;
  winner: string;
  ms: number;
  notes: string;
}

export interface SynizesisOptions {
  budgetMs?: number;
  /** skip the composed METATRON arms (used by the ablation harness) */
  bare?: boolean;
  maxArms?: number;
}

/* ---------------------------------------------------------------------------
 * 1. SIGIL AVAILABILITY
 * ------------------------------------------------------------------------- */

const tokCache = new Map<string, number>();
/** memoised real-tokenizer count; the planner asks for the same strings a lot */
function TK(s: string, enc: EncodingName): number {
  const k = enc + '\u0001' + s;
  const hit = tokCache.get(k);
  if (hit !== undefined) return hit;
  const v = countTokens(s, enc);
  if (tokCache.size > 400000) tokCache.clear();
  tokCache.set(k, v);
  return v;
}

const sigilCache = new Map<EncodingName, string[]>();

export function oneTokenSigils(enc: EncodingName): string[] {
  const hit = sigilCache.get(enc);
  if (hit) return hit;
  const out = SIGIL_POOL_RAW.filter((c) => countTokens(c, enc) === 1);
  sigilCache.set(enc, out);
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. SPAN SCANNER
 *
 * A candidate span is a maximal run  A (J A)+  where A is [0-9A-Za-z]+ and J
 * is a single joiner character, the whole run contains at least one digit, and
 * the run is not adjacent to another alnum character.
 * ------------------------------------------------------------------------- */

export interface Span { start: number; end: number; text: string }

export function scanSpans(text: string): Span[] {
  const out: Span[] = [];
  const n = text.length;
  const isAlnum = (c: string) => c >= '0' && c <= '9' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z';
  let i = 0;
  while (i < n) {
    if (!isAlnum(text[i])) { i++; continue; }
    // maximal alternating run
    let j = i;
    let joiners = 0;
    for (;;) {
      while (j < n && isAlnum(text[j])) j++;
      // look for  joiner + alnum
      if (j < n && JOINER_RE.test(text[j]) && j + 1 < n && isAlnum(text[j + 1])) {
        joiners++;
        j++;
        continue;
      }
      break;
    }
    const seg = text.slice(i, j);
    // a span must be class-alternating enough to be worth a template: it holds
    // a digit (the classic date/time/id/number case) or it is a multi-segment
    // path/url/identifier, which the pre-tokenizer also shatters.
    if (joiners >= 1 && (/[0-9]/.test(seg) || joiners >= 2 || seg.length >= 12)) {
      out.push({ start: i, end: j, text: seg });
    }
    i = j > i ? j : i + 1;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. SHAPE KEYS
 *
 * mode 'd' — only DIGITS are variable; letters stay in the skeleton.
 * mode 'a' — every ALNUM character is variable.
 *
 * shape:   the span with each variable character replaced by SYN_SLOT
 * payload: the variable characters, in order
 * ------------------------------------------------------------------------- */

export type ShapeMode = 'd' | 'v';

/** class+length signature: digits -> '0', letters -> 'a', everything else literal */
export function maskOf(span: string): string {
  let m = '';
  for (const ch of span) {
    if (ch >= '0' && ch <= '9') m += '0';
    else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) m += 'a';
    else m += ch;
  }
  return m;
}

/** digits-variable shape (letters stay in the skeleton) */
export function digitShape(span: string): { shape: string; payload: string } | null {
  let shape = '', payload = '';
  for (const ch of span) {
    if (ch >= '0' && ch <= '9') { shape += SYN_SLOT; payload += ch; }
    else { if (ch === SYN_SLOT) return null; shape += ch; }
  }
  return { shape, payload };
}

/**
 * Position-induced shape over a group of spans that share a mask: a character
 * position is variable iff at least two members disagree there.  This is the
 * lossless analogue of Drain's position-wise template generalization — Drain
 * throws the variable away, we keep it and only factor the skeleton.
 */
export function inducedShape(members: string[]): { shape: string; payloads: string[] } | null {
  const L = members[0].length;
  for (const m of members) if (m.length !== L) return null;
  const varPos: boolean[] = new Array(L).fill(false);
  for (let i = 0; i < L; i++) {
    const c0 = members[0][i];
    const isAl = (c0 >= '0' && c0 <= '9') || (c0 >= 'a' && c0 <= 'z') || (c0 >= 'A' && c0 <= 'Z');
    if (!isAl) continue;              // separators are never variable inside a mask group
    for (let k = 1; k < members.length; k++) { if (members[k][i] !== c0) { varPos[i] = true; break; } }
  }
  let shape = '';
  for (let i = 0; i < L; i++) {
    if (varPos[i]) shape += SYN_SLOT;
    else { if (members[0][i] === SYN_SLOT) return null; shape += members[0][i]; }
  }
  if (shape.replace(/#/g, '').length === 0) return null;
  const payloads = members.map((m) => { let p = ''; for (let i = 0; i < L; i++) if (varPos[i]) p += m[i]; return p; });
  return { shape, payloads };
}

/* ---------------------------------------------------------------------------
 * 4. HEX RUNS
 * ------------------------------------------------------------------------- */

/** maximal lowercase-hex runs of at least `min` chars with >=1 digit and >=1 a-f */
export function scanHexRuns(text: string, min: number): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  const re = new RegExp(`(?<![0-9A-Za-z])[0-9a-f]{${min},}(?![0-9A-Za-z])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0];
    if (!/[0-9]/.test(s) || !/[a-f]/.test(s)) continue;
    out.push({ start: m.index, end: m.index + s.length, text: s });
  }
  return out;
}

export function hexShift(run: string): string {
  let o = '';
  for (const c of run) o += (c >= '0' && c <= '9') ? HEX_DIGIT_MAP[c.charCodeAt(0) - 48] : c;
  return o;
}

export function hexUnshift(run: string): string {
  let o = '';
  for (const c of run) {
    const k = HEX_DIGIT_MAP.indexOf(c);
    o += k >= 0 ? String(k) : c;
  }
  return o;
}

/* ---------------------------------------------------------------------------
 * 5. ENCODE — shape selection and wire construction
 * ------------------------------------------------------------------------- */

interface Cand {
  key: string;
  shape: string;
  members: number[];    // indices into spans
  payloads: string[];
  gain: number;
  legendTokens: number;
}

export interface SynRule { sigil: string | null; shape: string }
export interface SynPlan {
  shapes: SynRule[];
  hexUsed: boolean;
  body: string;
  instances: number;
  free: number;
}

/**
 * Build the SYNIZESIS body + legend for `text`.  Returns null when nothing is
 * profitable.  `enc` drives every cost decision; no heuristic estimates.
 */
export function synPlan(text: string, enc: EncodingName, opts?: { minGain?: number }): SynPlan | null {
  const minGain = opts?.minGain ?? 1;
  const sigils = oneTokenSigils(enc).filter((s) => !text.includes(s));
  if (sigils.length === 0) return null;
  if (text.includes(SYN_SEP) || text.includes(SYN_HEX)) return null;

  const spans = scanSpans(text);
  if (spans.length === 0) return null;

  // --- candidate generation ------------------------------------------------
  const probe = sigils[0];
  const cands: Cand[] = [];
  const pushCand = (key: string, shape: string, members: number[], payloads: string[]) => {
    let raw = 0, neu = 0;
    for (let k = 0; k < members.length; k++) {
      raw += TK(spans[members[k]].text, enc);
      neu += TK(probe + payloads[k], enc);
    }
    const legendTokens = TK(probe + shape + '\n', enc);
    const gain = raw - neu - legendTokens;
    if (gain >= minGain) cands.push({ key, shape, members, payloads, gain, legendTokens });
  };

  // (a) position-induced shapes, one group per mask
  const byMask = new Map<string, number[]>();
  for (let i = 0; i < spans.length; i++) {
    const m = maskOf(spans[i].text);
    const l = byMask.get(m); if (l) l.push(i); else byMask.set(m, [i]);
  }
  for (const [mask, idxs] of byMask) {
    const ind = inducedShape(idxs.map((i) => spans[i].text));
    if (!ind) continue;
    pushCand('v\u0000' + mask, ind.shape, idxs, ind.payloads);
  }

  // (b) digits-variable shapes, grouped by the literal skeleton
  const byDigit = new Map<string, { members: number[]; payloads: string[] }>();
  for (let i = 0; i < spans.length; i++) {
    const d = digitShape(spans[i].text);
    if (!d || d.payload.length === 0) continue;
    if (d.shape.replace(/#/g, '').length === 0) continue;
    const e = byDigit.get(d.shape);
    if (e) { e.members.push(i); e.payloads.push(d.payload); }
    else byDigit.set(d.shape, { members: [i], payloads: [d.payload] });
  }
  for (const [shape, e] of byDigit) pushCand('d\u0000' + shape, shape, e.members, e.payloads);

  if (cands.length === 0) {
    const hexOnly = planHexOnly(text, enc, new Set<number>(), spans);
    return hexOnly;
  }

  // --- greedy selection, re-scored against the real tokenizer --------------
  cands.sort((a, b) => b.gain - a.gain);
  const taken = new Set<number>();
  const shapeSigil = new Map<string, string>();
  const chosen: Array<{ sigil: string; shape: string; members: number[]; payloads: string[] }> = [];
  let si = 0;
  for (const c of cands) {
    const reuse = shapeSigil.get(c.shape);
    if (!reuse && si >= sigils.length) continue;
    const sig = reuse ?? sigils[si];
    const members: number[] = [], payloads: string[] = [];
    let raw = 0, neu = 0;
    for (let k = 0; k < c.members.length; k++) {
      const m = c.members[k];
      if (taken.has(m)) continue;
      members.push(m); payloads.push(c.payloads[k]);
      raw += TK(spans[m].text, enc);
      neu += TK(sig + c.payloads[k], enc);
    }
    if (members.length === 0) continue;
    const legendTokens = reuse ? 0 : TK(sig + c.shape + '\n', enc);
    if (raw - neu - legendTokens < minGain) continue;
    for (const m of members) taken.add(m);
    if (!reuse) { shapeSigil.set(c.shape, sig); si++; }
    const prev = chosen.find((x) => x.shape === c.shape && x.sigil === sig);
    if (prev) { prev.members.push(...members); prev.payloads.push(...payloads); }
    else chosen.push({ sigil: sig, shape: c.shape, members, payloads });
  }

  return assemble(text, enc, spans, chosen, taken);
}

function planHexOnly(text: string, enc: EncodingName, taken: Set<number>, spans: Span[]): SynPlan | null {
  return assemble(text, enc, spans, [], taken);
}

type Chosen = { sigil: string; shape: string; members: number[]; payloads: string[]; free?: boolean };

function buildBody(
  text: string,
  spans: Span[],
  chosen: Chosen[],
  hexRuns: Array<{ start: number; end: number; text: string }>,
): { body: string; instances: number } {
  type Edit = { start: number; end: number; out: string };
  const edits: Edit[] = [];
  for (const c of chosen) {
    for (let k = 0; k < c.members.length; k++) {
      const sp = spans[c.members[k]];
      edits.push({ start: sp.start, end: sp.end, out: (c.free ? '' : c.sigil) + c.payloads[k] });
    }
  }
  for (const h of hexRuns) edits.push({ start: h.start, end: h.end, out: SYN_HEX + hexShift(h.text) });
  edits.sort((a, b) => a.start - b.start);
  let body = '', cur = 0;
  for (const e of edits) {
    if (e.start < cur) continue;
    body += text.slice(cur, e.start) + e.out;
    cur = e.end;
  }
  body += text.slice(cur);
  return { body, instances: edits.length };
}

function mkPlan(chosen: Chosen[], hexUsed: boolean, body: string, instances: number): SynPlan {
  return {
    shapes: chosen.map((c) => ({ sigil: c.free ? null : c.sigil, shape: c.shape })),
    hexUsed, body, instances,
    free: chosen.filter((c) => c.free).length,
  };
}

/**
 * MARKER-FREE PROMOTION.
 *
 * A sigil costs exactly one token per OCCURRENCE.  That is the floor for any
 * dictionary-style binding and it is why the incumbent dictionary lanes cannot
 * profit from a literal whose raw cost is only one or two tokens above its
 * payload.  A rule can go below that floor only if the decoder can find its
 * own instances without being told where they are.
 *
 * A template whose variable positions are all DIGITS collapses to a maximal
 * digit run of a fixed length L.  If every maximal L-digit run in the emitted
 * body is an instance of that template, the sigil is redundant: "expand every
 * run of exactly L digits" identifies them.  We test that by construction —
 * promote, re-render, decode, compare bytes — and keep the promotion only when
 * the round trip is exact.  Promotions are therefore never a risk, only a win
 * of one token per occurrence.
 */
function promoteFree(text: string, enc: EncodingName, spans: Span[], chosen: Chosen[],
                     hexRuns: Array<{ start: number; end: number; text: string }>): Chosen[] {
  const eligible = chosen
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.payloads.length > 0 && c.payloads.every((p) => /^[0-9]+$/.test(p)))
    .filter(({ c }) => new Set(c.payloads.map((p) => p.length)).size === 1)
    .sort((a, b) => b.c.members.length - a.c.members.length);

  const usedLen = new Set<number>();
  for (const { c } of eligible) {
    const L = c.payloads[0].length;
    if (usedLen.has(L)) continue;
    c.free = true;
    usedLen.add(L);
    const { body, instances } = buildBody(text, spans, chosen, hexRuns);
    const trial = mkPlan(chosen, hexRuns.length > 0, body, instances);
    if (synizesisDecode(renderSynWire(trial)) !== text) { c.free = false; usedLen.delete(L); }
  }
  return chosen;
}

function assemble(
  text: string,
  enc: EncodingName,
  spans: Span[],
  chosen: Chosen[],
  taken: Set<number>,
): SynPlan | null {
  const hexCand = scanHexRuns(text, 16).filter((h) => {
    for (const m of taken) { const sp = spans[m]; if (h.start < sp.end && sp.start < h.end) return false; }
    return TK(h.text, enc) - TK(SYN_HEX + hexShift(h.text), enc) >= 1;
  });
  const hexLegend = TK(SYN_HEX + 'hex:0-9=g-p\n', enc);
  let hexGain = -hexLegend;
  for (const h of hexCand) hexGain += TK(h.text, enc) - TK(SYN_HEX + hexShift(h.text), enc);
  const hexRuns = (hexCand.length > 0 && hexGain >= 1) ? hexCand : [];

  if (chosen.length === 0 && hexRuns.length === 0) return null;

  promoteFree(text, enc, spans, chosen, hexRuns);
  const { body, instances } = buildBody(text, spans, chosen, hexRuns);
  return mkPlan(chosen, hexRuns.length > 0, body, instances);
}

/** Assemble the self-describing wire from a plan. */
export function renderSynWire(plan: SynPlan): string {
  const lines: string[] = [];
  for (const s of plan.shapes) lines.push((s.sigil ?? '') + s.shape);
  if (plan.hexUsed) lines.push(SYN_HEX + 'hex:0-9=g-p');
  lines.push(SYN_SEP);
  return lines.join('\n') + '\n' + plan.body;
}

/* ---------------------------------------------------------------------------
 * 6. DECODE
 *
 * Exactly the operation the contract describes, and nothing else.
 * ------------------------------------------------------------------------- */

export function synizesisDecode(wire: string): string {
  const sepIdx = wire.indexOf('\n' + SYN_SEP + '\n');
  let head: string, body: string;
  if (wire.startsWith(SYN_SEP + '\n')) { head = ''; body = wire.slice(SYN_SEP.length + 1); }
  else if (sepIdx >= 0) { head = wire.slice(0, sepIdx); body = wire.slice(sepIdx + 2 + SYN_SEP.length); }
  else return wire;

  const shapes = new Map<string, string>();      // sigil -> template
  const freeByLen = new Map<number, string>();   // digit-run length -> template
  let hex = false;
  for (const line of head.split('\n')) {
    if (line.length === 0) continue;
    if (line[0] === SYN_HEX) { hex = true; continue; }

    if (line.startsWith(SYN_SLOT) || isTemplateStart(line)) {
      const need = (line.match(/#/g) ?? []).length;
      if (need > 0 && !freeByLen.has(need)) freeByLen.set(need, line);
      continue;
    }
    shapes.set(line[0], line.slice(1));
  }

  const fill = (shape: string, payload: string) => {
    let k = 0, o = '';
    for (const sc of shape) o += sc === SYN_SLOT ? payload[k++] : sc;
    return o;
  };

  let out = '';
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (hex && ch === SYN_HEX) {
      let j = i + 1;
      while (j < body.length && body[j] >= 'a' && body[j] <= 'p') j++;
      out += hexUnshift(body.slice(i + 1, j));
      i = j;
      continue;
    }
    const shape = shapes.get(ch);
    if (shape !== undefined) {
      const need = (shape.match(/#/g) ?? []).length;
      let j = i + 1, got = 0;
      while (j < body.length && got < need) {
        const c = body[j];
        const alnum = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
        if (!alnum) break;
        got++; j++;
      }
      if (got === need) { out += fill(shape, body.slice(i + 1, j)); i = j; continue; }
    }
    if (freeByLen.size > 0 && ch >= '0' && ch <= '9' && (i === 0 || !(body[i - 1] >= '0' && body[i - 1] <= '9'))) {
      let j = i;
      while (j < body.length && body[j] >= '0' && body[j] <= '9') j++;
      const t = freeByLen.get(j - i);
      if (t !== undefined) { out += fill(t, body.slice(i, j)); i = j; continue; }
      out += body.slice(i, j); i = j; continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** a legend line with no leading sigil is a marker-free template */
function isTemplateStart(line: string): boolean {
  const c = line[0];
  return c === SYN_SLOT || (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
    || '-._:/,+@|~^!?&%$*=<>()[]{}\'"\\;'.includes(c);
}

/* ---------------------------------------------------------------------------
 * 7. CONTRACT
 * ------------------------------------------------------------------------- */

export const SYN_CONTRACT_SHAPES =
  'Above ⇒: symbol + pattern. Below: symbol + chars fill its # marks in order. Print restored text.';

export const SYN_CONTRACT_FREE =
  ' A pattern with no symbol applies to every digit run of that many digits.';

export const SYN_CONTRACT_HEX =
  ' After ≈, g-p mean 0-9.';

export function synContract(plan: SynPlan): string {
  return SYN_CONTRACT_SHAPES
    + (plan.free > 0 ? SYN_CONTRACT_FREE : '')
    + (plan.hexUsed ? SYN_CONTRACT_HEX : '');
}

export const SYNIZESIS_SYSTEM_PROMPT =
  'SYNIZESIS: a legend of symbol+pattern lines precedes ⇒. In the text after ⇒, each legend symbol is followed by exactly as many characters as its pattern has # marks; substitute them into the # positions, left to right, and print the restored text byte for byte.';

/* ---------------------------------------------------------------------------
 * 8. TOURNAMENT ENCODER
 * ------------------------------------------------------------------------- */

interface Arm {
  name: string;
  wire: string;
  decoded: string;
  contract: string;
  tokens: number;
}

export function synizesisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options?: SynizesisOptions,
): SynizesisResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = options?.budgetMs ?? 1500;

  if (text.length === 0) {
    return {
      codec: 'synizesis', wire: text, decoded: text, exact: true,
      inTokens, outTokens: inTokens, messageTokens: inTokens, contractTokens: 0,
      decoderPrompt: text, savingsPct: 0, shapes: 0, instances: 0, hexRuns: 0,
      winner: 'identity', ms: 0, notes: 'empty',
    };
  }

  const arms: Arm[] = [{ name: 'identity', wire: text, decoded: text, contract: '', tokens: inTokens }];

  // --- arm 1: SYNIZESIS alone ----------------------------------------------
  let plan: SynPlan | null = null;
  try { plan = synPlan(text, enc); } catch { plan = null; }
  let synWire: string | null = null;
  let synContractStr = '';
  if (plan) {
    const wire = renderSynWire(plan);
    const contract = synContract(plan);
    if (synizesisDecode(wire) === text) {
      synWire = wire; synContractStr = contract;
      arms.push({ name: 'synizesis', wire, decoded: text, contract, tokens: countTokens(wire, enc) + countTokens(contract, enc) });
    } else { plan = null; }
  }

  // --- arm 2: DAEDALUS over the SYNIZESIS wire ------------------------------
  // (the incumbent dictionary lane is strongest when the skeleton repeats; the
  //  two mechanisms genuinely compete on some inputs, so both are measured)
  if (!options?.bare && synWire) {
    try {
      const d = daedalusEncode(synWire, enc, { budgetMs: Math.max(400, budgetMs) });
      if (synizesisDecode(daedalusDecode(d.wire)) === text) {
        const contract = d.decoderPrompt.slice(d.wire.length) + '\n' + synContractStr;
        arms.push({
          name: 'daedalus∘synizesis', wire: d.wire, decoded: text, contract,
          tokens: d.messageTokens + countTokens(synContractStr, enc),
        });
      }
    } catch { /* arm unavailable */ }
  }

  // --- arm 3: SYNIZESIS over the DAEDALUS wire (residual defragmentation) ---
  if (!options?.bare) {
    try {
      const d = daedalusEncode(text, enc, { budgetMs: Math.max(400, budgetMs) });
      if (d.decoded === text) {
        const dContract = d.messageTokens - countTokens(d.wire, enc);
        arms.push({ name: 'daedalus', wire: d.wire, decoded: text, contract: d.decoderPrompt.slice(d.wire.length), tokens: d.messageTokens });
        const p2 = synPlan(d.wire, enc);
        if (p2) {
          const w2 = renderSynWire(p2);
          if (daedalusDecode(synizesisDecode(w2)) === text) {
            const c2 = synContract(p2);
            arms.push({
              name: 'synizesis∘daedalus', wire: w2, decoded: text,
              contract: c2 + '\n' + d.decoderPrompt.slice(d.wire.length),
              tokens: countTokens(w2, enc) + countTokens(c2, enc) + dContract,
            });
          }
        }
      }
    } catch { /* arm unavailable */ }
  }

  const valid = arms.filter((a) => a.decoded === text);
  valid.sort((a, b) => a.tokens - b.tokens);
  const win = valid[0];
  const wireTokens = countTokens(win.wire, enc);

  return {
    codec: 'synizesis',
    wire: win.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: wireTokens,
    messageTokens: win.tokens,
    contractTokens: win.tokens - wireTokens,
    decoderPrompt: win.contract ? win.wire + '\n' + win.contract : win.wire,
    savingsPct: inTokens > 0 ? ((inTokens - win.tokens) / inTokens) * 100 : 0,
    shapes: plan ? plan.shapes.length : 0,
    instances: plan ? plan.instances : 0,
    hexRuns: plan && plan.hexUsed ? 1 : 0,
    winner: win.name,
    ms: Date.now() - t0,
    notes: `winner=${win.name}; ${plan ? plan.shapes.length : 0} shapes (${plan ? plan.free : 0} marker-free), ${plan ? plan.instances : 0} instances`,
  };
}

/** Library decoder for whatever `synizesisEncode` emitted. */
export function synizesisFullDecode(wire: string): string {
  // metatron/daedalus wires are detected by their own markers; SYNIZESIS is
  // always the outermost transform, so it is undone last.
  const once = synizesisDecode(wire);
  try {
    const d = daedalusDecode(once);
    if (d !== once) return synizesisDecode(d);
  } catch { /* not a daedalus wire */ }
  return once;
}
