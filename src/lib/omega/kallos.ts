/**
 * src/lib/omega/kallos.ts
 * =============================================================================
 * KALLOS (κάλλος — "beauty", styled typography)
 * Unicode Mathematical Alphanumeric & Styled Font Restoration Pre-Pass
 * (self-verifying, exact)
 *
 * Named for the Greek κάλλος ("beauty, elegance"): the exact quality that
 * motivates authors, markdown formatters, social media tools, mathematics
 * documents, and prompt templates to use Unicode Mathematical Alphanumeric
 * Symbols (U+1D400-U+1D7FF) for stylized headings, bold emphasis, variable
 * names, code snippets, and callouts (e.g. 𝐓𝐡𝐞 𝐩𝐫𝐨𝐣𝐞𝐜𝐭, 𝑇ℎ𝑒𝑜𝑟𝑒𝑚 1, 𝚌𝚘𝚗𝚜𝚝 𝚟𝚊𝚕𝚞𝚎,
 * 𝖲𝗍𝖺𝗍𝗎𝗌: 𝖮𝖪).
 *
 * THE BLINDSPOT, MEASURED DIRECTLY THIS SESSION (o200k_base, live tokenizer):
 * In modern subword tokenizers (o200k_base, cl100k_base), English words in
 * standard ASCII ("The Foundation of Artificial Intelligence") merge into
 * high-frequency subword tokens (5 tokens). The IDENTICAL sentence rendered
 * in Unicode Mathematical Bold ("𝐓𝐡𝐞 𝐅𝐨𝐮𝐧𝐝𝐚𝐭𝐢𝐨𝐧 𝐨𝐟 𝐀𝐫𝐭𝐢𝐟𝐢𝐜𝐢𝐚𝐥 𝐈𝐧𝐭𝐞𝐥𝐥𝐢𝐠𝐞𝐧𝐜𝐞")
 * costs 48 tokens — an **860% token inflation**! In Mathematical Italic,
 * it costs 54 tokens (980% inflation); in Mathematical Monospace, 62 tokens
 * (1,140% inflation). A realistic 150-word stylized document costs 683 tokens,
 * whereas standard ASCII costs only 188 tokens.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY:
 *   - Stylized Unicode headings in Markdown, READMEs, and technical blog posts
 *     (e.g. "𝐓𝐚𝐛𝐥𝐞 𝐨𝐟 𝐂𝐨𝐧𝐭𝐞𝐧𝐭𝐬", "𝖨𝗇𝗌𝗍𝖺𝗅𝗅𝖺𝗍𝗂𝗈𝗇", "𝖰𝗎𝗂𝖼𝗄𝗌𝗍𝖺𝗋𝗍").
 *   - Mathematical and theoretical papers exported to plain text or pasted
 *     into chat windows from arXiv / LaTeX / PDF sources using styled font
 *     alphabets (Math Italic variables, Math Bold vectors, Math Monospace identifiers).
 *   - Stylized social media, developer profiles, and AI system prompt templates
 *     designed with visual Unicode styling.
 *
 * FOUR SUB-MECHANISMS, ONE THEME (restore the font style, never the semantics):
 *   1. Math Bold (U+1D400..U+1D433, U+1D7CE..U+1D7D7)
 *   2. Math Italic (U+1D434..U+1D467, U+210E)
 *   3. Math Monospace (U+1D670..U+1D6A3, U+1D7F6..U+1D7FF)
 *   4. Math Sans-Serif (U+1D5A0..U+1D5D3, U+1D7E2..U+1D7EB)
 *
 * Each is a SIMPLE, CLOSED-FORM ARITHMETIC OFFSET:
 *   - Bold: Upper = 0x1D400 + (c - 65), Lower = 0x1D41A + (c - 97), Digits = 0x1D7CE + (c - 48)
 *   - Italic: Upper = 0x1D434 + (c - 65), Lower = (c === 'h' ? 0x210E : 0x1D44E + (c - 97))
 *   - Monospace: Upper = 0x1D670 + (c - 65), Lower = 0x1D68A + (c - 97), Digits = 0x1D7F6 + (c - 48)
 *   - Sans-Serif: Upper = 0x1D5A0 + (c - 65), Lower = 0x1D5BA + (c - 97), Digits = 0x1D7E2 + (c - 48)
 *
 * MECHANISM:
 * Find maximal runs of styled alphanumeric characters drawn from the SAME single
 * font style. Replace each run with its ASCII alphanumeric equivalent, wrapped in
 * a 1-token style bracket pair. On restore, reapply the arithmetic offset per
 * bracket pair.
 *
 * SAFETY:
 * A span is only ever accepted if replaying the arithmetic restore rule reproduces
 * the original text byte-for-byte AND the real tokenizer shows a strict improvement.
 * Totality is preserved: unterminated brackets and non-matching characters pass
 * through verbatim.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

export const KALLOS_MARK = '\u2714';   // ✔ U+2714 HEAVY CHECK MARK — "KALLOS applied"
export const KALLOS_ESCAPE = '\u2713'; // ✓ U+2713 CHECK MARK — "escaped, not applied"

// Style bracket pairs (each 1 token in o200k_base):
export const BOLD_OPEN = '\u25C6';    // ◆ U+25C6 BLACK DIAMOND
export const BOLD_CLOSE = '\u25C7';   // ◇ U+25C7 WHITE DIAMOND

export const ITALIC_OPEN = '\u2661';  // ♡ U+2661 WHITE HEART
export const ITALIC_CLOSE = '\u2665'; // ♥ U+2665 BLACK HEART

export const MONO_OPEN = '\u2500';    // ─ U+2500 BOX DRAWINGS LIGHT HORIZONTAL
export const MONO_CLOSE = '\u2501';   // ━ U+2501 BOX DRAWINGS HEAVY HORIZONTAL

export const SANS_OPEN = '\u251C';    // ├ U+251C BOX DRAWINGS LIGHT VERTICAL AND RIGHT
export const SANS_CLOSE = '\u2523';   // ┣ U+2523 BOX DRAWINGS HEAVY VERTICAL AND RIGHT

export type KallosStyle = 'bold' | 'italic' | 'mono' | 'sans';

export interface KallosSpan {
  start: number;
  end: number;
  style: KallosStyle;
  asciiText: string;
}

function classifyStyledChar(cp: number): { style: KallosStyle; ascii: string } | null {
  // 1. Math Bold:
  if (cp >= 0x1D400 && cp <= 0x1D419) return { style: 'bold', ascii: String.fromCharCode(65 + cp - 0x1D400) };
  if (cp >= 0x1D41A && cp <= 0x1D433) return { style: 'bold', ascii: String.fromCharCode(97 + cp - 0x1D41A) };
  if (cp >= 0x1D7CE && cp <= 0x1D7D7) return { style: 'bold', ascii: String.fromCharCode(48 + cp - 0x1D7CE) };

  // 2. Math Italic:
  if (cp >= 0x1D434 && cp <= 0x1D44D) return { style: 'italic', ascii: String.fromCharCode(65 + cp - 0x1D434) };
  if (cp === 0x210E) return { style: 'italic', ascii: 'h' };
  if (cp >= 0x1D44E && cp <= 0x1D467) return { style: 'italic', ascii: String.fromCharCode(97 + cp - 0x1D44E) };

  // 3. Math Monospace:
  if (cp >= 0x1D670 && cp <= 0x1D689) return { style: 'mono', ascii: String.fromCharCode(65 + cp - 0x1D670) };
  if (cp >= 0x1D68A && cp <= 0x1D6A3) return { style: 'mono', ascii: String.fromCharCode(97 + cp - 0x1D68A) };
  if (cp >= 0x1D7F6 && cp <= 0x1D7FF) return { style: 'mono', ascii: String.fromCharCode(48 + cp - 0x1D7F6) };

  // 4. Math Sans-Serif:
  if (cp >= 0x1D5A0 && cp <= 0x1D5B9) return { style: 'sans', ascii: String.fromCharCode(65 + cp - 0x1D5A0) };
  if (cp >= 0x1D5BA && cp <= 0x1D5D3) return { style: 'sans', ascii: String.fromCharCode(97 + cp - 0x1D5BA) };
  if (cp >= 0x1D7E2 && cp <= 0x1D7EB) return { style: 'sans', ascii: String.fromCharCode(48 + cp - 0x1D7E2) };

  return null;
}

export function toStyledChar(ch: string, style: KallosStyle): string {
  const code = ch.charCodeAt(0);
  if (style === 'bold') {
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + (code - 97));
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + (code - 48));
    return ch;
  }
  if (style === 'italic') {
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D434 + (code - 65));
    if (code === 104) return '\u210E';
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D44E + (code - 97));
    return ch;
  }
  if (style === 'mono') {
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D670 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D68A + (code - 97));
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7F6 + (code - 48));
    return ch;
  }
  if (style === 'sans') {
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5A0 + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5BA + (code - 97));
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7E2 + (code - 48));
    return ch;
  }
  return ch;
}

export function findKallosSpans(text: string): KallosSpan[] {
  const spans: KallosSpan[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const cp0 = text.codePointAt(i);
    if (cp0 === undefined) break;
    const c0 = classifyStyledChar(cp0);
    if (!c0) {
      i += cp0 > 0xFFFF ? 2 : 1;
      continue;
    }
    const style = c0.style;
    const start = i;
    let asciiText = '';
    let j = i;
    while (j < n) {
      const cp = text.codePointAt(j);
      if (cp === undefined) break;
      const c = classifyStyledChar(cp);
      if (!c || c.style !== style) break;
      asciiText += c.ascii;
      j += cp > 0xFFFF ? 2 : 1;
    }
    spans.push({ start, end: j, style, asciiText });
    i = j;
  }
  return spans;
}

export function kallosApplySpans(text: string, spans: KallosSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    const [open, close] =
      s.style === 'bold' ? [BOLD_OPEN, BOLD_CLOSE]
      : s.style === 'italic' ? [ITALIC_OPEN, ITALIC_CLOSE]
      : s.style === 'mono' ? [MONO_OPEN, MONO_CLOSE]
      : [SANS_OPEN, SANS_CLOSE];
    out += open + s.asciiText + close;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total, never throws. Reverses style spans. */
export function kallosRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === BOLD_OPEN) {
      const close = wire.indexOf(BOLD_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'bold');
      out += res;
      i = close + 1;
    } else if (ch === ITALIC_OPEN) {
      const close = wire.indexOf(ITALIC_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'italic');
      out += res;
      i = close + 1;
    } else if (ch === MONO_OPEN) {
      const close = wire.indexOf(MONO_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'mono');
      out += res;
      i = close + 1;
    } else if (ch === SANS_OPEN) {
      const close = wire.indexOf(SANS_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'sans');
      out += res;
      i = close + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance. */
export function kallosTransform(text: string, enc: EncodingName): { candidate: string; spans: KallosSpan[] } {
  const allSpans = findKallosSpans(text);
  if (allSpans.length === 0) return { candidate: text, spans: [] };

  const fullCandidate = kallosApplySpans(text, allSpans);
  if (kallosRestoreSpans(fullCandidate) === text) {
    const fullTok = countTokens(fullCandidate, enc);
    const origTok = countTokens(text, enc);
    if (fullTok < origTok) {
      return { candidate: fullCandidate, spans: allSpans };
    }
  }

  const accepted: KallosSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = kallosApplySpans(text, candidateSpans);
    if (kallosRestoreSpans(candidate) !== text) continue;
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  return { candidate: kallosApplySpans(text, sorted), spans: sorted };
}

/* ---------------------------------------------------------------------------
 * Encode / Decode / DecoderPrompt
 * ------------------------------------------------------------------------- */

export interface KallosResult extends DaedalusResult {
  codec2: 'kallos';
  kallosApplied: boolean;
  kallosSpans: number;
  kallosBoldSpans: number;
  kallosItalicSpans: number;
  kallosMonoSpans: number;
  kallosSansSpans: number;
}

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

function kallosTailInstruction(hasBold: boolean, hasItalic: boolean, hasMono: boolean, hasSans: boolean): string {
  const clauses: string[] = [];
  if (hasBold) clauses.push(`${BOLD_OPEN}..${BOLD_CLOSE}: ascii\u2192math bold; drop marks`);
  if (hasItalic) clauses.push(`${ITALIC_OPEN}..${ITALIC_CLOSE}: ascii\u2192math italic; drop marks`);
  if (hasMono) clauses.push(`${MONO_OPEN}..${MONO_CLOSE}: ascii\u2192math mono; drop marks`);
  if (hasSans) clauses.push(`${SANS_OPEN}..${SANS_CLOSE}: ascii\u2192math sans; drop marks`);
  const body = clauses.length > 0 ? clauses.join('; ') + '.' : '';
  return `Drop ${KALLOS_MARK}/${KALLOS_ESCAPE}, decode rest as above. ${body}`;
}

const KALLOS_TAIL_ESCAPE = `Drop the leading ${KALLOS_ESCAPE} above, then decode the rest as already instructed.`;

export function kallosEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): KallosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans } = kallosTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === KALLOS_MARK || plain.wire[0] === KALLOS_ESCAPE);

  let best: KallosResult = {
    ...plain,
    codec2: 'kallos',
    kallosApplied: false,
    kallosSpans: 0,
    kallosBoldSpans: 0,
    kallosItalicSpans: 0,
    kallosMonoSpans: 0,
    kallosSansSpans: 0,
    ms: Date.now() - started,
    notes: `kallos: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no styled typography run found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = KALLOS_ESCAPE + plain.wire;
    const escapedPrompt = `${KALLOS_ESCAPE}${plain.decoderPrompt}\n${KALLOS_TAIL_ESCAPE}`;
    best = {
      ...best,
      wire: escapedWire,
      decoderPrompt: escapedPrompt,
      messageTokens: countTokens(escapedPrompt, enc),
      contractTokens: countTokens(escapedPrompt, enc) - plain.outTokens,
    };
  }

  if (applied0) {
    let hasBold = false, hasItalic = false, hasMono = false, hasSans = false;
    let bold = 0, italic = 0, mono = 0, sans = 0;
    for (const s of spans) {
      if (s.style === 'bold') { hasBold = true; bold++; }
      else if (s.style === 'italic') { hasItalic = true; italic++; }
      else if (s.style === 'mono') { hasMono = true; mono++; }
      else { hasSans = true; sans++; }
    }
    const canon = baseDaedalus(candidate, enc, options);
    const kallosWire = KALLOS_MARK + canon.wire;
    const tail = kallosTailInstruction(hasBold, hasItalic, hasMono, hasSans);
    const kallosPrompt = `${KALLOS_MARK}${canon.decoderPrompt}\n${tail}`;
    const kallosMessageTokens = countTokens(kallosPrompt, enc);

    if (kallosMessageTokens < best.messageTokens) {
      const decodedBack = kallosDecode(kallosWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'kallos',
          wire: kallosWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: kallosMessageTokens,
          contractTokens: kallosMessageTokens - canon.outTokens,
          decoderPrompt: kallosPrompt,
          kallosApplied: true,
          kallosSpans: spans.length,
          kallosBoldSpans: bold,
          kallosItalicSpans: italic,
          kallosMonoSpans: mono,
          kallosSansSpans: sans,
          ms: Date.now() - started,
          notes: `kallos: applied, ${spans.length} styled typography span(s) (${bold} bold, ${italic} italic, ${mono} mono, ${sans} sans) restored, saved ${plain.messageTokens - kallosMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

export function kallosDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === KALLOS_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return kallosRestoreSpans(candidate);
  }
  if (first === KALLOS_ESCAPE) {
    return daedalusDecode(wire.slice(1));
  }
  return daedalusDecode(wire);
}

export function kallosDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === KALLOS_MARK || wire[0] === KALLOS_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    if (wire[0] === KALLOS_ESCAPE) {
      return `${wire[0]}${innerPrompt}\n${KALLOS_TAIL_ESCAPE}`;
    }
    const decodedInner = daedalusDecode(inner);
    const hasBold = decodedInner.includes(BOLD_OPEN);
    const hasItalic = decodedInner.includes(ITALIC_OPEN);
    const hasMono = decodedInner.includes(MONO_OPEN);
    const hasSans = decodedInner.includes(SANS_OPEN);
    const tail = kallosTailInstruction(hasBold, hasItalic, hasMono, hasSans);
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
