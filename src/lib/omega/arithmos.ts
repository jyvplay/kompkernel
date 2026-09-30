/**
 * ARITHMOS — native-decimal restoration with a self-contained exact inverse.
 *
 * A homogeneous Arabic-Indic, Persian, Devanagari, Bengali, or Thai digit run
 * has the same positional decimal values as ASCII but can be expensive under
 * o200k_base. ARITHMOS uses a visible, reversible Unicode contract instead of
 * lossy normalization: ⟪A123⟫ restores one run; ⟪A:...⟫ restores every ASCII
 * digit in a whole unambiguous document at A's Unicode decimal base.
 *
 * The four framing glyphs are intentionally fixed by the public contract:
 * U+25D0 ◐, U+25D1 ◑, U+27EA ⟪, and U+27EB ⟫. A source containing an inner
 * bracket is conservatively declined rather than risk interpreting a literal
 * source substring as an ARITHMOS span.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusOptions, type DaedalusResult } from './daedalus';
import { CHIRON_START } from './chiron';

/** Outer wire discriminator (U+25D0). */
export const ARITHMOS_MARK = '◐';
/** Escape discriminator when an ordinary DAEDALUS wire starts with ◐/◑ (U+25D1). */
export const ARITHMOS_ESCAPE = '◑';
/** Inner span opener (U+27EA). */
export const ARITHMOS_OPEN = '⟪';
/** Inner span closer (U+27EB). */
export const ARITHMOS_CLOSE = '⟫';

type ScriptKey = 'arabicIndic' | 'persian' | 'devanagari' | 'bengali' | 'thai';

interface DigitScript {
  key: ScriptKey;
  /** One ASCII letter makes a compact unambiguous inner opcode. */
  tag: string;
  base: number;
  label: string;
}

const SCRIPTS: readonly DigitScript[] = [
  { key: 'arabicIndic', tag: 'A', base: 0x0660, label: 'Arabic-Indic' },
  { key: 'persian', tag: 'P', base: 0x06f0, label: 'Extended Arabic-Indic/Persian' },
  { key: 'devanagari', tag: 'D', base: 0x0966, label: 'Devanagari' },
  { key: 'bengali', tag: 'B', base: 0x09e6, label: 'Bengali' },
  { key: 'thai', tag: 'T', base: 0x0e50, label: 'Thai' },
] as const;
const BY_TAG = new Map(SCRIPTS.map((s) => [s.tag, s]));

function scriptAt(text: string, offset: number): DigitScript | undefined {
  const cp = text.codePointAt(offset);
  if (cp === undefined) return undefined;
  return SCRIPTS.find((s) => cp >= s.base && cp <= s.base + 9);
}

function nativeToAscii(ch: string, script: DigitScript): string {
  return String.fromCharCode(0x30 + ch.codePointAt(0)! - script.base);
}

export interface ArithmosSpan {
  start: number;
  end: number;
  script: ScriptKey;
}

/** Find maximal homogeneous native-decimal runs; mixed/ASCII boundaries split. */
export function findArithmosSpans(text: string): ArithmosSpan[] {
  const spans: ArithmosSpan[] = [];
  let i = 0;
  while (i < text.length) {
    const script = scriptAt(text, i);
    if (!script) { i++; continue; }
    const start = i;
    while (i < text.length && scriptAt(text, i)?.key === script.key) i++;
    spans.push({ start, end: i, script: script.key });
  }
  return spans;
}

function scriptFor(key: ScriptKey): DigitScript {
  return SCRIPTS.find((s) => s.key === key)!;
}

export function arithmosApplySpans(text: string, spans: ArithmosSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const span of spans) {
    const script = scriptFor(span.script);
    out += text.slice(cursor, span.start);
    const ascii = Array.from(text.slice(span.start, span.end)).map((ch) => nativeToAscii(ch, script)).join('');
    out += `${ARITHMOS_OPEN}${script.tag}${ascii}${ARITHMOS_CLOSE}`;
    cursor = span.end;
  }
  return out + text.slice(cursor);
}

/** Total restore: malformed/unterminated/literal spans remain literal. */
export function arithmosRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  while (i < wire.length) {
    if (wire[i] !== ARITHMOS_OPEN) { out += wire[i++]; continue; }
    const close = wire.indexOf(ARITHMOS_CLOSE, i + 1);
    if (close === -1) { out += wire[i++]; continue; }
    const script = BY_TAG.get(wire[i + 1]);
    const global = wire[i + 2] === ':';
    const inner = wire.slice(i + (global ? 3 : 2), close);
    if (!script || (!global && !/^[0-9]+$/.test(inner))) {
      out += wire.slice(i, close + 1);
      i = close + 1;
      continue;
    }
    for (const ch of inner) {
      out += global && /^[0-9]$/.test(ch) ? String.fromCodePoint(script.base + ch.charCodeAt(0) - 0x30) : ch;
    }
    i = close + 1;
  }
  return out;
}

/** Greedy exact/economic gate, as used by the other restoration pre-passes. */
export function arithmosTransform(text: string, enc: EncodingName): { candidate: string; spans: ArithmosSpan[] } {
  // Literal bracket source is ambiguous under the visible decoder rule. Do not
  // invent a second escaping sub-language: decline so arbitrary text stays exact.
  if (text.includes(ARITHMOS_OPEN) || text.includes(ARITHMOS_CLOSE)) return { candidate: text, spans: [] };
  const available = findArithmosSpans(text);
  if (!available.length) return { candidate: text, spans: [] };

  // A document with just one native decimal system and no source ASCII digits
  // admits a much cheaper container form: ⟪A:whole document⟫. The decoder maps
  // every digit in that container, so there is one bracket pair rather than one
  // expensive pair per invoice/date run. This is the operational prose lane;
  // mixed-script or ASCII-number documents continue to use per-run candidates.
  const scripts = [...new Set(available.map((span) => span.script))];
  if (scripts.length === 1 && !/[0-9]/.test(text)) {
    const script = scriptFor(scripts[0]);
    let asciiDocument = '';
    for (let i = 0; i < text.length;) {
      const width = text.codePointAt(i)! > 0xffff ? 2 : 1;
      const part = text.slice(i, i + width);
      asciiDocument += scriptAt(text, i)?.key === script.key ? nativeToAscii(part, script) : part;
      i += width;
    }
    const global = `${ARITHMOS_OPEN}${script.tag}:${asciiDocument}${ARITHMOS_CLOSE}`;
    if (arithmosRestoreSpans(global) === text && countTokens(global, enc) < countTokens(text, enc)) {
      return { candidate: global, spans: available };
    }
  }

  const accepted: ArithmosSpan[] = [];
  let cost = countTokens(text, enc);
  for (const span of available) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = arithmosApplySpans(text, candidateSpans);
    if (arithmosRestoreSpans(candidate) !== text) continue;
    const candidateCost = countTokens(candidate, enc);
    if (candidateCost < cost) { accepted.push(span); cost = candidateCost; }
  }
  const spans = accepted.sort((a, b) => a.start - b.start);
  return { candidate: arithmosApplySpans(text, spans), spans };
}

export interface ArithmosResult extends DaedalusResult {
  codec2: 'arithmos';
  arithmosApplied: boolean;
  arithmosSpans: number;
  arithmosScripts: ScriptKey[];
}

function tail(scripts: ScriptKey[]): string {
  const clauses = scripts.map((key) => {
    const s = scriptFor(key);
    return `${s.tag}=U+${s.base.toString(16).toUpperCase()}`;
  });
  return `Drop ${ARITHMOS_MARK}/${ARITHMOS_ESCAPE}, decode rest as above. For ${ARITHMOS_OPEN}Xdigits${ARITHMOS_CLOSE}, replace digits with U+base+d; for ${ARITHMOS_OPEN}X:text${ARITHMOS_CLOSE}, do so for every ASCII digit in text; ${clauses.join(', ')}; drop brackets/tag.`;
}
const ESCAPE_TAIL = `Drop leading ${ARITHMOS_ESCAPE}, then decode the rest as above.`;

export function arithmosEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): ArithmosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const { candidate, spans } = arithmosTransform(text, enc);
  const plain = daedalusEncode(text, enc, options);
  const collision = plain.wire.startsWith(ARITHMOS_MARK) || plain.wire.startsWith(ARITHMOS_ESCAPE);
  let best: ArithmosResult = {
    ...plain, codec2: 'arithmos', arithmosApplied: false, arithmosSpans: 0, arithmosScripts: [],
    ms: Date.now() - started,
    notes: `arithmos: not applied (${spans.length ? 'verified spans did not repay the inline rule' : 'no unambiguous profitable native-digit run found'}); ${plain.notes}`,
  };

  if (collision) {
    const decoderPrompt = `${ARITHMOS_ESCAPE}${plain.decoderPrompt}\n${ESCAPE_TAIL}`;
    best = { ...best, wire: ARITHMOS_ESCAPE + plain.wire, decoderPrompt,
      messageTokens: countTokens(decoderPrompt, enc), contractTokens: countTokens(decoderPrompt, enc) - plain.outTokens };
  }

  if (spans.length && candidate !== text) {
    const canon = daedalusEncode(candidate, enc, options);
    const scripts = [...new Set(spans.map((s) => s.script))];
    const wire = ARITHMOS_MARK + canon.wire;
    const decoderPrompt = `${ARITHMOS_MARK}${canon.decoderPrompt}\n${tail(scripts)}`;
    const messageTokens = countTokens(decoderPrompt, enc);
    if (messageTokens < best.messageTokens && arithmosDecode(wire) === text) {
      best = {
        ...canon, codec2: 'arithmos', wire, decoded: text, exact: true, inTokens,
        decoderPrompt, messageTokens, contractTokens: messageTokens - canon.outTokens,
        arithmosApplied: true, arithmosSpans: spans.length, arithmosScripts: scripts,
        ms: Date.now() - started,
        notes: `arithmos: restored ${spans.length} native-digit span(s) in ${scripts.join(', ')}, saved ${plain.messageTokens - messageTokens} tok over plain DAEDALUS; ${canon.notes}`,
      };
    }
  }
  return best;
}

export function arithmosDecode(wire: string): string {
  if (!wire) return wire;
  if (wire[0] === ARITHMOS_MARK) return arithmosRestoreSpans(daedalusDecode(wire.slice(1)));
  if (wire[0] === ARITHMOS_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}

export function arithmosDecoderPrompt(wire: string): string {
  if (wire[0] !== ARITHMOS_MARK && wire[0] !== ARITHMOS_ESCAPE) {
    return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
  }
  const inner = wire.slice(1);
  const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
  if (wire[0] === ARITHMOS_ESCAPE) return `${wire[0]}${innerPrompt}\n${ESCAPE_TAIL}`;
  const decoded = daedalusDecode(inner);
  const keys = new Set<ScriptKey>();
  for (let i = 0; i < decoded.length; i++) {
    if (decoded[i] !== ARITHMOS_OPEN) continue;
    const script = BY_TAG.get(decoded[i + 1]);
    const close = decoded.indexOf(ARITHMOS_CLOSE, i + 2);
    const body = decoded.slice(i + 2, close);
    if (script && close !== -1 && (body.startsWith(':') || /^[0-9]+$/.test(body))) keys.add(script.key);
  }
  return `${wire[0]}${innerPrompt}\n${tail([...keys])}`;
}
