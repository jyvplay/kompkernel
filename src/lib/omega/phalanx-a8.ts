/**
 * src/lib/omega/phalanx-a8.ts
 * =============================================================================
 * PHALANX-A8 = PHALANX-A7 with the VERITAS-U single-pass union dictionary as its VX stage.
 *
 * WHAT CHANGES
 *   Only the VX stage. VERITAS-U (veritas-u.ts: one greedy pass over the union of windows 2,3,4, one exact
 *   whole-wire gate) replaces VERITAS-A best-of-3 (three greedy passes, keep the smallest). Layers A2, A3, A4, A5, A7
 *   accept an optional `vx` encoder (default = VERITAS-A best-of-3, so A7 output is unchanged; checked on 4 files).
 *   Every gate in those layers is kept as is and now measures the VX encoder that is passed in.
 * WIRE AND DECODE
 *   The A8 wire is the A7 wire (VXA sentinel, VXA legend). phalanxA8Decode = phalanxA7Decode.
 * GUARD
 *   phalanxA8Encode decodes its own output and throws on any mismatch. The A2 identity fallback still applies.
 * MEASURED: see bench/z31/ (receipts, not in this comment). Lane results are reported per lane, not averaged.
 * =============================================================================
 */
import { type EncodingName } from './bpe';
import { phalanxA7Encode, phalanxA7Decode, type PhalanxA7Result } from './phalanx-a7';
import { veritasUEncode } from './veritas-u';

export interface PhalanxA8Result extends PhalanxA7Result {}

const vxU = (t: string, e: EncodingName) => veritasUEncode(t, e);

export function phalanxA8Decode(wire: string): string {
  return phalanxA7Decode(wire);
}

export function phalanxA8Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA8Result {
  const r = phalanxA7Encode(text, enc, vxU);
  const decoded = phalanxA8Decode(r.wire);
  if (decoded !== text) throw new Error('phalanx-a8: round trip failed');
  return r;
}
