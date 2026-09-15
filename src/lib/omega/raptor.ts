/**
 * RAPTOR-T1 — tokenizer-aware dynamic parsing of readable copy spans.
 *
 * Recent lossless token-sequence work motivates a useful distinction from the
 * existing greedy character REPLAY lane: choosing the longest local match is
 * not the same as minimizing the delivered tokenizer cost. RAPTOR searches a
 * bounded shortest path over literal and backward-copy spans, scoring every
 * candidate with the live BPE tokenizer. Literals are length-delimited, so
 * arbitrary prose, JSON, CSV, code, newlines, semicolons, and CJK remain raw and
 * readable without escape inflation.
 *
 * Wire:
 *   [RT1]\n
 *   Ln:text       append n UTF-16 units
 *   Rd,l;         copy l units from d units before the current output
 *
 * This is not a tournament wrapper or a binary LZ codec. It is admitted only
 * after full-wire token measurement, exact decoding, and a delivered-cost gate;
 * identity is retained when the bounded parse is not useful.
 */
import { countTokens, type EncodingName } from './bpe';

const SENTINEL = '[RT1]\n';
const MIN_MATCH = 8;
const MAX_LOOKBACK = 4096;
const MAX_MATCH = 4096;
const MAX_INPUT = 300_000;
const MAX_LITERAL_EDGE = 256;

export const RAPTOR_SYSTEM_PROMPT =
  'RT1: Ln:text appends n UTF-16 units; Rd,l; copies l units d back; parse forward; exact.';

export interface RaptorResult {
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
  source: 'raptor' | 'identity' | 'forced-wrap';
  references: number;
  edges: number;
  notes: string;
  encodeMs: number;
}

function natural(text: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

export function raptorDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const body = wire.slice(SENTINEL.length);
  let out = '';
  let i = 0;
  while (i < body.length) {
    const tag = body[i++];
    if (tag === 'L') {
      const colon = body.indexOf(':', i);
      if (colon < 0) return wire;
      const length = natural(body.slice(i, colon));
      if (length === null || length < 0 || i === colon || colon + 1 + length > body.length) return wire;
      out += body.slice(colon + 1, colon + 1 + length);
      i = colon + 1 + length;
      continue;
    }
    if (tag !== 'R') return wire;
    const end = body.indexOf(';', i);
    if (end < 0) return wire;
    const fields = body.slice(i, end).split(',');
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

interface Match { distance: number; length: number }

function matchesAt(text: string, at: number): Match[] {
  const found: Match[] = [];
  const first = Math.max(0, at - MAX_LOOKBACK);
  for (let start = at - 1; start >= first; start--) {
    let length = 0;
    while (
      length < MAX_MATCH &&
      at + length < text.length &&
      text[start + (length % (at - start))] === text[at + length]
    ) length++;
    if (length >= MIN_MATCH) found.push({ distance: at - start, length });
    // The nearest occurrence is usually the cheapest distance spelling. Keep
    // the search bounded; the final full-wire gate remains authoritative.
    if (found.length >= 24) break;
  }
  found.sort((a, b) => b.length - a.length || a.distance - b.distance);
  const unique: Match[] = [];
  const seen = new Set<string>();
  for (const match of found) {
    const key = `${match.distance},${match.length}`;
    if (!seen.has(key)) {
      unique.push(match);
      seen.add(key);
    }
    if (unique.length >= 12) break;
  }
  return unique;
}

function candidateLengths(max: number): number[] {
  const values = new Set<number>([MIN_MATCH, max]);
  for (let n = MIN_MATCH; n < max; n *= 2) values.add(n);
  for (const n of [Math.floor(max / 2), Math.floor(max / 3), max - 1]) {
    if (n >= MIN_MATCH && n <= max) values.add(n);
  }
  return [...values].sort((a, b) => a - b);
}

interface State { cost: number; wire: string; references: number; edges: number }

export function raptorEncode(text: string, enc: EncodingName = 'o200k_base'): RaptorResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): RaptorResult => {
    if (text.startsWith(SENTINEL)) {
      const wire = SENTINEL + `L${text.length}:${text}`;
      const decoded = raptorDecode(wire);
      const outTokens = countTokens(wire, enc);
      const contractTokens = countTokens(RAPTOR_SYSTEM_PROMPT, enc);
      return {
        wire, decoded, exact: decoded === text, inTokens, outTokens,
        contractPrompt: RAPTOR_SYSTEM_PROMPT, contractTokens,
        deliveredTokens: outTokens + contractTokens,
        deliveredVsRaw: inTokens - outTokens - contractTokens,
        savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
        source: 'forced-wrap', references: 0, edges: 1,
        notes: `${notes}; sentinel collision repaired with a literal RAPTOR frame`,
        encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
      };
    }
    return {
      wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
      contractPrompt: '', contractTokens: 0, deliveredTokens: inTokens,
      deliveredVsRaw: 0, savingsPct: 0, source: 'identity', references: 0, edges: 0,
      notes, encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
    };
  };
  if (!text) return identity('empty input');
  if (text.length > MAX_INPUT) return identity('over RAPTOR bounded parse limit');

  const best: Array<State | null> = Array(text.length + 1).fill(null);
  best[0] = { cost: countTokens(SENTINEL, enc), wire: '', references: 0, edges: 0 };
  for (let at = 0; at < text.length; at++) {
    const state = best[at];
    if (!state) continue;
    const update = (next: number, segment: string, references: number) => {
      const candidate: State = {
        cost: state.cost + countTokens(segment, enc),
        wire: state.wire + segment,
        references: state.references + references,
        edges: state.edges + 1,
      };
      if (!best[next] || candidate.cost < best[next]!.cost) best[next] = candidate;
    };
    for (const length of [1, 4, 8, 16, 32, 64, 128, MAX_LITERAL_EDGE]) {
      const next = Math.min(text.length, at + length);
      if (next > at) update(next, `L${next - at}:${text.slice(at, next)}`, 0);
    }
    for (const match of matchesAt(text, at)) {
      for (const length of candidateLengths(match.length)) {
        if (at + length <= text.length) update(at + length, `R${match.distance},${length};`, 1);
      }
    }
  }

  const state = best[text.length];
  if (!state) return identity('no bounded parse');
  const wire = SENTINEL + state.wire;
  const decoded = raptorDecode(wire);
  const outTokens = countTokens(wire, enc);
  const contractTokens = countTokens(RAPTOR_SYSTEM_PROMPT, enc);
  const deliveredTokens = outTokens + contractTokens;
  if (decoded !== text) return identity('guard: RAPTOR reconstruction failed');
  if (deliveredTokens >= inTokens) return identity('delivered-token gate rejected RAPTOR');
  return {
    wire, decoded, exact: true, inTokens, outTokens,
    contractPrompt: RAPTOR_SYSTEM_PROMPT, contractTokens, deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    source: 'raptor', references: state.references, edges: state.edges,
    notes: `RAPTOR verified tokenizer-cost parse · ${state.references} copy edges/${state.edges} total edges · delivered ${deliveredTokens}`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export interface RaptorSelfTest { name: string; pass: boolean; details: string }

export function raptorSelfTest(enc: EncodingName = 'o200k_base'): RaptorSelfTest[] {
  const cases = [
    '',
    'abc'.repeat(300),
    'prose; JSON {"ok":true}\n中文\n'.repeat(32),
    '[RT1]\nnot a wire',
    'A'.repeat(400) + '\n' + 'B'.repeat(400),
  ];
  return cases.map((text, index) => {
    const result = raptorEncode(text, enc);
    return {
      name: `case ${index + 1}`,
      pass: result.exact && raptorDecode(result.wire) === text && (result.deliveredTokens <= result.inTokens || result.source === 'forced-wrap'),
      details: `${result.deliveredTokens}/${result.inTokens}; ${result.notes}`,
    };
  });
}
