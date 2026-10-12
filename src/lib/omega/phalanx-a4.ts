/**
 * src/lib/omega/phalanx-a4.ts
 * =============================================================================
 * PHALANX-A4 — LOGTPL template stage over PHALANX-A3 (exact, byte-perfect, self-verified, identity-guarded).
 *
 * WIRE
 *   "[[TPL\n" + A3 wire of logTplFold(text)     when the template stage is used
 *   otherwise the A3 wire of the text, unchanged.
 * DECODE
 *   wire starts with "[[TPL\n" -> logTplUnfold(A3-decode(rest)); else A3-decode(wire).
 * GUARD
 *   The template stage is used only if its wire is strictly cheaper (o200k) than the A3 wire. An input that
 *   starts with "[[TPL\n" is always carried by the template stage, so the prefix is never ambiguous.
 * HONEST SCOPE: the template stage wins on tabular ops text (for example git numstat). On prose, JSON,
 *   code, and hash-heavy logs it loses and the guard keeps A3 unchanged.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { phalanxA3Encode, phalanxA3Decode } from './phalanx-a3';
import { logTplFold, logTplUnfold } from './logtpl';

export const PHALANX_A4_TPL = '[[TPL\n';

export interface PhalanxA4Result { wire: string; decoded: string; exact: boolean; layer: 'a3' | 'tpl'; inTokens: number; outTokens: number }

export function phalanxA4Decode(wire: string): string {
  if (wire.startsWith(PHALANX_A4_TPL)) return logTplUnfold(phalanxA3Decode(wire.slice(PHALANX_A4_TPL.length)));
  return phalanxA3Decode(wire);
}

export function phalanxA4Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA4Result {
  const a3 = phalanxA3Encode(text, enc);
  const inTokens = countTokens(text, enc);
  let fold: string | null = null;
  try {
    const folded = logTplFold(text);
    if (logTplUnfold(folded) === text) fold = PHALANX_A4_TPL + phalanxA3Encode(folded, enc).wire;
  } catch { fold = null; }
  let wire = a3.wire;
  let layer: 'a3' | 'tpl' = 'a3';
  if (fold !== null && (text.startsWith(PHALANX_A4_TPL) || countTokens(fold, enc) < countTokens(a3.wire, enc))) {
    wire = fold; layer = 'tpl';
  }
  if (text.startsWith(PHALANX_A4_TPL) && layer !== 'tpl') throw new Error('phalanx-a4: prefixed input without a verified template wire');
  const decoded = phalanxA4Decode(wire);
  const exact = decoded === text;
  if (!exact) throw new Error('phalanx-a4: round trip failed');
  return { wire, decoded, exact, layer, inTokens, outTokens: countTokens(wire, enc) };
}
