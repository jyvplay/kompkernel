/**
 * src/lib/omega/caesura.ts
 * =============================================================================
 * CAESURA — Whitespace-Convention Canonicalization Pre-Pass (self-verifying,
 * exact)
 *
 * Named for the classical prosody term (Greek καισούρα / Latin caesura): a
 * deliberate PAUSE or GAP placed inside a line. Every mechanism in this repo
 * so far attacks a character-level orthography or escaping artifact
 * (ORTHOS: apostrophe glyph; STENTOR: sustained case; ABACUS: digit
 * grouping/Unicode composition; PROCRUSTES: letter-spacing/glyph width;
 * CIRCE: markup/percent/invisible-character escaping). None of them touch
 * the SPACE CHARACTER ITSELF. CAESURA is the first lane in this program to
 * canonicalize *which whitespace convention produced the gaps between
 * words*, rather than the words or punctuation on either side of the gap.
 *
 * THE BLINDSPOT, MEASURED DIRECTLY THIS SESSION (o200k_base, live tokenizer,
 * `bench/tmp/probe1.ts` through `probe7.ts`):
 *
 *   (1) NON-BREAKING SPACE (U+00A0) and NARROW NO-BREAK SPACE (U+202F), used
 *       in place of an ordinary space, cost ~1.13 EXTRA tokens per instance
 *       versus a genuine ASCII space -- despite rendering PIXEL-IDENTICAL to
 *       a plain space in every font and every UI a human will ever look at.
 *       A human proofreading such a document sees nothing wrong at all; the
 *       tokenizer pays a real, measurable tax on every occurrence. Applied
 *       UNIFORMLY across a realistic 192-token business article (every
 *       space replaced), this INFLATES the token count by 117.7% -- more
 *       than doubling it -- the single largest measured blind-spot
 *       magnitude of any mechanism shipped in this program to date.
 *   (2) A uniform "two spaces after sentence-ending punctuation" typing
 *       convention (the touch-typing-era habit of pressing space twice
 *       after a period/question mark/exclamation point) costs one full
 *       extra token per sentence boundary.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY:
 *   - Multiple independent, multi-year, cross-platform bug reports confirm
 *     rich-text/contenteditable editors silently converting MOST or ALL
 *     typed/pasted spaces into non-breaking spaces: Mozilla Bugzilla #194498
 *     (2003, still open 2019) and #359303 (2015-2023), a WordPress Gutenberg
 *     issue (#7474, 2018) ("If you paste text into a paragraph block ... it
 *     will convert the space into the non breaking space"), a CraftCMS
 *     Redactor issue (#383, 2022), and a live itch.io bug (#1733, opened
 *     February 2025) reporting "Nearly all spaces ... become non-breaking
 *     spaces ... completely invisible" affecting multiple independent
 *     users. This is a recurring, multi-decade, still-live class of editor
 *     bug, not a hypothetical.
 *   - Official French typography (Imprimerie Nationale convention, still
 *     documented and taught in 2024-2025 sources) REQUIRES a non-breaking
 *     or narrow non-breaking space before `; : ! ?` and inside `« »`
 *     guillemets, and Microsoft Office/LibreOffice/LaTeX auto-insert it
 *     whenever the document language is set to French (France). Any French
 *     business email, report, or chat message pasted into an English-UI
 *     tool routinely carries these.
 *   - "Two spaces after a period" is a well-documented, still-practiced
 *     convention from the touch-typing/typewriter era, a frequent subject
 *     of style-guide debate, and still the literal muscle memory of a large
 *     population of typists who learned before sentence-spacing
 *     conventions changed with proportional-width fonts.
 *
 * TWO SUB-MECHANISMS, ONE THEME (canonicalize the whitespace convention,
 * never the words):
 *
 *   (1) SPACE-LOOKALIKE SPAN CLUSTERING: find maximal contiguous runs of
 *       text where words are separated ONLY by non-breaking space (or ONLY
 *       by narrow no-break space, never mixed, never a genuine ASCII space)
 *       and wrap each run in a bracket pair identifying which target
 *       codepoint it restores to. Self-terminates at the first genuine
 *       ASCII space, newline, or document boundary -- exactly the same
 *       "maximal self-terminating run" discipline PROCRUSTES's DESTRETCH
 *       mechanism already uses for letter-spaced runs, applied to a
 *       different character class. MEASURED: converting a run of NBSP-
 *       separated words back to ASCII-space-separated words inside the
 *       bracket, then restoring via the bracket's own fixed rule, saves
 *       essentially the entire per-instance NBSP tax while paying only a
 *       2-token bracket-pair cost PER RUN (not per space) -- so a single
 *       long NBSP-corrupted paragraph is amortized by ONE pair of markers
 *       regardless of how many spaces it contains.
 *   (2) UNIFORM DOUBLE-SPACE-AFTER-SENTENCE FLAG: a whole-document,
 *       zero-per-instance-cost rule exactly analogous to CIRCE's own
 *       invisible-character guard (same proof shape: verify the pattern is
 *       PERFECTLY uniform across every instance in the document, then state
 *       one flag + one mechanical reconstruction rule instead of marking
 *       every instance). If, and only if, EVERY occurrence of
 *       `[.!?]` followed by whitespace uses EXACTLY two space characters
 *       (never one, never three or more) anywhere in the document, collapse
 *       every occurrence to one space and record a single flag bit; restore
 *       re-doubles every occurrence. A single mixed-convention document
 *       (some sentences single-spaced, some double-spaced) safely and
 *       correctly declines this mechanism entirely -- verified directly,
 *       never assumed.
 *
 * WHY SUB-MECHANISM (1) IS NOT A RENAME OF CIRCE'S INVISIBLE-CHARACTER
 * GUARD: CIRCE's guard targets characters with ZERO rendering footprint,
 * used almost exclusively for steganography/watermarking/SEO-stuffing --
 * content-free noise a human cannot see at all. CAESURA's space-lookalike
 * spans target a VISIBLE, FUNCTIONAL character (a non-breaking space is a
 * real typographic primitive meaning "do not linebreak here") that a human
 * sees as an ORDINARY, CORRECT-LOOKING space and has no reason whatsoever
 * to suspect is different -- the failure mode is an editor/export bug or a
 * legitimate foreign-language typographic convention overapplied, not an
 * adversarial payload. The detection shape (find a maximal uniform run,
 * bracket it, reverse by rule) is structurally closer to PROCRUSTES's
 * DESTRETCH/DEWIDE clustering than to CIRCE's single whole-document boolean
 * flag: CAESURA supports MULTIPLE independent spans anywhere in a document
 * (a single pasted French paragraph embedded in an otherwise-ordinary
 * English message still qualifies), not only the "every space in the
 * entire message" all-or-nothing case CIRCE requires for its own mechanism.
 *
 * SAFETY: identical discipline to every prior lane. A span is only ever
 * accepted if replaying the bracket's exact, mechanical reconstruction rule
 * reproduces the original substring byte-for-byte AND the real tokenizer
 * (never estimated) shows a strict improvement. The double-space flag is
 * only ever accepted if EVERY instance in the whole document matches the
 * uniform pattern with zero exceptions, and if the full re-expansion
 * reproduces the original document byte-for-byte.
 * ------------------------------------------------------------------------- */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

export const CAESURA_MARK = '\u2550';     // ═  U+2550 BOX DRAWINGS DOUBLE HORIZONTAL — "CAESURA applied"
export const CAESURA_ESCAPE = '\u2551';   // ║  U+2551 BOX DRAWINGS DOUBLE VERTICAL — "escaped, not applied"
export const NBSP_OPEN = '\u2580';        // ▀  U+2580 UPPER HALF BLOCK — non-breaking-space span open
export const NARROW_OPEN = '\u2584';      // ▄  U+2584 LOWER HALF BLOCK — narrow-no-break-space span open
export const SPAN_CLOSE = '\u2588';       // █  U+2588 FULL BLOCK — shared span close (both span kinds)

const NBSP = '\u00A0';
const NARROW_NBSP = '\u202F';

/* ---------------------------------------------------------------------------
 * MECHANISM 1 — space-lookalike span clustering
 * ------------------------------------------------------------------------- */

export interface NbspSpan { start: number; end: number; target: typeof NBSP | typeof NARROW_NBSP; }

/** Find maximal runs where every "word gap" inside the run is filled by
 *  EXACTLY ONE space-lookalike codepoint (never a genuine ASCII space,
 *  never a mix of NBSP and narrow-NBSP within the same run). A run must
 *  contain at least one non-whitespace character on both sides of at least
 *  one lookalike-space to be worth bracketing at all. Pure, total, never
 *  throws -- purely structural detection; the economic/verification gate
 *  lives in caesuraTransform below, matching every other lane's split.
 *
 *  Implementation: split the text on every whitespace-class character
 *  (space, tab, CR, LF, NBSP, narrow-NBSP), keeping each separator as its
 *  own array element (via a capturing-group regex split), then walk the
 *  resulting [word, sep, word, sep, word, ...] sequence left to right,
 *  extending a "run" for as long as consecutive separators are the SAME
 *  lookalike codepoint, and closing it the moment a separator is anything
 *  else (a genuine space/tab/newline, the OTHER lookalike, or the end of
 *  the document). This is a single linear pass with an explicit small
 *  state machine -- far simpler to verify correct than a bidirectional
 *  character-by-character extension, and the per-span self-verification
 *  gate in nbspTransform catches any residual edge case regardless. */
export function findNbspSpans(text: string): NbspSpan[] {
  const parts = text.split(/([ \t\r\n\u00A0\u202F])/);
  // parts alternates: word, sep, word, sep, ..., word (word chunks may be '').
  const spans: NbspSpan[] = [];
  let offset = 0;
  let runActive = false;
  let runStart = -1;
  let runEnd = -1;
  let runTarget: typeof NBSP | typeof NARROW_NBSP | null = null;
  for (let idx = 0; idx < parts.length; idx += 2) {
    const word = parts[idx];
    const wordStart = offset;
    const wordEnd = wordStart + word.length;
    offset = wordEnd;
    if (runActive) runEnd = wordEnd; // this word extends the in-progress run
    const sep = idx + 1 < parts.length ? parts[idx + 1] : null;
    const isLookalike = sep === NBSP || sep === NARROW_NBSP;
    if (isLookalike && word.length > 0 && (!runActive || sep === runTarget)) {
      if (!runActive) {
        runActive = true;
        runStart = wordStart;
        runTarget = sep as typeof NBSP | typeof NARROW_NBSP;
        runEnd = wordEnd;
      }
    } else {
      if (runActive) spans.push({ start: runStart, end: runEnd, target: runTarget as typeof NBSP | typeof NARROW_NBSP });
      runActive = false;
      runStart = -1;
      runEnd = -1;
      runTarget = null;
    }
    if (sep !== null) offset += sep.length;
  }
  if (runActive) spans.push({ start: runStart, end: runEnd, target: runTarget as typeof NBSP | typeof NARROW_NBSP });
  return spans;
}


export function nbspApplySpans(text: string, spans: NbspSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    const open = s.target === NBSP ? NBSP_OPEN : NARROW_OPEN;
    const inner = text.slice(s.start, s.end).split(s.target).join(' ');
    out += open + inner + SPAN_CLOSE;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total, never throws. Any dangling/unterminated bracket is left as
 *  literal text (matches PROCRUSTES/ABACUS/CIRCE's totality discipline). */
export function nbspRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const c = wire[i];
    if (c === NBSP_OPEN || c === NARROW_OPEN) {
      const target = c === NBSP_OPEN ? NBSP : NARROW_NBSP;
      const close = wire.indexOf(SPAN_CLOSE, i + 1);
      if (close === -1) { out += c; i++; continue; }
      const inner = wire.slice(i + 1, close);
      out += inner.split(' ').join(target);
      i = close + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance, mirroring
 *  procrustesTransform/abacusTransform/circeTransform exactly. */
export function nbspTransform(text: string, enc: EncodingName): { candidate: string; spans: NbspSpan[] } {
  const allSpans = findNbspSpans(text);
  const accepted: NbspSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    let overlap = false;
    for (let k = 0; k < candidateSpans.length - 1; k++) {
      if (candidateSpans[k].end > candidateSpans[k + 1].start) { overlap = true; break; }
    }
    if (overlap) continue;
    const candidate = nbspApplySpans(text, candidateSpans);
    if (nbspRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  return { candidate: nbspApplySpans(text, sorted), spans: sorted };
}

/* ---------------------------------------------------------------------------
 * MECHANISM 2 — uniform double-space-after-sentence flag
 * ------------------------------------------------------------------------- */

const SENTENCE_GAP_RE = /[.!?]( +)/g;

/** Returns true iff EVERY occurrence of sentence-ending punctuation
 *  followed by one-or-more spaces uses EXACTLY two spaces, with at least
 *  one such occurrence present. A single exception (one single-spaced or
 *  triple-spaced instance anywhere) declines the WHOLE document --
 *  all-or-nothing, exactly like ORTHOS's own apostrophe-style verification. */
export function isUniformDoubleSpace(text: string): boolean {
  let found = false;
  let m: RegExpExecArray | null;
  SENTENCE_GAP_RE.lastIndex = 0;
  while ((m = SENTENCE_GAP_RE.exec(text)) !== null) {
    found = true;
    if (m[1].length !== 2) return false;
  }
  return found;
}

export function collapseDoubleSpace(text: string): string {
  return text.replace(/([.!?])  (?=\S|$)/g, '$1 ');
}

export function expandDoubleSpace(text: string): string {
  return text.replace(/([.!?]) (?=\S|$)/g, '$1  ');
}

/* ---------------------------------------------------------------------------
 * Combined transform, encode, decode, decoderPrompt
 * ------------------------------------------------------------------------- */

export interface CaesuraResult extends DaedalusResult {
  codec2: 'caesura';
  caesuraApplied: boolean;
  caesuraNbspSpans: number;
  caesuraNarrowSpans: number;
  caesuraDoubleSpace: boolean;
}

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

const CAESURA_DOUBLESPACE_CLAUSE = 'after single-spaced [.!?], add one more space';
const CAESURA_NBSP_CLAUSE = `${NBSP_OPEN}..${SPAN_CLOSE}: space\u2192NBSP, drop marks`;
const CAESURA_NARROW_CLAUSE = `${NARROW_OPEN}..${SPAN_CLOSE}: space\u2192narrow-NBSP(U+202F), drop marks`;

function caesuraTailInstruction(hasNbsp: boolean, hasNarrow: boolean, hasDoubleSpace: boolean): string {
  const clauses: string[] = [];
  if (hasNbsp) clauses.push(CAESURA_NBSP_CLAUSE);
  if (hasNarrow) clauses.push(CAESURA_NARROW_CLAUSE);
  if (hasDoubleSpace) clauses.push(CAESURA_DOUBLESPACE_CLAUSE);
  const body = clauses.length > 0 ? ' ' + clauses.join('; ') + '.' : '';
  return `Drop ${CAESURA_MARK}/${CAESURA_ESCAPE}, digit after ${CAESURA_MARK}(0/1, 1=dbl-space rule); decode rest as above.${body}`;
}

const CAESURA_TAIL_ESCAPE = `Drop the leading ${CAESURA_ESCAPE} above, then decode the rest as already instructed.`;

export function caesuraEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): CaesuraResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const doubleSpaceUniform = isUniformDoubleSpace(text);
  const afterDoubleSpace = doubleSpaceUniform ? collapseDoubleSpace(text) : text;
  const doubleSpaceVerified = doubleSpaceUniform && expandDoubleSpace(afterDoubleSpace) === text;

  const { candidate, spans } = nbspTransform(afterDoubleSpace, enc);
  const nbspSpans = spans.filter((s) => s.target === NBSP).length;
  const narrowSpans = spans.filter((s) => s.target === NARROW_NBSP).length;
  const applied0 = candidate !== text || doubleSpaceVerified;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === CAESURA_MARK || plain.wire[0] === CAESURA_ESCAPE);

  let best: CaesuraResult = {
    ...plain,
    codec2: 'caesura',
    caesuraApplied: false,
    caesuraNbspSpans: 0,
    caesuraNarrowSpans: 0,
    caesuraDoubleSpace: false,
    ms: Date.now() - started,
    notes: `caesura: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no non-breaking-space span or uniform double-space convention found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = CAESURA_ESCAPE + plain.wire;
    const escapedPrompt = `${CAESURA_ESCAPE}${plain.decoderPrompt}\n${CAESURA_TAIL_ESCAPE}`;
    best = {
      ...best,
      wire: escapedWire,
      decoderPrompt: escapedPrompt,
      messageTokens: countTokens(escapedPrompt, enc),
      contractTokens: countTokens(escapedPrompt, enc) - plain.outTokens,
    };
  }

  if (applied0) {
    const canon = baseDaedalus(candidate, enc, options);
    const flag = doubleSpaceVerified ? '1' : '0';
    const caesuraWire = CAESURA_MARK + flag + canon.wire;
    const tail = caesuraTailInstruction(nbspSpans > 0, narrowSpans > 0, doubleSpaceVerified);
    const caesuraPrompt = `${CAESURA_MARK}${flag}${canon.decoderPrompt}\n${tail}`;
    const caesuraMessageTokens = countTokens(caesuraPrompt, enc);

    if (caesuraMessageTokens < best.messageTokens) {
      const decodedBack = caesuraDecode(caesuraWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'caesura',
          wire: caesuraWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: caesuraMessageTokens,
          contractTokens: caesuraMessageTokens - canon.outTokens,
          decoderPrompt: caesuraPrompt,
          caesuraApplied: true,
          caesuraNbspSpans: nbspSpans,
          caesuraNarrowSpans: narrowSpans,
          caesuraDoubleSpace: doubleSpaceVerified,
          ms: Date.now() - started,
          notes: `caesura: applied, ${nbspSpans} NBSP span(s) + ${narrowSpans} narrow-NBSP span(s)${doubleSpaceVerified ? ' + uniform double-space convention' : ''} restored, saved ${plain.messageTokens - caesuraMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

/* ---------------------------------------------------------------------------
 * DECODE — total dispatch on the first character.
 * ------------------------------------------------------------------------- */

export function caesuraDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === CAESURA_MARK) {
    const flag = wire[1];
    const rest = wire.slice(2);
    const candidate = daedalusDecode(rest);
    const restoredSpans = nbspRestoreSpans(candidate);
    return flag === '1' ? expandDoubleSpace(restoredSpans) : restoredSpans;
  }
  if (first === CAESURA_ESCAPE) {
    return daedalusDecode(wire.slice(1));
  }
  return daedalusDecode(wire);
}

/** Given a COMPLETE caesura wire, returns the full, self-contained,
 *  single-message text a bare LLM needs. Mirrors caesuraEncode exactly. */
export function caesuraDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === CAESURA_MARK || wire[0] === CAESURA_ESCAPE)) {
    if (wire[0] === CAESURA_ESCAPE) {
      const inner = wire.slice(1);
      const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
      return `${wire[0]}${innerPrompt}\n${CAESURA_TAIL_ESCAPE}`;
    }
    const flag = wire[1];
    const inner = wire.slice(2);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    const hasNbsp = inner.includes(NBSP_OPEN);
    const hasNarrow = inner.includes(NARROW_OPEN);
    const tail = caesuraTailInstruction(hasNbsp, hasNarrow, flag === '1');
    return `${wire[0]}${flag}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
