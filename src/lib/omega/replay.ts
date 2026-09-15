/**
 * REPLAY-R1 — readable LZ-style substring references.
 *
 * Unlike phrase dictionaries, REPLAY pays no global legend: a segment either
 * carries literal text or points backward into the already decoded character
 * stream. Unlike line/column codecs, references may cross line boundaries and
 * may copy arbitrary substrings. The delimiter grammar is textual and every
 * segment is decoded forward, so the wire remains directly inspectable.
 *
 * This is deliberately not the binary LZ77 lane used by Ω-Ξ. REPLAY emits
 * readable `L...;` literals and `Rdistance,length;` references, measures them
 * with the live tokenizer, and falls back to identity unless the full wire is
 * exact and cheaper.
 */
import { countTokens, type EncodingName } from './bpe';

const SENTINEL = '[RP1]\n';
const SEGMENT_END = ';';
const MIN_MATCH = 8;
const MAX_LOOKBACK = 4096;
const MAX_MATCH = 4096;

export const REPLAY_SYSTEM_PROMPT =
  'RP1: Lx; literal, or Rd,l; copy l UTF-16 chars from d back; forward; L escapes \\n LF, \\; ;, \\\\ \\.';

export interface ReplayResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  contractPrompt: string;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  savingsPct: number;
  source: 'replay' | 'identity' | 'forced-wrap';
  references: number;
  notes: string;
  encodeMs: number;
}

function escapeLiteral(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') out += '\\\\';
    else if (c === ';') out += '\\;';
    else if (c === '\n') out += '\\n';
    else out += c;
  }
  return out;
}

function readLiteral(payload: string, start: number): { value: string; next: number } | null {
  let out = '';
  for (let i = start; i < payload.length; i++) {
    const c = payload[i];
    if (c === SEGMENT_END) return { value: out, next: i + 1 };
    if (c !== '\\') {
      out += c;
      continue;
    }
    const next = payload[++i];
    if (next === 'n') out += '\n';
    else if (next === ';' || next === '\\') out += next;
    else return null;
  }
  return null;
}

function natural(text: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

export function replayDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const payload = wire.slice(SENTINEL.length);
  let out = '';
  let i = 0;
  while (i < payload.length) {
    const tag = payload[i++];
    if (tag === 'L') {
      const literal = readLiteral(payload, i);
      if (!literal) return wire;
      out += literal.value;
      i = literal.next;
      continue;
    }
    if (tag !== 'R') return wire;
    const end = payload.indexOf(SEGMENT_END, i);
    if (end < 0) return wire;
    const fields = payload.slice(i, end).split(',');
    if (fields.length !== 2) return wire;
    const distance = natural(fields[0]);
    const length = natural(fields[1]);
    if (distance === null || length === null || distance < 1 || distance > out.length || length < MIN_MATCH || length > MAX_MATCH) return wire;
    const start = out.length - distance;
    for (let j = 0; j < length; j++) {
      const source = start + j;
      if (source < 0 || source >= out.length) return wire;
      out += out[source];
    }
    i = end + 1;
  }
  return out;
}

function longestMatch(text: string, at: number): { distance: number; length: number } | null {
  if (at >= text.length) return null;
  const first = Math.max(0, at - MAX_LOOKBACK);
  let bestDistance = 0;
  let bestLength = 0;
  for (let start = at - 1; start >= first; start--) {
    let length = 0;
    while (
      length < MAX_MATCH &&
      at + length < text.length &&
      text[start + (length % (at - start))] === text[at + length]
    ) length++;
    if (length > bestLength) {
      bestLength = length;
      bestDistance = at - start;
      if (bestLength === MAX_MATCH) break;
    }
  }
  return bestLength >= MIN_MATCH ? { distance: bestDistance, length: bestLength } : null;
}

export function replayEncode(text: string, enc: EncodingName = 'o200k_base'): ReplayResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): ReplayResult => {
    // A literal identity beginning with the protocol sentinel would be
    // ambiguous to a receiver. Pay the explicit wrapper cost rather than
    // returning an unsafe raw wire.
    if (text.startsWith(SENTINEL)) {
      const wire = SENTINEL + `L${escapeLiteral(text)}${SEGMENT_END}`;
      const outTokens = countTokens(wire, enc);
      const contractTokens = countTokens(REPLAY_SYSTEM_PROMPT, enc);
      return {
        wire,
        decoded: replayDecode(wire),
        exact: replayDecode(wire) === text,
        inTokens,
        outTokens,
        contractPrompt: REPLAY_SYSTEM_PROMPT,
        contractTokens,
        deliveredTokens: outTokens + contractTokens,
        deliveredVsRaw: inTokens - outTokens - contractTokens,
        savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
        source: 'forced-wrap',
        references: 0,
        notes: `${notes}; sentinel collision repaired with a literal REPLAY frame`,
        encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
      };
    }
    return {
      wire: text,
      decoded: text,
      exact: true,
      inTokens,
      outTokens: inTokens,
      contractPrompt: '',
      contractTokens: 0,
      deliveredTokens: inTokens,
      deliveredVsRaw: 0,
      savingsPct: 0,
      source: 'identity',
      references: 0,
      notes,
      encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
    };
  };
  if (!text) return identity('empty input');

  let payload = '';
  let literal = '';
  let references = 0;
  let i = 0;
  const flushLiteral = () => {
    if (literal) {
      payload += `L${escapeLiteral(literal)}${SEGMENT_END}`;
      literal = '';
    }
  };
  while (i < text.length) {
    const match = longestMatch(text, i);
    if (!match) {
      literal += text[i++];
      continue;
    }
    const ref = `R${match.distance},${match.length}${SEGMENT_END}`;
    const raw = text.slice(i, i + match.length);
    const literalCost = countTokens(`L${escapeLiteral(raw)}${SEGMENT_END}`, enc);
    const refCost = countTokens(ref, enc);
    if (refCost < literalCost) {
      flushLiteral();
      payload += ref;
      i += match.length;
      references++;
    } else {
      literal += text[i++];
    }
  }
  flushLiteral();

  const wire = SENTINEL + payload;
  const decoded = replayDecode(wire);
  const outTokens = countTokens(wire, enc);
  const contractTokens = countTokens(REPLAY_SYSTEM_PROMPT, enc);
  const deliveredTokens = outTokens + contractTokens;
  if (decoded !== text) return identity('guard: REPLAY reconstruction failed');
  if (deliveredTokens >= inTokens) return identity('delivered-token gate rejected REPLAY');
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    contractPrompt: REPLAY_SYSTEM_PROMPT,
    contractTokens,
    deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    source: 'replay',
    references,
    notes: `REPLAY verified forward substring references · ${references} references · delivered ${deliveredTokens}`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export interface ReplaySelfTest { name: string; pass: boolean; details: string }

export function replaySelfTest(enc: EncodingName = 'o200k_base'): ReplaySelfTest[] {
  const cases = [
    '',
    'alpha; beta\nalpha; beta\nalpha; beta',
    'abc'.repeat(900),
    'prose JSON 中文 code\n'.repeat(30),
    'backslash \\ and semicolon ; and newline\nend',
  ];
  return cases.map((text, i) => {
    const result = replayEncode(text, enc);
    return {
      name: `case ${i + 1}`,
      pass: result.exact && replayDecode(result.wire) === text && result.deliveredTokens <= result.inTokens,
      details: `${result.deliveredTokens}/${result.inTokens}; ${result.notes}`,
    };
  });
}
