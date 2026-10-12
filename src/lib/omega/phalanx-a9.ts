/**
 * src/lib/omega/phalanx-a9.ts
 * =============================================================================
 * PHALANX-A9 = PHALANX-A7 with VERITAS-N (nested-header dictionary) as its VX stage.
 *
 * WHAT CHANGES: only the VX stage. VERITAS-N (veritas-n.ts) keeps the VERITAS-U candidate set and single greedy
 * pass, but a header phrase may refer to the alias of a shorter entry (VXN wire). Layers A2, A3, A4, A5, A7 take the
 * VX encoder as a parameter (phalanx-a2.ts `vx`, default = VERITAS-A best-of-3), so A7 is unchanged.
 * WIRE / DECODE: the A9 wire is the A7 wire except that the VX block uses the VXN sentinel. phalanxA9Decode is the
 * A7 decoder, which dispatches the VXN sentinel through veritasADecode (flattenNestedHeader).
 * GUARD: phalanxA9Encode decodes its own output and throws on any mismatch. The A2 identity escape still applies.
 * =============================================================================
 */
import { type EncodingName } from './bpe';
import { phalanxA7Encode, phalanxA7Decode, type PhalanxA7Result } from './phalanx-a7';
import { veritasNEncode } from './veritas-n';

export interface PhalanxA9Result extends PhalanxA7Result {}

const vxN = (t: string, e: EncodingName) => veritasNEncode(t, e);

export function phalanxA9Decode(wire: string): string {
  return phalanxA7Decode(wire);
}

export function phalanxA9Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA9Result {
  const r = phalanxA7Encode(text, enc, vxN);
  const decoded = phalanxA9Decode(r.wire);
  if (decoded !== text) throw new Error('phalanx-a9: round trip failed');
  return r;
}
