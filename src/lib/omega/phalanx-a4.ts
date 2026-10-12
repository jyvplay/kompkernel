/**
 * src/lib/omega/phalanx-a4.ts
 * =============================================================================
 * PHALANX-A4 — LOGTPL template stage over PHALANX-A3 (exact, byte-perfect, self-verified, identity-guarded).
 *
 * WIRE (template stage)
 *   "[[TPL\n"
 *   one legend line "# TPL: ... Variable marker: <PH>"  (PH is a visible character absent from the input)
 *   the A3 wire of logTplFold(text, PH)
 * WIRE (otherwise): the A3 wire of the text, unchanged.
 * DECODE: wire starts with "[[TPL\n" -> read PH from the legend, logTplUnfold(A3-decode(rest), PH); else A3-decode(wire).
 * GUARD: the template stage is used only if its wire is strictly cheaper (o200k) than the A3 wire. An input that
 *   starts with "[[TPL\n" is always carried by the template stage (throws if no placeholder fits), so the prefix is unambiguous.
 * HONEST SCOPE: wins on tabular ops text with repeated line shapes (git numstat, package-lock). On prose, JSON,
 *   code, and hash-heavy logs it loses and the guard keeps A3 unchanged.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { phalanxA3Encode, phalanxA3Decode } from './phalanx-a3';
import { logTplFold, logTplUnfold, logTplPickPh } from './logtpl';

export const PHALANX_A4_TPL = '[[TPL\n';
const LEGEND_PREFIX = '# TPL: ';

function legendFor(ph: string): string {
  return LEGEND_PREFIX + 'row = template id, then variables (tab-sep); Ti has ' + ph + ' per variable; R<tab>=raw line; @=section break. Variable marker: ' + ph;
}

export interface PhalanxA4Result { wire: string; decoded: string; exact: boolean; layer: 'a3' | 'tpl'; inTokens: number; outTokens: number }

export function phalanxA4Decode(wire: string): string {
  if (!wire.startsWith(PHALANX_A4_TPL)) return phalanxA3Decode(wire);
  const rest = wire.slice(PHALANX_A4_TPL.length);
  const nl = rest.indexOf('\n');
  const legend = rest.slice(0, nl);
  if (!legend.startsWith(LEGEND_PREFIX)) throw new Error('phalanx-a4: legend missing');
  const chars = Array.from(legend.slice(legend.lastIndexOf('Variable marker: ') + 'Variable marker: '.length));
  if (chars.length !== 1) throw new Error('phalanx-a4: placeholder missing from legend');
  return logTplUnfold(phalanxA3Decode(rest.slice(nl + 1)), chars[0]);
}

export function phalanxA4Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA4Result {
  const a3 = phalanxA3Encode(text, enc);
  const inTokens = countTokens(text, enc);
  let fold: string | null = null;
  const ph = logTplPickPh(text);
  if (ph !== null) {
    try {
      const folded = logTplFold(text, ph);
      if (logTplUnfold(folded, ph) === text) fold = PHALANX_A4_TPL + legendFor(ph) + '\n' + phalanxA3Encode(folded, enc).wire;
    } catch { fold = null; }
  }
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
