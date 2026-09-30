/**
 * src/lib/omega/arithmos.ts
 * =============================================================================
 * ARITHMOS — Native-Script Numeral Restoration Pre-Pass (self-verifying,
 * exact)
 *
 * Named for the Greek ἀριθμός ("number, numeral") — fitting since the
 * mechanism reversed here is itself a piece of numeral-system history:
 * Hindu-Arabic numerals (0-9) were transmitted to medieval Europe via
 * Arabic-speaking scholars (al-Khwarizmi among them, whose name gives us
 * "algorithm"), while the Arab world itself continued using — and, per
 * current usage data, still overwhelmingly prefers — a visually different
 * glyph set for the same base-10 positional system: what Europeans call
 * "Eastern Arabic numerals" and Arabic speakers themselves call "Hindi
 * numerals" (٠١٢٣٤٥٦٧٨٩), because they trace to the same Indian origin as
 * Devanagari's own digit forms (०१२३४५६७८९). Three scripts, one shared
 * mathematical ancestry, three different Unicode code-point ranges — and,
 * critically, three different tokenizer costs for encoding the identical
 * base-10 value.
 *
 * THE BLINDSPOT, MEASURED DIRECTLY THIS SESSION (o200k_base, live
 * tokenizer, `bench/tmp/probe_arabic_digits.ts` / `probe_devanagari.ts`):
 * a run of ten consecutive ASCII digits ("0123456789") costs just 4 tokens
 * — o200k_base has learned efficient multi-digit merges for Western
 * numerals. The IDENTICAL ten digits, written in Eastern Arabic-Indic
 * script (٠١٢٣٤٥٦٧٨٩) or Devanagari script (०१२३४५६७८९), cost 10 and 9
 * tokens respectively — no multi-digit merges exist for either script's
 * digit sequences, so every digit is priced individually. On a realistic,
 * non-repetitive digit-dense document (a price list quoting ten product
 * prices), this measured as a 38.5% token inflation for Eastern
 * Arabic-Indic digits and a comparable 17.4% inflation for Devanagari
 * digits on a realistic invoice message — magnitudes that scale directly
 * with how many multi-digit numbers (prices, dates, phone numbers,
 * quantities) a document contains, exactly the density pattern real
 * invoices, receipts, and business correspondence exhibit.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY — hundreds of millions
 * of everyday users, current data:
 *   - "Over 420 million people use Arabic numerals daily," and "about 65%
 *     of the Arab world" — Egypt, Saudi Arabia, the UAE, Jordan, Iraq,
 *     Syria, Palestine, Kuwait, Qatar, Bahrain, Oman, and Yemen — "uses
 *     Eastern Arabic numerals," while the Maghreb (Morocco, Algeria,
 *     Tunisia, Libya) uses Western digits and Lebanon/Sudan mix both,
 *     according to a March 2026-dated reference guide. Reading Al Jazeera
 *     (Qatar-based) surfaces Eastern digits; reading a Moroccan outlet
 *     surfaces Western ones.
 *   - A real, filed software bug (`craftcms/cms` issue #7341): "Using the
 *     Arabic locale results in showing numbers in Eastern Arabic Numerals
 *     ... notably with date & time formatting and entries pagination,"
 *     confirming this is not merely a matter of individual typing
 *     preference but a live LOCALE-DEFAULT behavior baked into real
 *     production software stacks, still being patched around today.
 *   - The Persian (۰۱۲۳۴۵۶۷۸۹, a distinct Unicode range from Eastern
 *     Arabic-Indic despite visual similarity) and Devanagari/Hindi
 *     (०१२३४५६७८९) numeral systems serve comparably large populations —
 *     Persian/Farsi/Dari across Iran, Afghanistan, and Tajikistan; Hindi
 *     numerals across the central document-producing population of India —
 *     with the identical multi-digit-merge blind spot independently
 *     confirmed against the live tokenizer for both this session.
 *
 * THREE SUB-MECHANISMS, ONE THEME (restore the digit GLYPH SYSTEM, never
 * the numeric value): Eastern Arabic-Indic (U+0660-0669), Extended
 * Arabic-Indic / Persian (U+06F0-06F9), and Devanagari (U+0966-096F).
 * Each is a SIMPLE, CLOSED-FORM ARITHMETIC OFFSET from the corresponding
 * ASCII digit — `nativeDigitChar = String.fromCodePoint(SCRIPT_BASE + d)`
 * for d in [0,9] — categorically simpler than SYNTAGMA's own Hangul
 * L*V*T formula (a single constant addition/subtraction per digit, no
 * multiplication or bit-splitting at all), making this an especially
 * reliable target for a bare LLM to compute by hand: no lookup table, no
 * curated common-case list, just "add 0x0660" (or 0x06F0, or 0x0966) to
 * each ASCII digit's own codepoint.
 *
 * MECHANISM: find maximal runs of consecutive digits drawn from the SAME
 * single native script (never mixing scripts within one run, and never
 * mixing a native script with ASCII digits within one run — a run
 * self-terminates the instant a different digit script, or any
 * non-digit character, is encountered). Replace the run with its ASCII
 * digit equivalent, prefixed with a script-specific 1-token marker so the
 * restore rule knows which offset to re-apply. A digit run self-terminates
 * at the first non-digit character, exactly mirroring ABACUS's NUM_MARK
 * discipline.
 *
 * SAFETY: a span is only ever accepted if replaying the exact arithmetic
 * restore rule reproduces the original run byte-for-byte AND the real
 * tokenizer shows a strict improvement.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

export const ARITHMOS_MARK = '\u221E';   // ∞ U+221E INFINITY — "ARITHMOS applied"
export const ARITHMOS_ESCAPE = '\u2248'; // ≈ U+2248 ALMOST EQUAL TO — "escaped, not applied"

// Script-specific self-terminating prefix markers (each 1 token in o200k_base):
export const ARABIC_PREFIX = '\u25BA';  // ► U+25BA BLACK RIGHT-POINTING POINTER
export const PERSIAN_PREFIX = '\u25BC'; // ▼ U+25BC BLACK DOWN-POINTING TRIANGLE
export const DEV_PREFIX = '\u25A0';     // ■ U+25A0 BLACK SQUARE

export const ARABIC_BASE = 0x0660; // U+0660..U+0669: ٠١٢٣٤٥٦٧٨٩
export const PERSIAN_BASE = 0x06f0; // U+06F0..U+06F9: ۰۱۲۳۴۵۶۷۸۹
export const DEV_BASE = 0x0966;     // U+0966..U+096F: ०१२३४५६७८९

export type NumeralScript = 'arabic' | 'persian' | 'devanagari';

export interface ArithmosSpan {
  start: number;
  end: number;
  script: NumeralScript;
  asciiDigits: string;
}

function classifyDigit(cp: number): NumeralScript | null {
  if (cp >= ARABIC_BASE && cp <= ARABIC_BASE + 9) return 'arabic';
  if (cp >= PERSIAN_BASE && cp <= PERSIAN_BASE + 9) return 'persian';
  if (cp >= DEV_BASE && cp <= DEV_BASE + 9) return 'devanagari';
  return null;
}

function digitValue(cp: number, script: NumeralScript): number {
  if (script === 'arabic') return cp - ARABIC_BASE;
  if (script === 'persian') return cp - PERSIAN_BASE;
  return cp - DEV_BASE;
}

export function findArithmosSpans(text: string): ArithmosSpan[] {
  const spans: ArithmosSpan[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const cp0 = text.codePointAt(i);
    if (cp0 === undefined) break;
    const script = classifyDigit(cp0);
    if (!script) {
      i++;
      continue;
    }
    const start = i;
    let asciiDigits = '';
    let j = i;
    while (j < n) {
      const cp = text.codePointAt(j);
      if (cp === undefined) break;
      const s = classifyDigit(cp);
      if (s !== script) break;
      asciiDigits += String.fromCharCode(48 + digitValue(cp, script));
      j++;
    }
    spans.push({ start, end: j, script, asciiDigits });
    i = j;
  }
  return spans;
}

export function arithmosApplySpans(text: string, spans: ArithmosSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    const prefix = s.script === 'arabic' ? ARABIC_PREFIX : s.script === 'persian' ? PERSIAN_PREFIX : DEV_PREFIX;
    out += prefix + s.asciiDigits;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total, never throws. Self-terminating prefix restore. */
export function arithmosRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === ARABIC_PREFIX) {
      i++;
      let digits = '';
      while (i < n && wire.charCodeAt(i) >= 48 && wire.charCodeAt(i) <= 57) {
        digits += String.fromCodePoint(ARABIC_BASE + (wire.charCodeAt(i) - 48));
        i++;
      }
      out += digits;
    } else if (ch === PERSIAN_PREFIX) {
      i++;
      let digits = '';
      while (i < n && wire.charCodeAt(i) >= 48 && wire.charCodeAt(i) <= 57) {
        digits += String.fromCodePoint(PERSIAN_BASE + (wire.charCodeAt(i) - 48));
        i++;
      }
      out += digits;
    } else if (ch === DEV_PREFIX) {
      i++;
      let digits = '';
      while (i < n && wire.charCodeAt(i) >= 48 && wire.charCodeAt(i) <= 57) {
        digits += String.fromCodePoint(DEV_BASE + (wire.charCodeAt(i) - 48));
        i++;
      }
      out += digits;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance. */
export function arithmosTransform(text: string, enc: EncodingName): { candidate: string; spans: ArithmosSpan[] } {
  const allSpans = findArithmosSpans(text);
  if (allSpans.length === 0) return { candidate: text, spans: [] };

  // First try all spans together (bulk evaluation)
  const fullCandidate = arithmosApplySpans(text, allSpans);
  if (arithmosRestoreSpans(fullCandidate) === text) {
    const fullTok = countTokens(fullCandidate, enc);
    const origTok = countTokens(text, enc);
    if (fullTok < origTok) {
      return { candidate: fullCandidate, spans: allSpans };
    }
  }

  // Incremental fallback
  const accepted: ArithmosSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = arithmosApplySpans(text, candidateSpans);
    if (arithmosRestoreSpans(candidate) !== text) continue;
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  return { candidate: arithmosApplySpans(text, sorted), spans: sorted };
}

/* ---------------------------------------------------------------------------
 * Encode / Decode / DecoderPrompt
 * ------------------------------------------------------------------------- */

export interface ArithmosResult extends DaedalusResult {
  codec2: 'arithmos';
  arithmosApplied: boolean;
  arithmosSpans: number;
  arithmosArabicSpans: number;
  arithmosPersianSpans: number;
  arithmosDevanagariSpans: number;
}

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

function arithmosTailInstruction(hasArabic: boolean, hasPersian: boolean, hasDev: boolean): string {
  const clauses: string[] = [];
  if (hasArabic) clauses.push(`${ARABIC_PREFIX} followed by ascii digits d\u21920x0660+d; drop ${ARABIC_PREFIX}`);
  if (hasPersian) clauses.push(`${PERSIAN_PREFIX} followed by ascii digits d\u21920x06F0+d; drop ${PERSIAN_PREFIX}`);
  if (hasDev) clauses.push(`${DEV_PREFIX} followed by ascii digits d\u21920x0966+d; drop ${DEV_PREFIX}`);
  const body = clauses.length > 0 ? clauses.join('; ') + '.' : '';
  return `Drop ${ARITHMOS_MARK}/${ARITHMOS_ESCAPE}, decode rest as above. ${body}`;
}

const ARITHMOS_TAIL_ESCAPE = `Drop the leading ${ARITHMOS_ESCAPE} above, then decode the rest as already instructed.`;

export function arithmosEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): ArithmosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans } = arithmosTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === ARITHMOS_MARK || plain.wire[0] === ARITHMOS_ESCAPE);

  let best: ArithmosResult = {
    ...plain,
    codec2: 'arithmos',
    arithmosApplied: false,
    arithmosSpans: 0,
    arithmosArabicSpans: 0,
    arithmosPersianSpans: 0,
    arithmosDevanagariSpans: 0,
    ms: Date.now() - started,
    notes: `arithmos: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no native-script numeral run found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = ARITHMOS_ESCAPE + plain.wire;
    const escapedPrompt = `${ARITHMOS_ESCAPE}${plain.decoderPrompt}\n${ARITHMOS_TAIL_ESCAPE}`;
    best = {
      ...best,
      wire: escapedWire,
      decoderPrompt: escapedPrompt,
      messageTokens: countTokens(escapedPrompt, enc),
      contractTokens: countTokens(escapedPrompt, enc) - plain.outTokens,
    };
  }

  if (applied0) {
    let hasArabic = false, hasPersian = false, hasDev = false;
    let arabic = 0, persian = 0, dev = 0;
    for (const s of spans) {
      if (s.script === 'arabic') { hasArabic = true; arabic++; }
      else if (s.script === 'persian') { hasPersian = true; persian++; }
      else { hasDev = true; dev++; }
    }
    const canon = baseDaedalus(candidate, enc, options);
    const arithmosWire = ARITHMOS_MARK + canon.wire;
    const tail = arithmosTailInstruction(hasArabic, hasPersian, hasDev);
    const arithmosPrompt = `${ARITHMOS_MARK}${canon.decoderPrompt}\n${tail}`;
    const arithmosMessageTokens = countTokens(arithmosPrompt, enc);

    if (arithmosMessageTokens < best.messageTokens) {
      const decodedBack = arithmosDecode(arithmosWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'arithmos',
          wire: arithmosWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: arithmosMessageTokens,
          contractTokens: arithmosMessageTokens - canon.outTokens,
          decoderPrompt: arithmosPrompt,
          arithmosApplied: true,
          arithmosSpans: spans.length,
          arithmosArabicSpans: arabic,
          arithmosPersianSpans: persian,
          arithmosDevanagariSpans: dev,
          ms: Date.now() - started,
          notes: `arithmos: applied, ${spans.length} numeral span(s) (${arabic} Arabic-Indic, ${persian} Persian, ${dev} Devanagari) restored, saved ${plain.messageTokens - arithmosMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

export function arithmosDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === ARITHMOS_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return arithmosRestoreSpans(candidate);
  }
  if (first === ARITHMOS_ESCAPE) {
    return daedalusDecode(wire.slice(1));
  }
  return daedalusDecode(wire);
}

export function arithmosDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === ARITHMOS_MARK || wire[0] === ARITHMOS_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    if (wire[0] === ARITHMOS_ESCAPE) {
      return `${wire[0]}${innerPrompt}\n${ARITHMOS_TAIL_ESCAPE}`;
    }
    const decodedInner = daedalusDecode(inner);
    const hasArabic = decodedInner.includes(ARABIC_PREFIX);
    const hasPersian = decodedInner.includes(PERSIAN_PREFIX);
    const hasDev = decodedInner.includes(DEV_PREFIX);
    const tail = arithmosTailInstruction(hasArabic, hasPersian, hasDev);
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
