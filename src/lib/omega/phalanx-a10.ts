/**
 * src/lib/omega/phalanx-a10.ts
 * =============================================================================
 * PHALANX-A10 = PHALANX-A7 with VERITAS-C as its VX stage.
 *
 * WHAT CHANGES: only the VX stage. VERITAS-C (veritas-c.ts) = VERITAS-U token-window candidates, then character
 * substring candidates (length 4..80), one greedy pass with an exact whole-wire gate, a nested header, and an
 * equals-free header line format (VXC wire). Layers A2, A3, A4, A5, A7 take the VX encoder as a parameter
 * (phalanx-a2.ts `vx`, default = VERITAS-A best-of-3), so A7 is unchanged.
 * WIRE / DECODE: the A10 wire is the A7 wire whose VX block uses the VXC sentinel. phalanxA10Decode is the A7
 * decoder; it dispatches the VXC sentinel through veritasADecode (flattenNestedHeader).
 * GUARD: phalanxA10Encode decodes its own output and throws on any mismatch. The A2 identity escape still applies.
 * =============================================================================
 */
import { type EncodingName } from './bpe';
import { phalanxA7Encode, phalanxA7Decode, type PhalanxA7Result } from './phalanx-a7';
import { veritasCEncode } from './veritas-c';

export interface PhalanxA10Result extends PhalanxA7Result {}

const vxC = (t: string, e: EncodingName) => veritasCEncode(t, e);

export function phalanxA10Decode(wire: string): string {
  return phalanxA7Decode(wire);
}

export function phalanxA10Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA10Result {
  const r = phalanxA7Encode(text, enc, vxC);
  const decoded = phalanxA10Decode(r.wire);
  if (decoded !== text) throw new Error('phalanx-a10: round trip failed');
  return r;
}
