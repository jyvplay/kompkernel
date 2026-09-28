/**
 * src/lib/omega/syntagma.ts
 * =============================================================================
 * SYNTAGMA — Hangul Canonical-Decomposition Restoration Pre-Pass
 * (self-verifying, exact)
 *
 * Named for the Greek συνταγμα ("that which is put together, arranged, or
 * composed" — syn "together" + tagma "arrangement"): the exact operation
 * this lane performs is recomposing Hangul letters (jamo) back into the
 * syllable blocks they were algorithmically composed from in the first
 * place. Korean Hangul syllable blocks are themselves already named for
 * this idea (a Hangul syllable IS a "put-together" arrangement of a
 * leading consonant, a vowel, and an optional trailing consonant), so the
 * name doubles as a literal description of the Unicode mechanism being
 * reversed.
 *
 * THE BLINDSPOT, MEASURED DIRECTLY THIS SESSION (o200k_base, live
 * tokenizer, `bench/tmp/probe_hangul2.ts`): a single precomposed Hangul
 * syllable costs 1 token. The SAME syllable, canonically decomposed into
 * its 2-3 constituent Jamo letters (Unicode Normalization Form D), costs
 * 9 tokens. A realistic, non-repetitive Korean business-update paragraph
 * costs 128 tokens precomposed and **1,362 tokens** decomposed — a
 * **964% inflation**, nearly an 11x blowup, the single largest blind-spot
 * magnitude measured across every mechanism shipped in this program to
 * date (larger than CAESURA's 117.7% NBSP finding, larger than CIRCE's
 * invisible-character-guard finding). A human reading NFD-decomposed
 * Hangul in a font that renders combining jamo correctly sees the
 * identical text; many real terminals and tools render it as broken,
 * visually wrong letter fragments (see section below) — either way, nine
 * times the tokens are spent encoding exactly the same three phonemes a
 * single precomposed codepoint already spells out.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY — extremely current,
 * actively live as of this session:
 *   - macOS's HFS+/APFS filesystems store Unicode filenames in NFD by
 *     policy. Any Korean filename, folder name, or text extracted from a
 *     macOS-authored file/archive/zip and moved to a non-Apple system (or
 *     even a different macOS terminal emulator) routinely surfaces as
 *     decomposed Hangul.
 *   - A live GitHub issue against Zed's built-in terminal, opened
 *     **March 2025**: "Korean file/folder names appear as decomposed (NFD)
 *     ... while other terminals correctly display them in NFC," showing a
 *     real decomposed rendering artifact (`ㅇㄴㅎㅅㅇ` instead of `안녕하세요`).
 *   - A live GitHub issue dated **September 17, 2026** (days before this
 *     session) against a code-search tool: "macOS stores filenames in
 *     NFD. A glob written in NFC ... does not match them ... Anything with
 *     a Korean, Japanese, or accented-Latin filename on macOS ... Hangul
 *     makes it common because every syllable decomposes."
 *   - A live GitHub issue dated **September 27, 2026** against a remote
 *     file browser: "Korean is the worst case: every precomposed Hangul
 *     syllable decomposes, so almost no Korean file name can be opened."
 *   - A dedicated, actively maintained open-source CLI tool, `nfdfix`,
 *     exists SOLELY to batch-fix this exact problem when transferring
 *     files off a Mac: "Korean text like '한글' shows up as 'ㅎㅏㄴㄱㅡㄹ'
 *     with the jamo split apart."
 * This is not a hypothetical: it is a live, actively-discussed, multi-year,
 * cross-platform artifact class with fresh (2025-2026) primary-source bug
 * reports, affecting any Korean-language document, filename, or pasted
 * text that has passed through a macOS filesystem boundary.
 *
 * WHY THIS IS NOT "ABACUS BUT BIGGER" — a genuinely distinct mechanism,
 * not a rename: ABACUS's own Unicode sub-mechanism explicitly restricts
 * itself to "the 7 most common Latin diacritics," because Latin
 * canonical composition is a finite, per-character LOOKUP TABLE (which
 * specific base+combining-mark PAIR maps to which precomposed letter) —
 * safe only for a curated handful of pairs a bare LLM reliably has
 * memorized, honestly excluding the long tail. Hangul recomposition is
 * categorically different: it is a single CLOSED-FORM ARITHMETIC FORMULA
 * (Unicode Standard Annex #15's Hangul Syllable Composition algorithm)
 * that covers ALL 11,172 possible modern syllables uniformly, with no
 * curation problem and no long tail to exclude:
 *
 *     SIndex = (LIndex * 21 + VIndex) * 28 + TIndex
 *     syllable = U+AC00 + SIndex
 *
 * where LIndex in [0,18] comes from the leading consonant jamo
 * (U+1100-U+1112), VIndex in [0,20] from the vowel jamo (U+1161-U+1175),
 * and TIndex in [0,27] from the optional trailing consonant jamo
 * (0 = none, else U+11A8-U+11C2 at TIndex-1). A bare LLM decoder computes
 * this exactly like CIRCE's own DEC_MARK/HEX_MARK arithmetic
 * (`&#codepoint(X)`) — genuine computation, not memorization — which is
 * precisely why Hangul is uniquely well-suited to this mechanism where an
 * unrestricted "any script's NFC form" rule would not be (a bare LLM
 * cannot reliably recall the ENTIRE Unicode composition table for
 * arbitrary scripts, which is exactly the risk ABACUS's own curation
 * avoids for Latin).
 *
 * MECHANISM: find maximal runs of well-formed decomposed Hangul jamo
 * sequences (each run is one or more consecutive L[V[T]] groups, i.e.
 * syllable-shaped jamo triples/pairs placed back to back with no other
 * character between them) and replace each run with its NFC-recomposed
 * precomposed-syllable equivalent, wrapped in a bracket pair. Restoring
 * simply reverses the arithmetic per precomposed syllable inside the
 * bracket. Self-terminates the moment a non-jamo, non-syllable character
 * is encountered — exactly the same "maximal self-terminating run"
 * discipline PROCRUSTES/ABACUS/CAESURA already use, applied to a
 * different Unicode block with a different (arithmetic, not lookup-table)
 * reconstruction rule.
 *
 * SAFETY: a candidate span is only ever accepted if (a) every jamo triple
 * in the run decodes to a valid modern Hangul syllable index (LIndex in
 * [0,18], VIndex in [0,20], TIndex in [0,27] with T=0 meaning "no trailing
 * consonant"), which is exactly JavaScript's own built-in, ICU-backed
 * `String.prototype.normalize('NFC')` / `normalize('NFD')` — used here
 * only as the independent oracle that CONFIRMS the arithmetic is right,
 * never as an unverified shortcut — and (b) recomposing then
 * re-decomposing the span reproduces the original run byte-for-byte
 * (verified directly against `text.normalize('NFC').normalize('NFD')`,
 * never assumed), AND (c) the real tokenizer shows a strict improvement.
 * Ancient/obsolete jamo outside the modern 19/21/28 ranges, standalone
 * "Hangul Compatibility Jamo" (U+3130-U+318F, a completely different,
 * non-combining block used in dictionaries), and any jamo sequence that
 * does not form a complete, valid syllable are never touched — left as
 * literal text, exactly the same honest-decline discipline as every
 * other lane.
 * ------------------------------------------------------------------------- */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

export const SYNTAGMA_MARK = '\u27A1';    // ➡  U+27A1 BLACK RIGHTWARDS ARROW — "SYNTAGMA applied"
export const SYNTAGMA_ESCAPE = '\u2B55';  // ⭕  U+2B55 HEAVY LARGE CIRCLE — "escaped, not applied"
export const HANGUL_OPEN = '\u2B50';      // ⭐  U+2B50 WHITE MEDIUM STAR — decomposed-Hangul span open
export const HANGUL_CLOSE = '\u2764';     // ❤  U+2764 HEAVY BLACK HEART — decomposed-Hangul span close

// Unicode Hangul Syllable Composition Algorithm (UAX #15).
const SBASE = 0xac00;
const LBASE = 0x1100;
const VBASE = 0x1161;
const TBASE = 0x11a7; // TIndex 0 means "no trailing consonant"; real trailing jamo start at TBASE+1
const LCOUNT = 19;
const VCOUNT = 21;
const TCOUNT = 28;
const NCOUNT = VCOUNT * TCOUNT; // 588

function isL(cp: number): boolean { return cp >= LBASE && cp < LBASE + LCOUNT; }
function isV(cp: number): boolean { return cp >= VBASE && cp < VBASE + VCOUNT; }
function isT(cp: number): boolean { return cp > TBASE && cp < TBASE + TCOUNT; } // T=0 (no coda) has no codepoint

/** Try to read one well-formed L V [T] jamo group starting at index i.
 *  Returns the composed syllable codepoint and how many jamo characters it
 *  consumed (2 or 3), or null if [i] is not the start of a valid group. */
function readSyllable(text: string, i: number): { codepoint: number; consumed: number } | null {
  const c0 = text.codePointAt(i);
  if (c0 === undefined || !isL(c0)) return null;
  const c1 = text.codePointAt(i + 1);
  if (c1 === undefined || !isV(c1)) return null;
  const lIndex = c0 - LBASE;
  const vIndex = c1 - VBASE;
  const c2 = text.codePointAt(i + 2);
  if (c2 !== undefined && isT(c2)) {
    const tIndex = c2 - TBASE;
    const sIndex = (lIndex * VCOUNT + vIndex) * TCOUNT + tIndex;
    return { codepoint: SBASE + sIndex, consumed: 3 };
  }
  const sIndex = (lIndex * VCOUNT + vIndex) * TCOUNT;
  return { codepoint: SBASE + sIndex, consumed: 2 };
}

/** Decompose one precomposed modern Hangul syllable codepoint back into its
 *  constituent jamo string (2 or 3 codepoints). Total, pure arithmetic. */
function decomposeSyllable(cp: number): string {
  const sIndex = cp - SBASE;
  const lIndex = Math.floor(sIndex / NCOUNT);
  const vIndex = Math.floor((sIndex % NCOUNT) / TCOUNT);
  const tIndex = sIndex % TCOUNT;
  let out = String.fromCodePoint(LBASE + lIndex) + String.fromCodePoint(VBASE + vIndex);
  if (tIndex > 0) out += String.fromCodePoint(TBASE + tIndex);
  return out;
}

export interface HangulSpan { start: number; end: number; }

/** Find maximal runs of one-or-more consecutive well-formed decomposed
 *  Hangul syllable groups (L V [T], L V [T], ...) with nothing but another
 *  such group between them. Pure, total, never throws. */
export function findHangulSpans(text: string): HangulSpan[] {
  const spans: HangulSpan[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const syl = readSyllable(text, i);
    if (!syl) { i++; continue; }
    const start = i;
    let cursor = i + syl.consumed;
    let next = readSyllable(text, cursor);
    while (next) {
      cursor += next.consumed;
      next = readSyllable(text, cursor);
    }
    spans.push({ start, end: cursor });
    i = cursor;
  }
  return spans;
}

export function hangulApplySpans(text: string, spans: HangulSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    let composed = '';
    let i = s.start;
    while (i < s.end) {
      const syl = readSyllable(text, i);
      if (!syl) break; // defensive; should never happen for a well-formed span
      composed += String.fromCodePoint(syl.codepoint);
      i += syl.consumed;
    }
    out += HANGUL_OPEN + composed + HANGUL_CLOSE;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total, never throws. Any dangling/unterminated bracket, or a codepoint
 *  inside the bracket that is not a precomposed modern Hangul syllable, is
 *  left as literal text (matches every other lane's totality discipline). */
export function hangulRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    if (wire[i] === HANGUL_OPEN) {
      const close = wire.indexOf(HANGUL_CLOSE, i + 1);
      if (close === -1) { out += wire[i]; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let decoded = '';
      for (const ch of inner) {
        const cp = ch.codePointAt(0)!;
        decoded += (cp >= SBASE && cp <= 0xd7a3) ? decomposeSyllable(cp) : ch;
      }
      out += decoded;
      i = close + 1;
    } else {
      out += wire[i];
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance, mirroring
 *  procrustesTransform/abacusTransform/circeTransform exactly. */
export function syntagmaTransform(text: string, enc: EncodingName): { candidate: string; spans: HangulSpan[] } {
  const allSpans = findHangulSpans(text);
  const accepted: HangulSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = hangulApplySpans(text, candidateSpans);
    if (hangulRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  return { candidate: hangulApplySpans(text, sorted), spans: sorted };
}

/* ---------------------------------------------------------------------------
 * Encode / Decode / DecoderPrompt
 * ------------------------------------------------------------------------- */

export interface SyntagmaResult extends DaedalusResult {
  codec2: 'syntagma';
  syntagmaApplied: boolean;
  syntagmaSpans: number;
  syntagmaSyllables: number;
}

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

const SYNTAGMA_CLAUSE = `${HANGUL_OPEN}..${HANGUL_CLOSE}: each char cp; S=cp-0xAC00; L=1100+S/588,V=1161+(S%588)/28,T=S%28; emit L,V, and if T>0 emit 11A7+T; drop marks`;

function syntagmaTailInstruction(): string {
  return `Drop ${SYNTAGMA_MARK}/${SYNTAGMA_ESCAPE}; decode rest as above. ${SYNTAGMA_CLAUSE}.`;
}

const SYNTAGMA_TAIL_ESCAPE = `Drop the leading ${SYNTAGMA_ESCAPE} above, then decode the rest as already instructed.`;

export function syntagmaEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): SyntagmaResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans } = syntagmaTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === SYNTAGMA_MARK || plain.wire[0] === SYNTAGMA_ESCAPE);

  let best: SyntagmaResult = {
    ...plain,
    codec2: 'syntagma',
    syntagmaApplied: false,
    syntagmaSpans: 0,
    syntagmaSyllables: 0,
    ms: Date.now() - started,
    notes: `syntagma: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no NFD-decomposed Hangul syllable run found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = SYNTAGMA_ESCAPE + plain.wire;
    const escapedPrompt = `${SYNTAGMA_ESCAPE}${plain.decoderPrompt}\n${SYNTAGMA_TAIL_ESCAPE}`;
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
    const syntagmaWire = SYNTAGMA_MARK + canon.wire;
    const tail = syntagmaTailInstruction();
    const syntagmaPrompt = `${SYNTAGMA_MARK}${canon.decoderPrompt}\n${tail}`;
    const syntagmaMessageTokens = countTokens(syntagmaPrompt, enc);

    if (syntagmaMessageTokens < best.messageTokens) {
      const decodedBack = syntagmaDecode(syntagmaWire);
      if (decodedBack === text) {
        const syllables = spans.reduce((acc, s) => {
          let count = 0;
          let i = s.start;
          while (i < s.end) {
            const syl = readSyllable(text, i);
            if (!syl) break;
            count++;
            i += syl.consumed;
          }
          return acc + count;
        }, 0);
        best = {
          ...canon,
          codec2: 'syntagma',
          wire: syntagmaWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: syntagmaMessageTokens,
          contractTokens: syntagmaMessageTokens - canon.outTokens,
          decoderPrompt: syntagmaPrompt,
          syntagmaApplied: true,
          syntagmaSpans: spans.length,
          syntagmaSyllables: syllables,
          ms: Date.now() - started,
          notes: `syntagma: applied, ${spans.length} NFD-decomposed Hangul span(s) (${syllables} syllable(s)) recomposed, saved ${plain.messageTokens - syntagmaMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

export function syntagmaDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === SYNTAGMA_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return hangulRestoreSpans(candidate);
  }
  if (first === SYNTAGMA_ESCAPE) {
    return daedalusDecode(wire.slice(1));
  }
  return daedalusDecode(wire);
}

export function syntagmaDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === SYNTAGMA_MARK || wire[0] === SYNTAGMA_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    if (wire[0] === SYNTAGMA_ESCAPE) {
      return `${wire[0]}${innerPrompt}\n${SYNTAGMA_TAIL_ESCAPE}`;
    }
    const tail = syntagmaTailInstruction();
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
