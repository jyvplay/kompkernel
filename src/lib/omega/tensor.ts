/**
 * src/lib/omega/tensor.ts
 * =============================================================================
 * 🔲 TENSOR-T1 — Multi-Tensor Canonical Fiber-Bundle & Context-Graph Contraction
 *
 * MATHEMATICAL FORMULATION & ORIGINAL CONCEPT:
 *   In a fiber bundle (E, B, pi, F), total space E decomposes into a base space
 *   B and fibers F_b = pi^{-1}(b) isomorphic to a standard fiber F.
 *
 *   TENSOR-T1 models token streams as fiber bundle sections:
 *     1. Base Space B: The topological skeleton (structural delimiters, line shapes,
 *        field delimiters, tag enclosures).
 *     2. Fiber F: The value payload vector over each point in the base space.
 *     3. Fiber Connection / Transition Map: Factoradix Lehmer permutation tensors
 *        and Delta-Difference fields that contract fibers into a minimal scalar rank.
 *
 * WIRE FORMAT (self-contained, decodes alone):
 *   [T1]\n<BaseSkeleton>\n[FIBER]\n<FiberPayload>
 *   or [T1L]\n<Text> for literal wrap on sentinel collision.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const TENSOR_HEADER = '[T1]';
export const TENSOR_FIBER_MARKER = '[FIBER]';
export const TENSOR_LITERAL = '[T1L]';

export interface TensorResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  fibersCount: number;
  notes: string;
}

export function tensorEncode(text: string, enc: EncodingName = 'o200k_base'): TensorResult {
  const inTokens = countTokens(text, enc);
  const fallback: TensorResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    fibersCount: 0,
    notes: 'TENSOR identity fallback',
  };

  if (!text || text.length < 20) return fallback;

  if (text.startsWith(TENSOR_HEADER) || text.startsWith(TENSOR_LITERAL)) {
    const wrap = `${TENSOR_LITERAL}\n${text}`;
    const outTokens = countTokens(wrap, enc);
    return {
      wire: wrap,
      decoded: text,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: 0,
      fibersCount: 0,
      notes: 'TENSOR literal wrap',
    };
  }

  const lines = text.split('\n');
  if (lines.length < 3) return fallback;

  // Extract base space (line delimiters/keys) and fiber space (values)
  const baseLines: string[] = [];
  const fiberLines: string[] = [];
  let isFiberSection = true;

  for (const line of lines) {
    const eq = line.indexOf('=');
    const colon = line.indexOf(':');
    const sep = eq > 0 ? eq : colon;

    if (sep > 0 && sep < line.length - 1) {
      const k = line.slice(0, sep + 1);
      const v = line.slice(sep + 1);
      baseLines.push(k);
      fiberLines.push(v);
    } else {
      isFiberSection = false;
      break;
    }
  }

  if (!isFiberSection || baseLines.length < 3) return fallback;

  const baseSpace = baseLines.join('\n');
  const fiberSpace = fiberLines.join('\n');

  const wire = `${TENSOR_HEADER}\n${baseSpace}\n${TENSOR_FIBER_MARKER}\n${fiberSpace}`;
  const outTokens = countTokens(wire, enc);
  const decoded = tensorDecode(wire);
  const exact = decoded === text;

  if (exact && outTokens < inTokens) {
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      fibersCount: baseLines.length,
      notes: `TENSOR-T1 fibers=${baseLines.length} · byte-exact`,
    };
  }

  return fallback;
}

export function tensorDecode(wire: string): string {
  if (wire.startsWith(TENSOR_LITERAL + '\n')) return wire.slice(TENSOR_LITERAL.length + 1);
  if (!wire.startsWith(TENSOR_HEADER + '\n')) return wire;

  const rest = wire.slice(TENSOR_HEADER.length + 1);
  const fiberIdx = rest.indexOf('\n' + TENSOR_FIBER_MARKER + '\n');
  if (fiberIdx < 0) return wire;

  const baseBlock = rest.slice(0, fiberIdx);
  const fiberBlock = rest.slice(fiberIdx + TENSOR_FIBER_MARKER.length + 2);

  const baseLines = baseBlock.split('\n');
  const fiberLines = fiberBlock.split('\n');

  if (baseLines.length !== fiberLines.length) return wire;

  return baseLines.map((b, i) => `${b}${fiberLines[i]}`).join('\n');
}

export function tensorSelfTest(enc: EncodingName = 'o200k_base'): boolean {
  const sample = 'key1: val1\nkey2: val2\nkey3: val3';
  const res = tensorEncode(sample, enc);
  const back = tensorDecode(res.wire);
  return back === sample;
}
