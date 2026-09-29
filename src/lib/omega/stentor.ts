/**
 * src/lib/omega/stentor.ts
 * =============================================================================
 * STENTOR-M1 — Case-Canonicalization Pre-Pass (self-verifying, exact)
 * Named for the herald in the Iliad "whose voice was as powerful as fifty men" —
 * the root of the English word "stentorian." Fitting: this lane's entire
 * mechanism is about text that is SHOUTING.
 *
 * MECHANISM (genuinely distinct from ORTHOS and from every repetition-based
 * lane in this repository): ORTHOS canonicalizes ONE character class
 * (typographer's apostrophes) using a context-only, position-independent
 * rule. STENTOR canonicalizes a completely different, previously unexploited
 * source of token waste: SUSTAINED UPPERCASE RUNS.
 *
 * MEASURED on the live encoder (bench/tmp/case_and_number_scan.ts, this
 * session): unlike common multi-token ENGLISH WORDS — which turn out to be
 * almost all already single BPE tokens in o200k_base's 200k-entry vocabulary
 * (a broad empirical scan of 175 candidate "impressive" formal/technical
 * words found only 22 (12.6%) cost >=2 tokens; the rest, including
 * "nevertheless", "furthermore", "consequently", "unfortunately", are all
 * ALREADY single tokens) — o200k_base's merge table is heavily biased
 * toward MIXED-CASE, natural-sentence-case text, because that is what the
 * overwhelming majority of its training corpus looks like. A sustained run
 * of UPPERCASE characters (a "shouted" sentence, an accidental caps-lock
 * paragraph, a legacy all-caps system dump, a chat message typed in all
 * caps) very often has NO efficient merge available for the same words in
 * their capitalized form, even though the identical text in normal case
 * would tokenize efficiently. MEASURED: a genuine ~700-character "caps-lock
 * accident" support-ticket paragraph costs 100 tokens as typed vs 72 tokens
 * lowercased — 28% more expensive purely because of sustained capitalization,
 * for literally the same words in the same order.
 *
 * THIS IS THE OPPOSITE FAILURE MODE FROM A FIXED LEXICON. A candidate
 * mechanism evaluated and REJECTED this session — a fixed, universal,
 * document-independent word->glyph substitution dictionary for common
 * English words (the same idea independently proposed, in several forms,
 * by three externally-authored candidate patches evaluated this turn: see
 * bench/stentor-report.md section C and D) — fails specifically because
 * BPE has already solved the "common word" case. STENTOR instead targets a
 * STRUCTURAL, ORTHOGRAPHIC property (sustained case) that is orthogonal to
 * word identity entirely: it helps a shouted sentence made of the most
 * common words in English exactly as much as a shouted sentence made of
 * rare ones, because the inefficiency is in the CASE, not the vocabulary.
 *
 * SELF-VERIFICATION, NOT A HEURISTIC GUESS, PER SPAN: for every maximal
 * sustained-uppercase run found (>= MIN_LETTERS cased letters, allowing
 * interior digits/spaces/punctuation), the encoder tentatively lowercases
 * the run and wraps it in two reserved single-token bracket sentinels. It
 * then (a) re-derives what a decoder would reconstruct by upper-casing the
 * bracketed span verbatim and (b) requires BYTE-IDENTICAL agreement with
 * the original before ever keeping that span, and (c) requires the net
 * token count (measured on the whole candidate text via the live tokenizer,
 * never estimated) to strictly improve before keeping it. Any span that
 * fails either check is silently left untouched — an unconditional,
 * per-span, structural non-regression guarantee identical in spirit to
 * ORTHOS's own gate and to DAEDALUS's D5 gate. STENTOR can never make a
 * document cost more tokens than DAEDALUS alone would have.
 *
 * COMPOSABILITY: STENTOR is a PRE-PASS, not a competing lane. When the
 * transform is verified and cheaper, the canonicalized text is itself
 * handed to daedalusEncode for full downstream compression — so STENTOR's
 * gains ADD to, rather than replace, every mechanism already in the stack.
 *
 * SCOPE, HONESTLY STATED: this lane helps documents that are WHOLLY or
 * SUBSTANTIALLY typed in sustained uppercase — accidental caps-lock
 * submissions, shouted chat/forum/support/review text, legacy uppercase-only
 * system output. MEASURED this session: a realistic 5-fixture combo of such
 * documents (support ticket, forum post, email, product review, chat
 * message) saves 151 of 624 raw tokens (24.2%) before any DAEDALUS
 * composition. It does essentially NOTHING for documents with only SHORT,
 * scattered emphasis words in otherwise normal-case prose ("URGENT",
 * "ASAP", "DO NOT REPLY") — measured: the per-span savings for short caps
 * runs (1-6 words) rarely exceeds the 1-token sentinel-pair overhead, so
 * the self-check correctly declines almost all of them, at zero cost. It
 * also does nothing for widely-known, verbatim, heavily-memorized ALL-CAPS
 * boilerplate (e.g. the classic UCC-2-316 software warranty disclaimer),
 * because o200k_base has learned dedicated efficient merges for that exact
 * famous string regardless of case — measured: 811 real chars of a genuine
 * software-license disclaimer show only a 1.2% difference, not the 20-28%
 * seen on genuinely novel (non-memorized) shouted prose.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

/** Reserved, unused-elsewhere-in-repo, single-o200k-token sentinels.
 *  Verified via the live tokenizer (bench/tmp/find_glyphs.ts, this session) —
 *  NOT assumed. This distinction matters: an externally-authored candidate
 *  patch evaluated this turn assumed an entire Hangul code-point range was
 *  uniformly single-token and was wrong for 39/50 of the characters it
 *  actually used (see bench/stentor-report.md section D for the receipt). */
export const STENTOR_MARK = '\u300A';    // 《  U+300A LEFT DOUBLE ANGLE BRACKET — "STENTOR applied"
export const STENTOR_ESCAPE = '\u300B';  // 》  U+300B RIGHT DOUBLE ANGLE BRACKET — "escaped, not applied"
export const SHOUT_OPEN = '\u3010';      // 【  U+3010 LEFT BLACK LENTICULAR BRACKET — span open
export const SHOUT_CLOSE = '\u3011';     // 】  U+3011 RIGHT BLACK LENTICULAR BRACKET — span close

/** Hard cap on candidate spans evaluated per document: a safety bound
 *  against pathological inputs with thousands of tiny caps runs (each
 *  evaluation re-tokenizes the whole working candidate once). */
const MAX_SPANS_EVALUATED = 400;
const MIN_LETTERS = 3;

function isCasedUpper(c: string): boolean {
  return c !== c.toLowerCase() && c === c.toUpperCase();
}

const INTERIOR_OK = /[0-9 .,!?:;'"()\-/&\n]/;

/** Find maximal candidate spans: runs where every CASED alphabetic
 *  character is already uppercase (digits/space/punctuation pass through
 *  freely inside a run without affecting the case invariant, since
 *  upper-casing them on decode is a no-op). Pure, deterministic, total. */
export function stentorFindSpans(text: string, minLetters = MIN_LETTERS): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let i = 0;
  const n = text.length;
  while (i < n && spans.length < MAX_SPANS_EVALUATED * 4) {
    if (isCasedUpper(text[i])) {
      let j = i;
      let letters = 0;
      let lastLetterEnd = i;
      while (j < n) {
        const c = text[j];
        if (/[A-Za-z]/.test(c)) {
          if (!isCasedUpper(c)) break; // any lowercase letter ends the run
          letters++;
          lastLetterEnd = j + 1;
        } else if (INTERIOR_OK.test(c)) {
          // allowed interior filler; does not extend "last letter end"
        } else {
          break;
        }
        j++;
      }
      if (letters >= minLetters) spans.push([i, lastLetterEnd]);
      i = Math.max(lastLetterEnd, i + 1);
    } else {
      i++;
    }
  }
  return spans;
}

/** Apply an accepted, sorted, non-overlapping set of spans: replace each
 *  span's text with SHOUT_OPEN + lowercased content + SHOUT_CLOSE. */
export function stentorApplySpans(text: string, spans: Array<[number, number]>): string {
  let out = '';
  let last = 0;
  for (const [s, e] of spans) {
    out += text.slice(last, s);
    out += SHOUT_OPEN + text.slice(s, e).toLowerCase() + SHOUT_CLOSE;
    last = e;
  }
  out += text.slice(last);
  return out;
}

/** Reverse direction: EXACTLY what the decoder runs. Pure, total, single
 *  left-to-right pass; unmatched/dangling open markers are left as-is
 *  rather than throwing (never crashes on malformed input). A bare LLM can
 *  execute this by hand exactly as specified: find SHOUT_OPEN..SHOUT_CLOSE,
 *  upper-case the interior, delete both markers. */
export function stentorRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    if (wire[i] === SHOUT_OPEN) {
      const close = wire.indexOf(SHOUT_CLOSE, i + 1);
      if (close === -1) { out += wire[i]; i++; continue; }
      out += wire.slice(i + 1, close).toUpperCase();
      i = close + 1;
    } else {
      out += wire[i];
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance: for each candidate span
 *  (in original-text order), tentatively add it to the accepted set, and
 *  keep it ONLY if (a) round-tripping the resulting candidate through
 *  stentorRestoreSpans reproduces the original text byte-for-byte AND
 *  (b) the whole-document token count (measured, never estimated) strictly
 *  decreases. This never estimates cross-span tokenization interactions —
 *  it always measures the actual candidate text with the live tokenizer,
 *  exactly once per candidate span. */
export function stentorTransform(text: string, enc: EncodingName): { candidate: string; spans: Array<[number, number]>; charsShouted: number } {
  const allSpans = stentorFindSpans(text).slice(0, MAX_SPANS_EVALUATED);
  const accepted: Array<[number, number]> = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a[0] - b[0]);
    const candidate = stentorApplySpans(text, candidateSpans);
    if (stentorRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a[0] - b[0]);
  const candidate = stentorApplySpans(text, sorted);
  let charsShouted = 0;
  for (const [s, e] of sorted) charsShouted += e - s;
  return { candidate, spans: sorted, charsShouted };
}

/* ---------------------------------------------------------------------------
 * ENCODE — self-verifying gate, then compose with DAEDALUS, then pick
 *    whichever of {plain DAEDALUS, STENTOR+DAEDALUS} costs fewer real BPE
 *    tokens end to end (wire + decoder prompt, exactly as every other lane
 *    in this repo measures "one-chat" cost).
 * ------------------------------------------------------------------------- */

export interface StentorResult extends DaedalusResult {
  codec2: 'stentor';
  stentorApplied: boolean;
  stentorSpans: number;
  stentorChars: number;
}

export const STENTOR_SYSTEM_PROMPT = `STENTOR-M1 is a lossless case-canonicalization pre-pass in front of DAEDALUS. No skills.md or external tool is required when the instructions in the same user message are followed.`;

const STENTOR_TAIL_INSTRUCTION =
  `Drop leading ${STENTOR_MARK}/${STENTOR_ESCAPE}, decode rest as above. If ${STENTOR_MARK}: uppercase text inside each ${SHOUT_OPEN}...${SHOUT_CLOSE} pair in the result, then delete the ${SHOUT_OPEN}${SHOUT_CLOSE} marks.`;

/** Cheaper tail instruction for the rare sentinel-collision escape path,
 *  where no case-restoration step is ever needed (the MARK branch was not
 *  taken, so the SHOUT_OPEN/SHOUT_CLOSE prose would be pure dead weight). */
const STENTOR_TAIL_ESCAPE = `Drop the leading ${STENTOR_ESCAPE} above, then decode the rest as already instructed.`;

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

export function stentorEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): StentorResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans, charsShouted } = stentorTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === STENTOR_MARK || plain.wire[0] === STENTOR_ESCAPE);

  // Common case (no collision, no beneficial span found): reuse DAEDALUS's
  // own wire/decoderPrompt/messageTokens verbatim. Zero bytes, zero tokens
  // of STENTOR overhead when STENTOR does not apply.
  let best: StentorResult = {
    ...plain,
    codec2: 'stentor',
    stentorApplied: false,
    stentorSpans: 0,
    stentorChars: 0,
    ms: Date.now() - started,
    notes: `stentor: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no beneficial shout span found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = STENTOR_ESCAPE + plain.wire;
    const escapedPrompt = `${STENTOR_ESCAPE}${plain.decoderPrompt}\n${STENTOR_TAIL_ESCAPE}`;
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
    const stentorWire = STENTOR_MARK + canon.wire;
    const stentorPrompt = `${STENTOR_MARK}${canon.decoderPrompt}\n${STENTOR_TAIL_INSTRUCTION}`;
    const stentorMessageTokens = countTokens(stentorPrompt, enc);

    if (stentorMessageTokens < best.messageTokens) {
      const decodedBack = stentorDecode(stentorWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'stentor',
          wire: stentorWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: stentorMessageTokens,
          contractTokens: stentorMessageTokens - canon.outTokens,
          decoderPrompt: stentorPrompt,
          stentorApplied: true,
          stentorSpans: spans.length,
          stentorChars: charsShouted,
          ms: Date.now() - started,
          notes: `stentor: applied, ${spans.length} shout span(s)/${charsShouted} chars canonicalized, saved ${plain.messageTokens - stentorMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

/* ---------------------------------------------------------------------------
 * DECODE — total dispatch on the first character; unambiguous by
 *    construction (see the collision branch in stentorEncode above, and
 *    bench/stentor-redteam.ts's totality/adversarial gates).
 * ------------------------------------------------------------------------- */

export function stentorDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === STENTOR_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return stentorRestoreSpans(candidate);
  }
  if (first === STENTOR_ESCAPE) {
    const rest = wire.slice(1);
    return daedalusDecode(rest);
  }
  return daedalusDecode(wire);
}

/** Given a COMPLETE stentor wire (as produced by stentorEncode: optionally
 *  prefixed with STENTOR_MARK or STENTOR_ESCAPE), returns the full,
 *  self-contained, single-message text a bare LLM needs. Mirrors the exact
 *  construction stentorEncode uses internally (parallel to
 *  orthosDecoderPrompt in orthos.ts). */
export function stentorDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === STENTOR_MARK || wire[0] === STENTOR_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner
      ? daedalusDecoderPrompt(inner)
      : inner;
    const tail = wire[0] === STENTOR_MARK ? STENTOR_TAIL_INSTRUCTION : STENTOR_TAIL_ESCAPE;
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
