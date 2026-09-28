/**
 * src/lib/omega/procrustes.ts
 * =============================================================================
 * PROCRUSTES — Geometric/Kerning Canonicalization Pre-Pass (self-verifying,
 * exact)
 *
 * Named for the myth: Procrustes forced every traveler to fit his iron bed
 * exactly, stretching the short and amputating the tall. This lane does the
 * mechanical inverse for text: it finds runs that have been artificially
 * STRETCHED WIDE (either character-by-character, via manual letter-spacing,
 * or glyph-by-glyph, via fullwidth Unicode forms) and forces them back onto
 * their one true canonical bed — normal single-byte-per-glyph ASCII — before
 * handing off to DAEDALUS. Both mechanisms are genuinely new seams, never
 * touched by ORTHOS (apostrophe typography), STENTOR (sustained-case runs),
 * or ABACUS (digit-grouping / NFD-vs-NFC composition form):
 *
 *   (1) LETTER-SPACING ("DESTRETCH"). Manually kerned-out text — every
 *       character of a word separated by a literal space, used for
 *       plain-text emphasis when bold/italic aren't available (certificates,
 *       ASCII banners, legacy typewriter conventions, terminal/README
 *       headers, spam/anti-filter text, and a well-documented OCR artifact
 *       when a scanner misreads letter-spaced or widely kerned source
 *       typography) — costs close to one BPE token PER LETTER, because
 *       isolating a character with spaces on both sides defeats every
 *       subword merge the tokenizer would otherwise use for the whole word.
 *       MEASURED (bench/tmp/letterspace_test.ts, this session, o200k_base):
 *         "IMPORTANT"                            1 tok -> "I M P O R T A N T"    9 tok
 *         "Congratulations on your promotion"    4 tok -> letter-spaced        33 tok
 *         "The quick brown fox jumps over the lazy dog"  9 tok -> spaced       43 tok
 *       This is, by a wide margin, the single largest per-instance seam
 *       magnitude measured across every lane shipped in this program so far
 *       (up to 88% of a phrase's tokens are pure kerning tax) BECAUSE the
 *       effect scales with word length (a 12-letter word costs ~12 tokens
 *       once spaced out vs. 1-2 whole), unlike every other lane's roughly
 *       constant per-instance saving.
 *
 *   (2) FULLWIDTH/HALFWIDTH UNICODE FORMS ("DEWIDE"). Text typed with a
 *       CJK input method left in "fullwidth" (zenkaku) mode renders Latin
 *       letters, digits, punctuation, and spaces using the Fullwidth ASCII
 *       Forms block (U+FF01-FF5E) and IDEOGRAPHIC SPACE (U+3000) instead of
 *       genuine ASCII — visually near-identical to a human reader but a
 *       completely different, rarely-merged codepoint range to the
 *       tokenizer. MEASURED (bench/tmp/seam_scan2.ts, this session):
 *         "Hello world"            2 tok
 *         "Ｈｅｌｌｏ　ｗｏｒｌｄ"  19 tok  (same visual content, fullwidth forms)
 *       This is a real, well-documented input-method accident (zenkaku-lock
 *       typos — the CJK-input equivalent of accidentally leaving CAPS LOCK
 *       on), and there is a perfect, well-known, exactly bijective mapping
 *       back to ASCII (subtract 0xFEE0 from each fullwidth codepoint;
 *       IDEOGRAPHIC SPACE maps to ASCII SPACE) that is at least as reliable
 *       for a bare LLM to execute as ABACUS's NFD-recompose rule, since it
 *       is pure 1:1 character substitution with no merging/clustering logic.
 *
 * Both mechanisms share one architecture and one theme (canonicalizing an
 * artificially WIDENED representation back to its natural-width original),
 * so they are bundled into a single lane exactly as ABACUS bundled
 * number-regrouping and NFD-recomposition.
 *
 * MARKING — cheapest-measured scheme per mechanism, chosen empirically
 * (bench/tmp/tail_wording*.ts, this session) rather than assumed:
 *   - DESTRETCH uses a SINGLE self-terminating marker, exactly like
 *     ABACUS's NUM_MARK for digit runs — a run of single letters/digits
 *     joined by exactly one space is, by construction of
 *     findDestretchSpans, ALWAYS immediately followed (in the untouched
 *     remainder of the original text) by either a space, a
 *     non-alphanumeric character, or end-of-string — never by another
 *     letter/digit glued with no separator. So DESTRETCH_MARK + the
 *     concatenated letters is unambiguous to reverse: consume the maximal
 *     following run of [A-Za-z0-9], space it out. MEASURED: this halves
 *     marker overhead from 2 to 1 token per span AND produced a cheaper
 *     decode clause than the bracket-pair phrasing (27 vs ~28 fixed
 *     tokens) — a pure win here because DESTRETCH documents typically
 *     contain MULTIPLE spans (a certificate has several letter-spaced
 *     lines), so the per-span saving compounds.
 *   - DEWIDE uses a bracket PAIR (open/close), even though its span is
 *     ALSO structurally self-terminating (hard-bounded at the first
 *     genuine ASCII printable/space character) — MEASURED: the bracket-
 *     pair phrasing ("in OPEN...CLOSE: ascii chars -> fullwidth, else
 *     unchanged") came out cheaper as a fixed clause (~39 tokens) than
 *     the single-marker phrasing for this mechanism (~44 tokens, because
 *     describing a per-character stopping RULE in English costs more
 *     tokens than describing a bracketed REGION), and DEWIDE documents
 *     typically contain only one contaminated region per document, so the
 *     smaller fixed-clause cost dominates over the larger per-span cost.
 *     This asymmetric choice — different marker style per mechanism,
 *     picked by direct measurement rather than a single house style —
 *     mirrors ABACUS's own mechanism (1) vs (2) marking asymmetry
 *     (single marker for numbers, bracket pair for Unicode clusters) for
 *     exactly the same reason.
 *
 * SAFETY — DESTRETCH is a pure, unconditionally-reversible structural
 * transform: `findDestretchSpans` recognizes ONLY maximal runs of single
 * ASCII letters/digits joined by exactly one literal space, where every
 * such character is ALSO NOT immediately adjacent (i.e. with no separating
 * space) to another eligible character on its far side — the lookahead
 * check that distinguishes a genuinely isolated, letter-spaced character
 * from the first letter of an ordinary multi-letter word. Because
 * restoration is simply "insert one space between every character of the
 * marked run", this mechanism has NO decode ambiguity of any kind (the
 * transform and its inverse are total, structural bijections on the
 * matched span alone). Realistic false-positive risk (e.g. "I am a good
 * day") is not a correctness risk — it is an ECONOMIC one, and the
 * mandatory per-span token-count gate (see procrustesTransform) rejects
 * any span that does not verifiably reduce the real tokenizer's count, so
 * accidental short runs of genuine 1-letter words are naturally declined
 * (their marker overhead is never amortized).
 *
 * SAFETY — DEWIDE is an identity no-op on any character outside the
 * Fullwidth ASCII Forms block + IDEOGRAPHIC SPACE, so sweeping unrelated
 * content (CJK ideographs, fullwidth currency symbols, punctuation) into a
 * span cannot corrupt it under the ENCODE direction. The real risk is on
 * DECODE: naively re-fullwidth-ing every ASCII-printable character inside
 * a span would wrongly corrupt genuine ASCII text that got swept into the
 * same span (e.g. "Ｈｅｌｌｏ, World!" — the ", World!" tail must NOT be
 * inside the marked region). `findDewideSpans` therefore hard-terminates
 * every candidate run at any genuine ASCII printable character (0x21-0x7E)
 * or genuine ASCII space (0x20) — both ambiguous on restore — while
 * allowing the run to continue through non-ASCII "safe passthrough"
 * characters (CJK ideographs, fullwidth currency signs, ideographic
 * punctuation), since the transform is a strict identity no-op on those
 * regardless of direction. Fullwidth currency symbols (U+FFE0-FFE6, a
 * non-contiguous, non-bijective-offset block) and halfwidth katakana
 * (U+FF61+, a distinct legitimate character set, not a font-width variant
 * of anything) are deliberately EXCLUDED from the target set.
 *
 * SELF-VERIFICATION, NOT A HEURISTIC GUESS, PER INSTANCE: identical
 * discipline to ABACUS/STENTOR/ORTHOS. Every candidate span (destretch or
 * dewide) is applied tentatively; the WHOLE candidate text must round-trip
 * through procrustesRestoreSpans byte-identical to the original AND the
 * real tokenizer (never estimated) must show a strict improvement before
 * that span is ever kept. PROCRUSTES can never make a document cost more
 * tokens than DAEDALUS alone would have. This same gate is also what makes
 * pre-existing, naturally-occurring sentinel characters in the SOURCE text
 * safe: if a stray literal instance of any PROCRUSTES sentinel already
 * exists in the document, the round-trip check will detect the resulting
 * corruption and the whole candidate is rejected — failing closed, not
 * open (see bench/procrustes-redteam.ts G4/G7).
 *
 * COMPOSABILITY: a PRE-PASS, not a competing lane — verified/cheaper
 * canonicalized text is handed to daedalusEncode for full downstream
 * compression, exactly like ORTHOS, STENTOR, and ABACUS. All four lanes
 * are independent, parallel pre-passes over the same DAEDALUS core (none
 * chains onto another), matching the existing registry architecture.
 *
 * SCOPE, HONESTLY STATED: fires only on documents whose cumulative
 * letter-spacing/fullwidth savings clear the fixed decode-instruction
 * cost (~26-31 tokens once wording-minimized, MEASURED) — a genuine
 * certificate/banner/ASCII-header document clears this easily (MEASURED,
 * bench/procrustes-fixtures.ts: a certificate fixture saves 28 tok / 18.9%
 * end to end, 148->120), and a zenkaku-stuck email fixture saves 150 tok /
 * 66.1% end to end (227->77) — a single short letter-spaced word embedded
 * in an otherwise-plain sentence does not clear the fixed cost, and is
 * honestly, safely declined at zero cost (see the announcementBanner /
 * congratulationsNote fixtures, both applied=false, 0 tokens saved). On a
 * realistic nine-topic hybrid combo pasted as one message, the two
 * mechanisms together save 734 tok / 52.9% versus raw (1387->653), 354 tok
 * / 35.2% versus plain DAEDALUS alone at the same fixed search budget —
 * the largest headline result measured across every lane in this program
 * to date. DEWIDE correctly declines to fire on fullwidth
 * digits/punctuation embedded inside CJK-dominant prose (MEASURED,
 * bench/procrustes-redteam.ts G7-cjk-diluted: a CJK-dominant sentence with
 * one small fullwidth fragment wrapped whole would cost MORE tokens once
 * marked, because the CJK-dominant context dilutes the small
 * fullwidth-fragment gain below the marker's own cost, and inserting a
 * sentinel glyph into dense CJK text can itself disrupt otherwise-
 * efficient CJK merges) — the gate refuses that span at zero risk,
 * honestly leaving it untouched.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

/** Reserved, unused-elsewhere-in-repo, VERIFIED single-o200k-token
 *  sentinels (bench/tmp/find_glyphs.ts, this session, scanned Dingbats /
 *  Misc Symbols / Geometric Shapes / CJK Symbols-Punctuation for chars
 *  that are exactly 1 real BPE token — several visually-plausible
 *  candidates, incl. this lane's first choice, U+2726/2727/3016-3019,
 *  turned out to cost 2 tokens each and were rejected after direct
 *  measurement, not assumed). Cross-checked via grep against every
 *  existing lane's reserved glyph set (ORTHOS's diamond, STENTOR's angle/
 *  lenticular brackets, ABACUS's postal mark / circle / triangle / angle
 *  brackets) before adoption. */
export const PROCRUSTES_MARK = '\u2605';    // ★ U+2605 BLACK STAR — "PROCRUSTES applied"
export const PROCRUSTES_ESCAPE = '\u2606';  // ☆ U+2606 WHITE STAR — "escaped, not applied"
export const DESTRETCH_MARK = '\u300E';     // 『 U+300E LEFT WHITE CORNER BRACKET — letter-spacing span prefix (self-terminating)
export const DEWIDE_OPEN = '\u3014';        // 〔 U+3014 LEFT TORTOISE SHELL BRACKET — fullwidth span open
export const DEWIDE_CLOSE = '\u3015';       // 〕 U+3015 RIGHT TORTOISE SHELL BRACKET — fullwidth span close

const MAX_SPANS_EVALUATED = 400;

/* ---------------------------------------------------------------------------
 * MECHANISM 1: letter-spacing ("DESTRETCH")
 * ------------------------------------------------------------------------- */

export interface DestretchSpan {
  kind: 'destretch';
  start: number;
  end: number;
  chars: string; // the letters/digits with spaces removed
}

const SPACEABLE = /[A-Za-z0-9]/;
function isSpaceable(ch: string | undefined): boolean {
  return ch !== undefined && SPACEABLE.test(ch);
}

/** Find maximal runs of single ASCII letters/digits joined by exactly one
 *  literal space, where each character in the run is verified NOT to be
 *  immediately adjacent (i.e. attached with no separating space) to another
 *  eligible character on its far side — the check that tells a genuinely
 *  isolated, letter-spaced character apart from the first letter of an
 *  ordinary multi-letter word. Purely structural; needs no economic
 *  reasoning to be exact (see module docstring's SAFETY section). Every
 *  emitted span is guaranteed self-terminating: the original character
 *  immediately after `end` is never itself a letter/digit glued with no
 *  separator (see module docstring's MARKING section for the proof). */
export function findDestretchSpans(text: string): DestretchSpan[] {
  const spans: DestretchSpan[] = [];
  const n = text.length;
  let i = 0;
  while (i < n && spans.length < MAX_SPANS_EVALUATED) {
    const prev = i > 0 ? text[i - 1] : undefined;
    if (isSpaceable(text[i]) && !isSpaceable(prev)) {
      let chars = text[i];
      let j = i + 1;
      // Extend while: next is a single space, followed by an eligible char,
      // and THAT char is not itself immediately glued (no space) to another
      // eligible char (which would mean it starts an ordinary word instead).
      while (
        j + 1 < n &&
        text[j] === ' ' &&
        isSpaceable(text[j + 1]) &&
        !isSpaceable(text[j + 2])
      ) {
        chars += text[j + 1];
        j += 2;
      }
      if (chars.length >= 2) {
        spans.push({ kind: 'destretch', start: i, end: j, chars });
        i = j;
        continue;
      }
    }
    i++;
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 2: fullwidth/halfwidth + ideographic-space canonicalization
 * ("DEWIDE")
 * ------------------------------------------------------------------------- */

export interface DewideSpan {
  kind: 'dewide';
  start: number;
  end: number;
}

const FULLWIDTH_LO = 0xff01;
const FULLWIDTH_HI = 0xff5e;
const IDEOGRAPHIC_SPACE = 0x3000;
const ASCII_PRINTABLE_LO = 0x21;
const ASCII_PRINTABLE_HI = 0x7e;
const ASCII_SPACE = 0x20;

function isFullwidthTarget(cp: number): boolean {
  return (cp >= FULLWIDTH_LO && cp <= FULLWIDTH_HI) || cp === IDEOGRAPHIC_SPACE;
}
function isGenuineAsciiPrintableOrSpace(cp: number): boolean {
  return cp === ASCII_SPACE || (cp >= ASCII_PRINTABLE_LO && cp <= ASCII_PRINTABLE_HI);
}

function toHalfwidth(ch: string): string {
  const cp = ch.codePointAt(0)!;
  if (cp === IDEOGRAPHIC_SPACE) return ' ';
  if (cp >= FULLWIDTH_LO && cp <= FULLWIDTH_HI) return String.fromCodePoint(cp - 0xfee0);
  return ch;
}
function toFullwidth(ch: string): string {
  const cp = ch.codePointAt(0)!;
  if (cp === ASCII_SPACE) return '\u3000';
  if (cp >= ASCII_PRINTABLE_LO && cp <= ASCII_PRINTABLE_HI) return String.fromCodePoint(cp + 0xfee0);
  return ch;
}

/** Find maximal runs containing at least one fullwidth-target character,
 *  extended through adjacent "safe passthrough" characters (anything that
 *  is not genuine ASCII-printable/space, since the transform is a strict
 *  identity no-op on those either way), and HARD-TERMINATED at any genuine
 *  ASCII printable character or genuine ASCII space (both ambiguous on
 *  restore — see module docstring's SAFETY section). Every emitted span is
 *  guaranteed self-terminating: `end` always points at either a genuine
 *  ASCII printable/space character or end-of-string. */
export function findDewideSpans(text: string): DewideSpan[] {
  const spans: DewideSpan[] = [];
  const n = text.length;
  let i = 0;
  while (i < n && spans.length < MAX_SPANS_EVALUATED) {
    const cp0 = text.codePointAt(i)!;
    if (isGenuineAsciiPrintableOrSpace(cp0)) { i++; continue; }
    // Candidate run start (either a target char or a safe passthrough char).
    let j = i;
    let sawTarget = false;
    while (j < n) {
      const cp = text.codePointAt(j)!;
      if (isGenuineAsciiPrintableOrSpace(cp)) break; // hard boundary
      if (isFullwidthTarget(cp)) sawTarget = true;
      j++;
    }
    if (sawTarget) {
      spans.push({ kind: 'dewide', start: i, end: j });
    }
    i = j > i ? j : i + 1;
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * Combined apply / restore / self-verifying transform
 * ------------------------------------------------------------------------- */

export type ProcrustesSpan = DestretchSpan | DewideSpan;

export function procrustesApplySpans(text: string, spans: ProcrustesSpan[]): string {
  let out = '';
  let last = 0;
  for (const s of spans) {
    out += text.slice(last, s.start);
    if (s.kind === 'destretch') {
      out += DESTRETCH_MARK + s.chars;
    } else {
      const region = text.slice(s.start, s.end);
      out += DEWIDE_OPEN + Array.from(region).map(toHalfwidth).join('') + DEWIDE_CLOSE;
    }
    last = s.end;
  }
  out += text.slice(last);
  return out;
}

/** Reverse direction: EXACTLY what the decoder runs. Pure, total, single
 *  left-to-right pass; a marker with nothing eligible following it (e.g.
 *  dangling at end-of-string) is simply dropped with zero further effect,
 *  never throwing. A bare LLM can execute this by hand exactly as
 *  specified in the tail instruction below. */
export function procrustesRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    if (wire[i] === DESTRETCH_MARK) {
      let j = i + 1;
      while (j < n && SPACEABLE.test(wire[j])) j++;
      out += Array.from(wire.slice(i + 1, j)).join(' ');
      i = j;
    } else if (wire[i] === DEWIDE_OPEN) {
      const close = wire.indexOf(DEWIDE_CLOSE, i + 1);
      if (close === -1) { out += wire[i]; i++; continue; }
      out += Array.from(wire.slice(i + 1, close)).map(toFullwidth).join('');
      i = close + 1;
    } else {
      out += wire[i];
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance: for each candidate span
 *  (destretch and dewide interleaved by position), tentatively add it to
 *  the accepted set and keep it ONLY if (a) round-tripping through
 *  procrustesRestoreSpans reproduces the original text byte-for-byte AND
 *  (b) the whole-document token count (measured, never estimated) strictly
 *  decreases. Mirrors abacusTransform / stentorTransform exactly. */
export function procrustesTransform(
  text: string,
  enc: EncodingName,
): { candidate: string; spans: ProcrustesSpan[]; destretchSpans: number; dewideSpans: number } {
  const allSpans: ProcrustesSpan[] = [...findDestretchSpans(text), ...findDewideSpans(text)].sort(
    (a, b) => a.start - b.start,
  );
  const accepted: ProcrustesSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    let overlap = false;
    for (let k = 0; k < candidateSpans.length - 1; k++) {
      if (candidateSpans[k].end > candidateSpans[k + 1].start) { overlap = true; break; }
    }
    if (overlap) continue;
    const candidate = procrustesApplySpans(text, candidateSpans);
    if (procrustesRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  const candidate = procrustesApplySpans(text, sorted);
  return {
    candidate,
    spans: sorted,
    destretchSpans: sorted.filter((s) => s.kind === 'destretch').length,
    dewideSpans: sorted.filter((s) => s.kind === 'dewide').length,
  };
}

/* ---------------------------------------------------------------------------
 * ENCODE — self-verifying gate, then compose with DAEDALUS, then pick
 *    whichever of {plain DAEDALUS, PROCRUSTES+DAEDALUS} costs fewer real
 *    BPE tokens end to end (wire + decoder prompt).
 * ------------------------------------------------------------------------- */

export interface ProcrustesResult extends DaedalusResult {
  codec2: 'procrustes';
  procrustesApplied: boolean;
  procrustesDestretchSpans: number;
  procrustesDewideSpans: number;
}

export const PROCRUSTES_SYSTEM_PROMPT = `PROCRUSTES is a lossless letter-spacing & fullwidth/halfwidth Unicode-form canonicalization pre-pass in front of DAEDALUS. No skills.md or external tool is required when the instructions in the same user message are followed.`;

/** Wording chosen for minimum fixed token cost (measured,
 *  bench/tmp/tail_wording.ts) while remaining unambiguous: both clauses
 *  describe a total, mechanical, per-character rule with no judgment
 *  calls, so a short imperative sentence is sufficient for a bare LLM to
 *  execute exactly. */
const PROCRUSTES_DESTRETCH_CLAUSE = `${DESTRETCH_MARK}X: space out X's letters, drop ${DESTRETCH_MARK}`;
const PROCRUSTES_DEWIDE_CLAUSE = `${DEWIDE_OPEN}X${DEWIDE_CLOSE}: ascii in X +0xFEE0 (space->\u3000), else unchanged; drop brackets`;

/** Adaptive tail instruction: includes ONLY the restoration clause(s) for
 *  the mechanism(s) actually used in this wire, exactly as ABACUS does. */
function procrustesTailInstruction(hasDestretch: boolean, hasDewide: boolean): string {
  const clauses = [hasDestretch && PROCRUSTES_DESTRETCH_CLAUSE, hasDewide && PROCRUSTES_DEWIDE_CLAUSE].filter(Boolean) as string[];
  const body = clauses.length > 0 ? `If ${PROCRUSTES_MARK}: ${clauses.join('; ')}.` : '';
  return `Drop ${PROCRUSTES_MARK}/${PROCRUSTES_ESCAPE}; decode rest as above.${body ? ' ' + body : ''}`;
}

/** Cheaper tail instruction for the rare sentinel-collision escape path,
 *  where neither restoration step is ever needed. */
const PROCRUSTES_TAIL_ESCAPE = `Drop the leading ${PROCRUSTES_ESCAPE} above, then decode the rest as already instructed.`;

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

export function procrustesEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): ProcrustesResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans, destretchSpans, dewideSpans } = procrustesTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === PROCRUSTES_MARK || plain.wire[0] === PROCRUSTES_ESCAPE);

  // Common case (no collision, no beneficial span found): reuse DAEDALUS's
  // own wire/decoderPrompt/messageTokens verbatim. Zero bytes, zero tokens
  // of PROCRUSTES overhead when PROCRUSTES does not apply.
  let best: ProcrustesResult = {
    ...plain,
    codec2: 'procrustes',
    procrustesApplied: false,
    procrustesDestretchSpans: 0,
    procrustesDewideSpans: 0,
    ms: Date.now() - started,
    notes: `procrustes: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no beneficial letter-spacing/fullwidth span found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = PROCRUSTES_ESCAPE + plain.wire;
    const escapedPrompt = `${PROCRUSTES_ESCAPE}${plain.decoderPrompt}\n${PROCRUSTES_TAIL_ESCAPE}`;
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
    const procrustesWire = PROCRUSTES_MARK + canon.wire;
    const tail = procrustesTailInstruction(destretchSpans > 0, dewideSpans > 0);
    const procrustesPrompt = `${PROCRUSTES_MARK}${canon.decoderPrompt}\n${tail}`;
    const procrustesMessageTokens = countTokens(procrustesPrompt, enc);

    if (procrustesMessageTokens < best.messageTokens) {
      const decodedBack = procrustesDecode(procrustesWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'procrustes',
          wire: procrustesWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: procrustesMessageTokens,
          contractTokens: procrustesMessageTokens - canon.outTokens,
          decoderPrompt: procrustesPrompt,
          procrustesApplied: true,
          procrustesDestretchSpans: destretchSpans,
          procrustesDewideSpans: dewideSpans,
          ms: Date.now() - started,
          notes: `procrustes: applied, ${destretchSpans} letter-spacing span(s)/${dewideSpans} fullwidth span(s) canonicalized, saved ${plain.messageTokens - procrustesMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

/* ---------------------------------------------------------------------------
 * DECODE — total dispatch on the first character; unambiguous by
 *    construction (see the collision branch in procrustesEncode above, and
 *    bench/procrustes-redteam.ts's totality/adversarial gates).
 * ------------------------------------------------------------------------- */

export function procrustesDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === PROCRUSTES_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return procrustesRestoreSpans(candidate);
  }
  if (first === PROCRUSTES_ESCAPE) {
    const rest = wire.slice(1);
    return daedalusDecode(rest);
  }
  return daedalusDecode(wire);
}

/** Given a COMPLETE procrustes wire (as produced by procrustesEncode:
 *  optionally prefixed with PROCRUSTES_MARK or PROCRUSTES_ESCAPE), returns
 *  the full, self-contained, single-message text a bare LLM needs. Mirrors
 *  the exact construction procrustesEncode uses internally. */
export function procrustesDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === PROCRUSTES_MARK || wire[0] === PROCRUSTES_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner
      ? daedalusDecoderPrompt(inner)
      : inner;
    const tail = wire[0] === PROCRUSTES_MARK
      ? procrustesTailInstruction(inner.includes(DESTRETCH_MARK), inner.includes(DEWIDE_OPEN))
      : PROCRUSTES_TAIL_ESCAPE;
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
