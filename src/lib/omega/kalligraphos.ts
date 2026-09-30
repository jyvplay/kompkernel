/**
 * KALLIGRAPHOS — mathematical-alphabet restoration, exact and self-verifying.
 *
 * Unicode Mathematical Alphanumeric Symbols are routinely used as “fancy text”
 * in social posts, copied headings, and generated status messages.  A styled
 * English sentence is expensive and sometimes poorly understood by models,
 * because these astral codepoints are font variants rather than trained English
 * subwords.  Mathematical notation may assign semantic meaning to style, so
 * normalizing it without a reversible wrapper is unacceptable.  KALLIGRAPHOS
 * carries the style as an opcode and canonical ASCII as the operand, restoring
 * the original codepoints exactly.
 *
 * This is not a general NFKC pass.  It supports only seven contiguous,
 * arithmetic Unicode families whose capital/lowercase (and where present digit)
 * ranges can be restored by addition.  The exact style remains in each span.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusOptions, type DaedalusResult } from './daedalus';
import { CHIRON_START } from './chiron';

export const KALLIGRAPHOS_MARK = '✅';
export const KALLIGRAPHOS_ESCAPE = '✔';
export const MATH_OPEN = '⌁';
export const MATH_CLOSE = '⌂';

type StyleId = 'B' | 'I' | 'S' | 'F' | 'T' | 'X' | 'M';

interface MathStyle {
  id: StyleId;
  label: string;
  upper: number;
  lower: number;
  digit?: number;
}

// Only complete, contiguous ASCII-compatible ranges.  Families with Unicode
// holes (script, fraktur, double-struck) are intentionally excluded.
const STYLES: readonly MathStyle[] = [
  { id: 'B', label: 'mathematical bold', upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
  { id: 'I', label: 'mathematical bold italic', upper: 0x1d468, lower: 0x1d482 },
  { id: 'S', label: 'mathematical sans-serif', upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
  { id: 'F', label: 'mathematical sans-serif bold', upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  { id: 'T', label: 'mathematical sans-serif italic', upper: 0x1d608, lower: 0x1d622 },
  { id: 'X', label: 'mathematical sans-serif bold italic', upper: 0x1d63c, lower: 0x1d656 },
  { id: 'M', label: 'mathematical monospace', upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
] as const;

const BY_ID = new Map(STYLES.map((s) => [s.id, s]));

function widthAt(text: string, offset: number): number {
  const cp = text.codePointAt(offset);
  return cp !== undefined && cp > 0xffff ? 2 : 1;
}

function asciiFor(cp: number, style: MathStyle): string | null {
  if (cp >= style.upper && cp < style.upper + 26) return String.fromCharCode(0x41 + cp - style.upper);
  if (cp >= style.lower && cp < style.lower + 26) return String.fromCharCode(0x61 + cp - style.lower);
  if (style.digit !== undefined && cp >= style.digit && cp < style.digit + 10) return String.fromCharCode(0x30 + cp - style.digit);
  return null;
}

function styledAt(text: string, offset: number): { style: MathStyle; ascii: string } | null {
  const cp = text.codePointAt(offset);
  if (cp === undefined) return null;
  for (const style of STYLES) {
    const ascii = asciiFor(cp, style);
    if (ascii !== null) return { style, ascii };
  }
  return null;
}

function isAsciiAlphaNum(cp: number): boolean {
  return (cp >= 0x30 && cp <= 0x39) || (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a);
}

function toStyled(ch: string, style: MathStyle): string {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x41 && cp <= 0x5a) return String.fromCodePoint(style.upper + cp - 0x41);
  if (cp >= 0x61 && cp <= 0x7a) return String.fromCodePoint(style.lower + cp - 0x61);
  if (style.digit !== undefined && cp >= 0x30 && cp <= 0x39) return String.fromCodePoint(style.digit + cp - 0x30);
  return ch;
}

export interface MathAlphabetSpan {
  start: number;
  end: number;
  style: StyleId;
}

/**
 * The Unicode block is also legitimate mathematical notation. We therefore
 * accept only a deliberately narrow decorative-prose profile. This does not
 * affect reversibility (which is always exact); it prevents an economically
 * attractive long equation from being marketed as prose compression.
 *
 * NFKD is used here solely as a classifier view of the local context, never as
 * the emitted transform. The source style is still restored by an opcode.
 */
function isDecorativeProseSpan(text: string, span: MathAlphabetSpan): boolean {
  const window = text.slice(Math.max(0, span.start - 40), Math.min(text.length, span.end + 40)).normalize('NFKD');
  const body = text.slice(span.start, span.end).normalize('NFKD');
  // Formula punctuation is a high-precision rejection signal. Hyphen is not
  // included because operational prose uses it often.
  if (/[=+*\/^_{}<>≤≥≈≠∈∉∑∫∏√∞∀∃→←↦$]/u.test(window) || /[\[\]\\]/.test(window)) return false;
  if (/\b(field|vector|matrix|scalar|tensor|equation|theorem|lemma|proof|set|function|variable|coefficient|polynomial|integral|derivative|domain|codomain|basis)\b/i.test(window)) return false;
  const words = body.match(/[A-Za-z]{2,}/g) ?? [];
  const letters = (body.match(/[A-Za-z]/g) ?? []).length;
  const whitespace = (body.match(/\s/g) ?? []).length;
  // Require several natural-language words plus enough material to amortize
  // an inline contract. Short bold symbols/titles decline to a plain exact path.
  return words.length >= 3 && letters >= 24 && whitespace >= 2;
}

/**
 * A span has one styled family.  Native ASCII alphanumerics and another
 * supported styled family are hard boundaries: otherwise a decoder could not
 * distinguish source ASCII from the ASCII operand we introduced.  Punctuation,
 * whitespace, CJK, emoji, and unsupported symbols pass through unchanged.
 */
export function findMathAlphabetSpans(text: string): MathAlphabetSpan[] {
  const spans: MathAlphabetSpan[] = [];
  let i = 0;
  while (i < text.length) {
    const first = styledAt(text, i);
    if (!first) { i += widthAt(text, i); continue; }
    const start = i;
    const style = first.style;
    i += widthAt(text, i);
    while (i < text.length) {
      const cp = text.codePointAt(i)!;
      if (isAsciiAlphaNum(cp)) break;
      const next = styledAt(text, i);
      if (next && next.style.id !== style.id) break;
      i += widthAt(text, i);
    }
    spans.push({ start, end: i, style: style.id });
  }
  return spans;
}

export function mathAlphabetApplySpans(text: string, spans: MathAlphabetSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const span of spans) {
    const style = BY_ID.get(span.style)!;
    out += text.slice(cursor, span.start);
    let body = '';
    for (let i = span.start; i < span.end;) {
      const mapped = styledAt(text, i);
      if (mapped?.style.id === style.id) body += mapped.ascii;
      else body += text.slice(i, i + widthAt(text, i));
      i += widthAt(text, i);
    }
    out += MATH_OPEN + style.id + ':' + body + MATH_CLOSE;
    cursor = span.end;
  }
  return out + text.slice(cursor);
}

/** Total restore; malformed spans are copied unchanged. */
export function mathAlphabetRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  while (i < wire.length) {
    if (wire[i] !== MATH_OPEN) { out += wire[i++]; continue; }
    const close = wire.indexOf(MATH_CLOSE, i + 1);
    if (close === -1) { out += wire[i++]; continue; }
    const style = BY_ID.get(wire[i + 1] as StyleId);
    if (!style || wire[i + 2] !== ':') {
      out += wire.slice(i, close + 1);
      i = close + 1;
      continue;
    }
    for (const ch of wire.slice(i + 3, close)) out += toStyled(ch, style);
    i = close + 1;
  }
  return out;
}

export function kalligraphosTransform(text: string, enc: EncodingName): { candidate: string; spans: MathAlphabetSpan[] } {
  // A literal valid-looking inner span would be reinterpreted after another
  // span enables the outer KALLIGRAPHOS decoder. Conservatively decline rather
  // than add an opaque escaping grammar to a one-chat contract.
  if (text.includes(MATH_OPEN) || text.includes(MATH_CLOSE)) return { candidate: text, spans: [] };
  const accepted: MathAlphabetSpan[] = [];
  let cost = countTokens(text, enc);
  for (const span of findMathAlphabetSpans(text)) {
    if (!isDecorativeProseSpan(text, span)) continue;
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = mathAlphabetApplySpans(text, candidateSpans);
    if (mathAlphabetRestoreSpans(candidate) !== text) continue;
    const candidateCost = countTokens(candidate, enc);
    if (candidateCost < cost) { accepted.push(span); cost = candidateCost; }
  }
  const spans = accepted.sort((a, b) => a.start - b.start);
  return { candidate: mathAlphabetApplySpans(text, spans), spans };
}

export interface KalligraphosResult extends DaedalusResult {
  codec2: 'kalligraphos';
  kalligraphosApplied: boolean;
  kalligraphosSpans: number;
  kalligraphosStyles: StyleId[];
}

function styleClause(style: MathStyle): string {
  const pieces = [`A..Z+U+${style.upper.toString(16).toUpperCase()}`, `a..z+U+${style.lower.toString(16).toUpperCase()}`];
  if (style.digit !== undefined) pieces.push(`0..9+U+${style.digit.toString(16).toUpperCase()}`);
  return `${style.id}=${pieces.join(',')}`;
}

function tail(styles: StyleId[]): string {
  return `Drop ${KALLIGRAPHOS_MARK}/${KALLIGRAPHOS_ESCAPE}, decode rest as above. ${MATH_OPEN}S:X${MATH_CLOSE}: use S rule ${styles.map((id) => styleClause(BY_ID.get(id)!)).join(';')};drop marks.`;
}

const ESCAPE_TAIL = `Drop leading ${KALLIGRAPHOS_ESCAPE}, then decode the rest as above.`;

export function kalligraphosEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): KalligraphosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const { candidate, spans } = kalligraphosTransform(text, enc);
  const plain = daedalusEncode(text, enc, options);
  const collision = plain.wire.startsWith(KALLIGRAPHOS_MARK) || plain.wire.startsWith(KALLIGRAPHOS_ESCAPE);
  let best: KalligraphosResult = {
    ...plain, codec2: 'kalligraphos', kalligraphosApplied: false, kalligraphosSpans: 0, kalligraphosStyles: [],
    ms: Date.now() - started,
    notes: `kalligraphos: not applied (${spans.length ? 'verified decorative-prose spans did not repay the inline rule' : 'no safe profitable decorative-prose mathematical-alphabet run found'}); ${plain.notes}`,
  };
  if (collision) {
    const decoderPrompt = `${KALLIGRAPHOS_ESCAPE}${plain.decoderPrompt}\n${ESCAPE_TAIL}`;
    best = { ...best, wire: KALLIGRAPHOS_ESCAPE + plain.wire, decoderPrompt,
      messageTokens: countTokens(decoderPrompt, enc), contractTokens: countTokens(decoderPrompt, enc) - plain.outTokens };
  }
  if (spans.length && candidate !== text) {
    const canon = daedalusEncode(candidate, enc, options);
    const styles = [...new Set(spans.map((s) => s.style))];
    const wire = KALLIGRAPHOS_MARK + canon.wire;
    const decoderPrompt = `${KALLIGRAPHOS_MARK}${canon.decoderPrompt}\n${tail(styles)}`;
    const messageTokens = countTokens(decoderPrompt, enc);
    if (messageTokens < best.messageTokens && kalligraphosDecode(wire) === text) {
      best = {
        ...canon, codec2: 'kalligraphos', wire, decoded: text, exact: true, inTokens,
        decoderPrompt, messageTokens, contractTokens: messageTokens - canon.outTokens,
        kalligraphosApplied: true, kalligraphosSpans: spans.length, kalligraphosStyles: styles,
        ms: Date.now() - started,
        notes: `kalligraphos: restored ${spans.length} mathematical-alphabet span(s) in ${styles.join(',')} style(s), saved ${plain.messageTokens - messageTokens} tok over plain DAEDALUS; ${canon.notes}`,
      };
    }
  }
  return best;
}

export function kalligraphosDecode(wire: string): string {
  if (!wire) return wire;
  if (wire[0] === KALLIGRAPHOS_MARK) return mathAlphabetRestoreSpans(daedalusDecode(wire.slice(1)));
  if (wire[0] === KALLIGRAPHOS_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}

export function kalligraphosDecoderPrompt(wire: string): string {
  if (wire[0] !== KALLIGRAPHOS_MARK && wire[0] !== KALLIGRAPHOS_ESCAPE) {
    return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
  }
  const inner = wire.slice(1);
  const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
  if (wire[0] === KALLIGRAPHOS_ESCAPE) return `${wire[0]}${innerPrompt}\n${ESCAPE_TAIL}`;
  const decoded = daedalusDecode(inner);
  const styles = new Set<StyleId>();
  for (let i = 0; i < decoded.length; i++) {
    if (decoded[i] === MATH_OPEN && BY_ID.has(decoded[i + 1] as StyleId) && decoded[i + 2] === ':' && decoded.indexOf(MATH_CLOSE, i + 3) !== -1) {
      styles.add(decoded[i + 1] as StyleId);
    }
  }
  return `${wire[0]}${innerPrompt}\n${tail([...styles])}`;
}
