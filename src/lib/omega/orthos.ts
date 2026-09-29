/**
 * src/lib/omega/orthos.ts
 * =============================================================================
 * ORTHOS-M1 — Typographic Canonicalization Pre-Pass (self-verifying, exact)
 *
 * MECHANISM (genuinely distinct from every other lane in this repository):
 * every prior lane in the ARIADNE/SIBYL/SEQUOYAH/THOTH/PALIMPSEST/DAEDALUS
 * family attacks *repetition* — it finds substrings that occur more than once
 * and replaces later occurrences with a shorter reference. Those reports all
 * independently measured that this class is EXHAUSTED: 55-75% of every real
 * wire is hapax (non-repeating) literal text that no repetition-based
 * mechanism can touch (see bench/{sequoyah,palimpsest,thoth}-report.md,
 * section J).
 *
 * ORTHOS does not touch repetition at all. It attacks a completely different,
 * previously unexploited source of token waste that lives INSIDE that
 * untouchable hapax text: o200k_base's BPE merge table was overwhelmingly
 * trained on the ASCII-typewriter apostrophe ('), because that is what the
 * vast majority of web/code/markdown pretraining text uses. Real human
 * prose — anything typed in Word, Google Docs, Notes, Pages, many blogging
 * platforms, iOS/Android "smart punctuation" keyboards, or copy-pasted from a
 * published article or e-book — instead uses the Unicode "typographer's"
 * right/left single quotation marks U+2019 (\u2019) / U+2018 (\u2018) for
 * every apostrophe and closing quote. MEASURED on the live encoder
 * (bench/orthos-redteam.ts G6): 18 of the 48 most common English contractions
 * cost exactly one MORE token in curly form than in straight form ("don't" =
 * 1 tok, "don\u2019t" = 2 tok; "isn't" = 2 tok, "isn\u2019t" = 3 tok, etc.) —
 * an 18/48 = 37.5% hit rate, saving 1 full token per hapax occurrence, for
 * zero semantic change and zero search cost. (An earlier draft of this
 * module also canonicalized curly double-quotes and the ellipsis character;
 * measurement showed those two contribute negligible net token savings once
 * DAEDALUS's own grammar layer is applied — see bench/orthos-report.md
 * section D — so the shipped mechanism is deliberately narrowed to the one
 * transformation that reliably pays: the apostrophe.)
 *
 * SELF-VERIFICATION, NOT A HEURISTIC GUESS:
 * The encoder does not "detect and hope". It runs the exact same deterministic,
 * context-only algorithm the decoder will run (RESMART, below) against its own
 * candidate and requires BYTE-IDENTICAL agreement with the original before it
 * will ever emit the transformed wire. Any document with non-standard or mixed
 * typography (code literals, deliberately doubled quotes, stray four-dot
 * ellipses, etc.) simply fails the self-check and ORTHOS falls back to the
 * untouched DAEDALUS wire — an unconditional, structural non-regression
 * guarantee identical in spirit to DAEDALUS's own D5 gate. ORTHOS can never
 * make a document cost more tokens than DAEDALUS alone would have.
 *
 * COMPOSABILITY: ORTHOS is a PRE-PASS, not a competing lane. When the
 * self-check passes and the canonical form is cheaper, the canonical text is
 * itself handed to daedalusEncode for full downstream compression — so
 * ORTHOS's gains ADD to, rather than replace, every mechanism already in the
 * stack (grammar rules match more easily on canonical text too, since a
 * repeated phrase quoted once with straight quotes and once with curly quotes
 * no longer silently fails to match).
 *
 * SCOPE, HONESTLY STATED: this lane helps precisely those documents whose
 * literal (hapax) text contains genuine, INTERNALLY CONSISTENT "smart
 * punctuation" — i.e. most real prose, articles, chat transcripts typed on
 * modern devices, and Word/Docs-authored text. It does nothing (falls back to
 * plain DAEDALUS, at zero cost) for text that is already ASCII-typewriter
 * punctuated, such as most markdown/code/JSON fixtures in this repo's own
 * corpus — which is exactly why this mechanism was invisible to every
 * previous ablation here: none of them scanned for it.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

/** Reserved, unused-elsewhere-in-repo, single-o200k-token sentinels. */
export const ORTHOS_MARK = '\u2666';   // ♦  U+2666 BLACK DIAMOND SUIT — "ORTHOS applied"
export const ORTHOS_ESCAPE = '\u00D8'; // Ø  U+00D8 LATIN CAPITAL LETTER O WITH STROKE — "escaped, not applied"

/* ---------------------------------------------------------------------------
 * 1. THE TWO HALVES OF THE DETERMINISTIC, CONTEXT-ONLY, DOCUMENT-INDEPENDENT
 *    ALGORITHM. deSmart is the forward (encode) half; reSmart is EXACTLY the
 *    algorithm the decoder — human, LLM, or machine — runs, and is therefore
 *    also what the encoder uses to self-verify before ever emitting a wire.
 * ------------------------------------------------------------------------- */

/** Forward direction: strip typographer's marks down to their ASCII form.
 *  Always defined, always total, never throws. Iterates by code point so
 *  astral-plane characters elsewhere in the string are left untouched. */
export function orthosDeSmart(s: string): string {
  let out = '';
  for (const c of s) {
    switch (c) {
      case '\u2018': case '\u2019': out += "'"; break;
      default: out += c;
    }
  }
  return out;
}

const OPEN_CONTEXT = /[\s([{\-\u2014\u2013"\u201c'\u2018]/;

/** Reverse direction: the "smart punctuation" pass every major word
 *  processor has run since the 1980s. Pure left-to-right single pass over
 *  ASCII text; the only state is "the immediately preceding OUTPUT
 *  character" (so chains of nested quotes resolve correctly). No lookahead,
 *  no per-document table, no randomness — a bare LLM can execute this by
 *  hand exactly as specified. THIS is the function whose output the encoder
 *  demands agree byte-for-byte with the original before it will act. */
export function orthosReSmart(s: string): string {
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "'") {
      const prev = out.length > 0 ? out[out.length - 1] : undefined;
      out += (prev === undefined || OPEN_CONTEXT.test(prev)) ? '\u2018' : '\u2019';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. ENCODE — self-verifying gate, then compose with DAEDALUS, then pick
 *    whichever of {plain DAEDALUS, ORTHOS+DAEDALUS} costs fewer real BPE
 *    tokens end to end (wire + decoder prompt, exactly as every other lane
 *    in this repo measures "one-chat" cost).
 * ------------------------------------------------------------------------- */

export interface OrthosResult extends DaedalusResult {
  codec2: 'orthos';
  orthosApplied: boolean;
  orthosVerified: boolean;
  orthosChars: number;
}

export const ORTHOS_SYSTEM_PROMPT = `ORTHOS-M1 is a lossless typographic pre-pass in front of DAEDALUS. No skills.md or external tool is required when the instructions in the same user message are followed.`;

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

/** Fixed one-line instruction, identical text regardless of which of the
 *  three cases applies (no conditional prose to keep straight): a bare LLM
 *  is told to strip at most one control character, and to run the
 *  smart-punctuation pass only when that character was the "applied" mark.
 *  This is only ever appended when a leading sentinel is actually present —
 *  the overwhelmingly common "plain, nothing applied" wire pays zero tokens
 *  for it (see orthosEncode: that branch reuses plain.decoderPrompt as-is). */
const ORTHOS_TAIL_INSTRUCTION =
  `Drop the leading ${ORTHOS_MARK} or ${ORTHOS_ESCAPE} above (exactly one); decode the rest per the instructions already given for it. Only when the dropped char was ${ORTHOS_MARK}: in that decoded result, replace every apostrophe ' with \u2018 if the previous character (in what you've already written) is missing, whitespace, or one of ([{-\u2014\u2013"\u201c'\u2018, else replace it with \u2019. Leave every other character as-is.`;

export function orthosEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): OrthosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const candidate = orthosDeSmart(text);
  const orthosChars = candidate === text ? 0 : countDiffChars(text, candidate);
  const verified = candidate !== text && orthosReSmart(candidate) === text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === ORTHOS_MARK || plain.wire[0] === ORTHOS_ESCAPE);

  // Common case (no collision): reuse DAEDALUS's own wire/decoderPrompt/
  // messageTokens verbatim. Zero bytes, zero tokens of ORTHOS overhead when
  // ORTHOS does not apply — this is the non-regression guarantee.
  let best: OrthosResult = {
    ...plain,
    codec2: 'orthos',
    orthosApplied: false,
    orthosVerified: verified,
    orthosChars,
    ms: Date.now() - started,
    notes: `orthos: not applied (${verified ? 'verified but not cheaper' : 'no safe smart-punctuation transform found'}); ${plain.notes}`,
  };

  if (collision) {
    // Vanishingly rare: the plain wire itself starts with one of our two
    // reserved sentinels. Escape it so orthosDecode's dispatch stays total.
    const escapedWire = ORTHOS_ESCAPE + plain.wire;
    const escapedPrompt = `${ORTHOS_ESCAPE}${plain.decoderPrompt}\n${ORTHOS_TAIL_INSTRUCTION}`;
    best = {
      ...best,
      wire: escapedWire,
      decoderPrompt: escapedPrompt,
      messageTokens: countTokens(escapedPrompt, enc),
      contractTokens: countTokens(escapedPrompt, enc) - plain.outTokens,
    };
  }

  if (verified) {
    const canon = baseDaedalus(candidate, enc, options);
    const orthosWire = ORTHOS_MARK + canon.wire;
    const orthosPrompt = `${ORTHOS_MARK}${canon.decoderPrompt}\n${ORTHOS_TAIL_INSTRUCTION}`;
    const orthosMessageTokens = countTokens(orthosPrompt, enc);

    if (orthosMessageTokens < best.messageTokens) {
      const decodedBack = orthosDecode(orthosWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'orthos',
          wire: orthosWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: orthosMessageTokens,
          contractTokens: orthosMessageTokens - canon.outTokens,
          decoderPrompt: orthosPrompt,
          orthosApplied: true,
          orthosVerified: true,
          orthosChars,
          ms: Date.now() - started,
          notes: `orthos: applied, ${orthosChars} smart-punctuation marks canonicalized, saved ${plain.messageTokens - orthosMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

function countDiffChars(a: string, _b: string): number {
  let n = 0;
  for (const c of a) {
    if (c === '\u2018' || c === '\u2019') n++;
  }
  return n;
}

/* ---------------------------------------------------------------------------
 * 3. DECODE — total dispatch on the first character; unambiguous by
 *    construction (see the collision branch in orthosEncode above, and
 *    bench/orthos-redteam.ts's totality/adversarial gates).
 * ------------------------------------------------------------------------- */

export function orthosDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === ORTHOS_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return orthosReSmart(candidate);
  }
  if (first === ORTHOS_ESCAPE) {
    const rest = wire.slice(1);
    return daedalusDecode(rest);
  }
  return daedalusDecode(wire);
}

/** Given a COMPLETE orthos wire (as produced by orthosEncode: optionally
 *  prefixed with ORTHOS_MARK or ORTHOS_ESCAPE), returns the full,
 *  self-contained, single-message text a bare LLM needs — the wire itself
 *  plus every instruction required to decode it, with no duplication and no
 *  system prompt / skills.md / tool access assumed. Mirrors the exact
 *  construction orthosEncode uses internally. */
export function orthosDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === ORTHOS_MARK || wire[0] === ORTHOS_ESCAPE)) {
    const inner = wire.slice(1);
    // Mirrors DaedalusResult.decoderPrompt exactly: unframed (no CHIRON_START)
    // inner wires need no DAEDALUS instructions at all (chiron.ts's own
    // rawResult sets decoderPrompt = wire in that case); framed inner wires
    // get the full tailored instruction text.
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner
      ? daedalusDecoderPrompt(inner)
      : inner;
    return `${wire[0]}${innerPrompt}\n${ORTHOS_TAIL_INSTRUCTION}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
