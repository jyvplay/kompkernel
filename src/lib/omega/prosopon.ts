/**
 * src/lib/omega/prosopon.ts
 * =============================================================================
 * PROSOPON — Mojibake (Wrong-Codepage) Restoration Pre-Pass (self-verifying,
 * exact)
 *
 * Named for the Greek πρόσωπον ("face," specifically the MASK an actor wore
 * in classical theater to play a role not their own — the root of the
 * English word "person"). This is the exact phenomenon being reversed:
 * every byte of a UTF-8-encoded character has been forced to wear the
 * WRONG mask — reinterpreted one byte at a time as if it were a single
 * Windows-1252 character — and this lane restores each byte's true face.
 *
 * THE BLINDSPOT, MEASURED DIRECTLY THIS SESSION (o200k_base, live
 * tokenizer, `bench/tmp/probe_mojibake2.ts`): "café" (correct UTF-8) costs
 * a handful of tokens; the SAME bytes, decoded one byte at a time as
 * Windows-1252 instead of UTF-8, render as "cafÃ©" and cost far more --
 * measured 25 tokens correct vs. 48 mojibake'd on an accent-heavy test
 * sentence (92% inflation), and 83 vs. 138 tokens (66.3% inflation) on a
 * realistic mixed English/French/German business article. A human reading
 * "cafÃ©" or "â€™" instantly recognizes the universally-known "mojibake"
 * garbage-character pattern; a subword tokenizer pays full, uncomprehending
 * price for every stray "Ã", "â", and "€" byte-ghost.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY: this is arguably the
 * single most famous and most universally-recognized text-corruption
 * pattern in the history of computing, with a dedicated, widely-used
 * Japanese-derived name ("mojibake," 文字化け) precisely because it is so
 * common. It arises whenever UTF-8-encoded bytes are decoded with the
 * legacy Windows-1252 (or plain Latin-1/ISO-8859-1) code page instead --
 * a database column stored as "latin1" holding UTF-8 bytes, a mail client
 * or RSS reader guessing the wrong charset, a CSV export/import round trip
 * through a tool defaulting to a legacy encoding, or a web response served
 * without (or with an incorrect) charset header. This class of bug is so
 * well-known that a dedicated open-source Python library, `ftfy` ("fixes
 * text for you"), exists specifically to detect and reverse it at scale,
 * and it remains a top, perennial Stack Overflow topic.
 *
 * MECHANISM: find maximal runs of text in which EVERY character's
 * codepoint is representable as a single Windows-1252 byte value (ASCII
 * 0x00-0x7F, Latin-1 upper range 0xA0-0xFF identically, or one of the ~27
 * specific Windows-1252 upper-range remaps 0x80-0x9F). Within such a run,
 * reinterpret each character as that byte value, concatenate the bytes,
 * and attempt to decode the byte sequence as UTF-8. If decoding succeeds
 * STRICTLY (the decoded string, re-encoded to UTF-8, reproduces the exact
 * same byte sequence -- ruling out replacement characters or partial/lossy
 * decodes) AND the decoded string differs from the original run (real
 * multi-byte content was actually found, not just accidentally
 * byte-representable ASCII), the run is genuine mojibake: replace it with
 * its correctly-decoded form, wrapped in a bracket pair. A single bracket
 * naturally spans an ENTIRE corrupted message (or a whole embedded
 * excerpt) in one shot, because ordinary ASCII characters are trivially
 * representable as WIndows-1252 bytes AND trivially round-trip through
 * UTF-8 decoding as themselves -- so the maximal-run boundary is set only
 * by genuinely non-representable content (CJK, Hangul, emoji, box-drawing
 * sentinels), not by every individual corrupted character. This gives the
 * SAME O(1)-per-document amortization CIRCE's own invisible-character
 * guard achieves for its narrower "every space" case, but reached here
 * through ordinary span-clustering rather than a special uniform-flag rule
 * -- because mojibake corruption, when it happens, is a whole-byte-stream
 * decoding accident that naturally affects a message's full run of
 * representable text, not a scattered, engineered pattern.
 *
 * WHY THIS IS SAFE DESPITE NOT BEING A "PURE" REVERSIBLE ENCODING LIKE
 * PERCENT-ENCODING: unlike a percent-escape (which unambiguously marks
 * itself as escaped), Windows-1252-representable text COULD occasionally,
 * coincidentally, be genuine content rather than corruption (e.g. a
 * document that legitimately contains "café" is not mojibake -- it is
 * already correct, and correctly produces ZERO candidate spans here,
 * because "café"'s own bytes do not happen to form a valid, DIFFERENT
 * UTF-8 decode). The detector's核心 structural test -- "do these bytes
 * decode as valid, ROUND-TRIPPING UTF-8, and is the result actually
 * different" -- is what makes false positives vanishingly unlikely: UTF-8's
 * multi-byte lead/continuation bit patterns are specific enough that
 * ordinary accented Latin prose essentially never coincidentally satisfies
 * them. And exactly like every other lane in this repo, the final gate is
 * never trust, always verify: a span is only ever accepted if replaying
 * the reconstruction rule byte-for-byte reproduces the original text.
 * Even in a maximally adversarial, contrived coincidence, the round-trip
 * check means the contract can never be violated -- only, at worst, a
 * span that need not have fired declines to fire.
 *
 * THE RECONSTRUCTION RULE ITSELF IS ARITHMETIC A BARE LLM ALREADY
 * EXECUTES ELSEWHERE IN THIS PROGRAM: "take a character, compute its UTF-8
 * byte encoding" is the EXACT operation CIRCE's own percent-encoding
 * mechanism (PCT_MARK) already requires a decoder to perform for its
 * `%-encode X uppercase` clause -- reused here verbatim, just rendered as
 * raw Windows-1252 characters (mapping each byte to its Latin-1-identical
 * codepoint, with a small, explicitly-listed exception table for the 27
 * legacy Windows-1252 remaps in the 0x80-0x9F range -- listed ONLY when a
 * document's accepted spans actually use one of those specific bytes, the
 * same "pay only for what you use" clause discipline CIRCE already
 * follows for its own four sub-mechanisms).
 * ------------------------------------------------------------------------- */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

export const PROSOPON_MARK = '\u20AA';    // ₪  U+20AA NEW SHEQEL SIGN — "PROSOPON applied"
export const PROSOPON_ESCAPE = '\u20B9';  // ₹  U+20B9 INDIAN RUPEE SIGN — "escaped, not applied"
export const MOJIBAKE_OPEN = '\u2800';    // ⠀  U+2800 BRAILLE PATTERN BLANK — mojibake span open
export const MOJIBAKE_CLOSE = '\u33A1';   // ㎡  U+33A1 SQUARE M SQUARED — mojibake span close

// The 27 characters Windows-1252 assigns to byte range 0x80-0x9F instead of
// the C1 control codes ISO-8859-1/Latin-1 leaves there. Byte values with no
// entry here (0x81, 0x8D, 0x8F, 0x90, 0x9D) are undefined in Windows-1252
// and never occur in genuine cp1252 text; they are excluded from the
// representable set entirely (never treated as candidates).
const CP1252_HIGH: ReadonlyArray<[number, number]> = [
  [0x80, 0x20AC], [0x82, 0x201A], [0x83, 0x0192], [0x84, 0x201E], [0x85, 0x2026],
  [0x86, 0x2020], [0x87, 0x2021], [0x88, 0x02C6], [0x89, 0x2030], [0x8A, 0x0160],
  [0x8B, 0x2039], [0x8C, 0x0152], [0x8E, 0x017D],
  [0x91, 0x2018], [0x92, 0x2019], [0x93, 0x201C], [0x94, 0x201D], [0x95, 0x2022],
  [0x96, 0x2013], [0x97, 0x2014], [0x98, 0x02DC], [0x99, 0x2122], [0x9A, 0x0161],
  [0x9B, 0x203A], [0x9C, 0x0153], [0x9E, 0x017E], [0x9F, 0x0178],
];
const BYTE_TO_CP = new Map<number, number>(CP1252_HIGH);
const CP_TO_BYTE = new Map<number, number>(CP1252_HIGH.map(([b, c]) => [c, b]));

function isCp1252Representable(cp: number): boolean {
  if (cp < 0x80) return true;
  if (cp >= 0xA0 && cp <= 0xFF) return true;
  return CP_TO_BYTE.has(cp);
}

function charToByte(cp: number): number {
  if (cp < 0x80 || (cp >= 0xA0 && cp <= 0xFF)) return cp;
  return CP_TO_BYTE.get(cp)!; // caller guarantees representability
}

function byteToChar(b: number): string {
  if (b < 0x80 || (b >= 0xA0 && b <= 0xFF)) return String.fromCodePoint(b);
  return String.fromCodePoint(BYTE_TO_CP.get(b)!); // caller guarantees b is a defined cp1252 byte
}

/** Reinterpret a run's characters as raw Windows-1252 byte values, then
 *  strictly decode those bytes as UTF-8: strict meaning the decode must be
 *  lossless in both directions (re-encoding the decoded string to UTF-8
 *  reproduces the exact same byte sequence), ruling out replacement
 *  characters or coincidental partial decodes. Returns null if the run is
 *  not representable, not validly decodable, or decodes to itself
 *  (nothing to fix). */
function tryDecodeMojibake(run: string): string | null {
  const bytes: number[] = [];
  for (const ch of run) {
    const cp = ch.codePointAt(0)!;
    if (!isCp1252Representable(cp)) return null;
    bytes.push(charToByte(cp));
  }
  const buf = Uint8Array.from(bytes);
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return null;
  }
  if (decoded === run) return null; // nothing to fix
  // Re-encode and confirm exact byte match (redundant with fatal:true, but
  // matches the explicit self-verification discipline of every other lane).
  const reencoded = new TextEncoder().encode(decoded);
  if (reencoded.length !== buf.length) return null;
  for (let i = 0; i < reencoded.length; i++) if (reencoded[i] !== buf[i]) return null;
  return decoded;
}

export interface MojibakeSpan { start: number; end: number; decoded: string; }

/** Find maximal runs of Windows-1252-representable characters and test
 *  each whole run for genuine mojibake. Pure, total, never throws. */
export function findMojibakeSpans(text: string): MojibakeSpan[] {
  const spans: MojibakeSpan[] = [];
  const chars = Array.from(text);
  let i = 0;
  let offset = 0;
  const offsets: number[] = [];
  for (const c of chars) { offsets.push(offset); offset += c.length; }
  offsets.push(offset);
  while (i < chars.length) {
    if (!isCp1252Representable(chars[i].codePointAt(0)!)) { i++; continue; }
    let j = i;
    while (j < chars.length && isCp1252Representable(chars[j].codePointAt(0)!)) j++;
    const run = chars.slice(i, j).join('');
    const decoded = tryDecodeMojibake(run);
    if (decoded !== null) {
      spans.push({ start: offsets[i], end: offsets[j], decoded });
    }
    i = j;
  }
  return spans;
}

export function mojibakeApplySpans(text: string, spans: MojibakeSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    out += MOJIBAKE_OPEN + s.decoded + MOJIBAKE_CLOSE;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total, never throws. Any dangling/unterminated bracket, or a character
 *  inside the bracket that is not cp1252-representable (should never
 *  happen for a genuinely-produced wire, but handled defensively), is left
 *  as literal text -- matches every other lane's totality discipline. */
export function mojibakeRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    if (wire[i] === MOJIBAKE_OPEN) {
      const close = wire.indexOf(MOJIBAKE_CLOSE, i + 1);
      if (close === -1) { out += wire[i]; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let rebuilt = '';
      let ok = true;
      for (const ch of inner) {
        const bytes = new TextEncoder().encode(ch);
        for (const b of bytes) {
          if (b < 0x80 || (b >= 0xA0 && b <= 0xFF)) { rebuilt += String.fromCodePoint(b); continue; }
          const mapped = BYTE_TO_CP.get(b);
          if (mapped === undefined) { ok = false; break; }
          rebuilt += String.fromCodePoint(mapped);
        }
        if (!ok) break;
      }
      out += ok ? rebuilt : (MOJIBAKE_OPEN + inner + MOJIBAKE_CLOSE);
      i = close + 1;
    } else {
      out += wire[i];
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance, mirroring
 *  procrustesTransform/abacusTransform/circeTransform/syntagmaTransform. */
export function prosoponTransform(text: string, enc: EncodingName): { candidate: string; spans: MojibakeSpan[] } {
  const allSpans = findMojibakeSpans(text);
  const accepted: MojibakeSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = mojibakeApplySpans(text, candidateSpans);
    if (mojibakeRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  return { candidate: mojibakeApplySpans(text, sorted), spans: sorted };
}

/* ---------------------------------------------------------------------------
 * Encode / Decode / DecoderPrompt
 * ------------------------------------------------------------------------- */

export interface ProsoponResult extends DaedalusResult {
  codec2: 'prosopon';
  prosoponApplied: boolean;
  prosoponSpans: number;
}

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

const HIGH_BYTE_NAME = new Map<number, string>([
  [0x80, '\u20AC'], [0x82, '\u201A'], [0x83, '\u0192'], [0x84, '\u201E'], [0x85, '\u2026'],
  [0x86, '\u2020'], [0x87, '\u2021'], [0x88, '\u02C6'], [0x89, '\u2030'], [0x8A, '\u0160'],
  [0x8B, '\u2039'], [0x8C, '\u0152'], [0x8E, '\u017D'],
  [0x91, '\u2018'], [0x92, '\u2019'], [0x93, '\u201C'], [0x94, '\u201D'], [0x95, '\u2022'],
  [0x96, '\u2013'], [0x97, '\u2014'], [0x98, '\u02DC'], [0x99, '\u2122'], [0x9A, '\u0161'],
  [0x9B, '\u203A'], [0x9C, '\u0153'], [0x9E, '\u017E'], [0x9F, '\u0178'],
]);

/** Which specific 0x80-0x9F byte values are actually needed to restore the
 *  given accepted spans, so the tail instruction only ever pays for
 *  entries it uses -- exactly CIRCE's own per-mechanism clause discipline. */
function usedHighBytes(spans: MojibakeSpan[]): number[] {
  const used = new Set<number>();
  for (const s of spans) {
    for (const ch of s.decoded) {
      for (const b of new TextEncoder().encode(ch)) {
        if (b >= 0x80 && b <= 0x9F && BYTE_TO_CP.has(b)) used.add(b);
      }
    }
  }
  return Array.from(used).sort((a, b) => a - b);
}

function prosoponTailInstruction(highBytes: number[]): string {
  const table = highBytes.map((b) => `${b.toString(16)}${HIGH_BYTE_NAME.get(b)}`).join(' ');
  const highPart = highBytes.length > 0 ? `;80-9f(${table})else=cp` : ';byte=cp';
  return `Drop ${PROSOPON_MARK}/${PROSOPON_ESCAPE}, decode rest as above. ${MOJIBAKE_OPEN}..${MOJIBAKE_CLOSE}: char\u2192utf8 bytes${highPart};drop marks.`;
}

const PROSOPON_TAIL_ESCAPE = `Drop the leading ${PROSOPON_ESCAPE} above, then decode the rest as already instructed.`;

export function prosoponEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): ProsoponResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans } = prosoponTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === PROSOPON_MARK || plain.wire[0] === PROSOPON_ESCAPE);

  let best: ProsoponResult = {
    ...plain,
    codec2: 'prosopon',
    prosoponApplied: false,
    prosoponSpans: 0,
    ms: Date.now() - started,
    notes: `prosopon: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no wrong-codepage (mojibake) run found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = PROSOPON_ESCAPE + plain.wire;
    const escapedPrompt = `${PROSOPON_ESCAPE}${plain.decoderPrompt}\n${PROSOPON_TAIL_ESCAPE}`;
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
    const prosoponWire = PROSOPON_MARK + canon.wire;
    const tail = prosoponTailInstruction(usedHighBytes(spans));
    const prosoponPrompt = `${PROSOPON_MARK}${canon.decoderPrompt}\n${tail}`;
    const prosoponMessageTokens = countTokens(prosoponPrompt, enc);

    if (prosoponMessageTokens < best.messageTokens) {
      const decodedBack = prosoponDecode(prosoponWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'prosopon',
          wire: prosoponWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: prosoponMessageTokens,
          contractTokens: prosoponMessageTokens - canon.outTokens,
          decoderPrompt: prosoponPrompt,
          prosoponApplied: true,
          prosoponSpans: spans.length,
          ms: Date.now() - started,
          notes: `prosopon: applied, ${spans.length} wrong-codepage (mojibake) span(s) restored, saved ${plain.messageTokens - prosoponMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

export function prosoponDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === PROSOPON_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return mojibakeRestoreSpans(candidate);
  }
  if (first === PROSOPON_ESCAPE) {
    return daedalusDecode(wire.slice(1));
  }
  return daedalusDecode(wire);
}

export function prosoponDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === PROSOPON_MARK || wire[0] === PROSOPON_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    if (wire[0] === PROSOPON_ESCAPE) {
      return `${wire[0]}${innerPrompt}\n${PROSOPON_TAIL_ESCAPE}`;
    }
    const decodedInner = daedalusDecode(inner);
    const highBytesUsed = new Set<number>();
    let idx = decodedInner.indexOf(MOJIBAKE_OPEN);
    while (idx !== -1) {
      const close = decodedInner.indexOf(MOJIBAKE_CLOSE, idx + 1);
      if (close === -1) break;
      const spanContent = decodedInner.slice(idx + 1, close);
      for (const ch of spanContent) {
        for (const b of new TextEncoder().encode(ch)) {
          if (b >= 0x80 && b <= 0x9F && BYTE_TO_CP.has(b)) highBytesUsed.add(b);
        }
      }
      idx = decodedInner.indexOf(MOJIBAKE_OPEN, close + 1);
    }
    const tail = prosoponTailInstruction(Array.from(highBytesUsed).sort((a, b) => a - b));
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
