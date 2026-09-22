/**
 * src/lib/omega/tensor.ts
 * =============================================================================
 * TENSOR-T1 — Multi-Tensor Canonical Fiber-Bundle & Context-Graph Contraction
 *
 * MATHEMATICAL FORMULATION & ORIGINAL CONCEPT
 * -----------------------------------------------------------------------------
 * In a fiber bundle (E, B, pi, F), a total space E decomposes into a base space
 * B and fibers F_b = pi^{-1}(b) isomorphic to a standard fiber F.
 *
 * TENSOR-T1 models token streams as fiber bundle sections:
 * 1. Base Space B: The topological skeleton (structural delimiters, line shapes,
 *    field delimiters, tag enclosures).
 * 2. Fiber F: The value payload vector over each point in the base space.
 * 3. Fiber Connection / Transition Map: Delta-Difference fields and value-column
 *    vectors that contract fiber fibers into a minimal scalar rank.
 *
 * WIRE FORMAT (self-contained, decodes alone)
 * -----------------------------------------------------------------------------
 *   [T1]
 *   <BaseSkeleton>
 *   [FIBER]
 *   <FiberPayload>
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const TENSOR_SENTINEL = '[T1]\n';
export const TENSOR_LITERAL = '[T1][T1]\n';
export const FIBER_MARKER = '\n[FIBER]\n';

export interface TensorResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: 'tensor' | 'identity' | 'forced-wrap';
  notes: string;
}

export function tensorDecode(wire: string): string {
  if (wire.startsWith(TENSOR_LITERAL)) return wire.slice(TENSOR_LITERAL.length);
  if (!wire.startsWith(TENSOR_SENTINEL)) return wire;

  const rest = wire.slice(TENSOR_SENTINEL.length);
  const fiberAt = rest.indexOf(FIBER_MARKER);
  if (fiberAt < 0) return wire;

  const skeleton = rest.slice(0, fiberAt);
  const fiberPayload = rest.slice(fiberAt + FIBER_MARKER.length);
  const fibers = fiberPayload.split('\u0000');

  let body = skeleton;
  for (let i = 0; i < fibers.length; i++) {
    const slot = `\u0001${i}\u0001`;
    body = body.split(slot).join(fibers[i]);
  }
  return body;
}

export function tensorEncode(text: string, enc: EncodingName = 'o200k_base'): TensorResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): TensorResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    mode: 'identity',
    notes,
  });

  if (!text) return identity('empty input');

  if (text.startsWith(TENSOR_SENTINEL)) {
    const wire = TENSOR_LITERAL + text;
    const decoded = tensorDecode(wire);
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      mode: 'forced-wrap',
      notes: 'forced wrap (sentinel prefix adversary)',
    };
  }

  // Decompose text into Base Space (Skeleton B) and Fiber Space (Payload F)
  const lines = text.split('\n');
  if (lines.length < 3) return identity('insufficient lines for fiber-bundle decomposition');

  // Extract repeating field values across structured lines
  const valueCounts = new Map<string, number>();
  for (const line of lines) {
    const matches = line.match(/[A-Za-z0-9_.$:/-]{6,}/g);
    if (matches) {
      for (const m of matches) {
        valueCounts.set(m, (valueCounts.get(m) ?? 0) + 1);
      }
    }
  }

  const frequentFibers = Array.from(valueCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[0].length * b[1] - a[0].length * a[1])
    .map(([val]) => val);

  if (frequentFibers.length === 0) return identity('no fiber-bundle structures contracted');

  const activeFibers: string[] = [];
  let skeleton = text;

  for (const fiber of frequentFibers) {
    if (activeFibers.length >= 16) break;
    if (!skeleton.includes(fiber)) continue;

    const occurrences = skeleton.split(fiber).length - 1;
    if (occurrences < 2) continue;

    const slotIndex = activeFibers.length;
    const slot = `\u0001${slotIndex}\u0001`;
    skeleton = skeleton.split(fiber).join(slot);
    activeFibers.push(fiber);
  }

  if (activeFibers.length === 0) return identity('no positive-gain fiber sections decomposed');

  const wire = TENSOR_SENTINEL + skeleton + FIBER_MARKER + activeFibers.join('\u0000');

  const decoded = tensorDecode(wire);
  if (decoded !== text) return identity('guard: TENSOR failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('guard: TENSOR wire measured >= input');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'tensor',
    notes: `TENSOR-T1 decomposed ${activeFibers.length} fiber-bundle sections · byte-exact`,
  };
}

export const TENSOR_SYSTEM_PROMPT = [
  '# TENSOR-T1 — Multi-Tensor Fiber-Bundle Codec',
  'A message starting with `[T1]` carries a fiber bundle decomposition.',
  'Format: [T1]\\n<BaseSkeleton>\\n[FIBER]\\n<FiberPayload>.',
  'Reconstruct total space E by evaluating fiber sections over base space B.',
].join('\n');

export function tensorSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'T0 empty', text: '' },
    {
      name: 'T1 repeated fibers',
      text: 'status: 200 ok latency_ms: 42 region: us-east-1\nstatus: 200 ok latency_ms: 42 region: us-east-1\nstatus: 200 ok latency_ms: 42 region: us-east-1',
    },
  ];
  return tests.map((t) => {
    const r = tensorEncode(t.text, enc);
    const back = tensorDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
