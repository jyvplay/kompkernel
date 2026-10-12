/**
 * src/lib/omega/phalanx-a7.ts
 * =============================================================================
 * PHALANX-A7 — PADTAB2 free-tail column layer over PHALANX-A5 (exact, byte-perfect, self-verified, identity-guarded).
 *
 * WIRE (layer used)
 *   "[[COL\n"
 *   one legend line "# COL: ... Marker: <M>"   (M = visible character absent from the input)
 *   the A5 wire of padEncode2(text, M)
 * WIRE (otherwise): the A5 wire of the text, unchanged.
 * DECODE: starts with "[[COL\n" -> M from the legend, padDecode2(A5-decode(rest), M); else A5-decode(wire).
 * GUARD: the layer is used only if its wire is strictly cheaper (o200k) than the A5 wire. An input that starts with
 *        "[[COL\n" is always carried by the layer. If every marker candidate occurs in such an input, encoding throws.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { phalanxA5Encode, phalanxA5Decode } from './phalanx-a5';
import { padEncode2, padDecode2, padPickMark2 } from './padtab2';

export const PHALANX_A7_COL = '[[COL\n';
const LEGEND_RE = /Marker: (.)$/u;

export interface PhalanxA7Result { wire: string; decoded: string; exact: boolean; layer: 'a5' | 'col'; inTokens: number; outTokens: number }

function legendFor(mark: string): string {
  return `# COL: line ${mark}T f n spec = table block; each row = f cells space-separated, then optional verbatim tail after a space; cells are padded to columns (L<p> left at p, R<p> ends at p, F<p> tail starts at p). Marker: ${mark}`;
}

export function phalanxA7Decode(wire: string): string {
  if (!wire.startsWith(PHALANX_A7_COL)) return phalanxA5Decode(wire);
  const rest = wire.slice(PHALANX_A7_COL.length);
  const nl = rest.indexOf('\n');
  const legend = rest.slice(0, nl);
  const m = LEGEND_RE.exec(legend);
  if (!legend.startsWith('# COL: ') || !m) throw new Error('phalanx-a7: legend missing or malformed');
  return padDecode2(phalanxA5Decode(rest.slice(nl + 1)), m[1]);
}

export function phalanxA7Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA7Result {
  const a5 = phalanxA5Encode(text, enc);
  const inTokens = countTokens(text, enc);
  let wire = a5.wire;
  let layer: 'a5' | 'col' = 'a5';
  const mark = padPickMark2(text);
  if (mark !== null) {
    const body = padEncode2(text, mark);
    if (body !== text) {
      const w = PHALANX_A7_COL + legendFor(mark) + '\n' + phalanxA5Encode(body, enc).wire;
      if (countTokens(w, enc) < countTokens(a5.wire, enc)) { wire = w; layer = 'col'; }
    }
  }
  if (text.startsWith(PHALANX_A7_COL) && layer !== 'col') {
    const mk = padPickMark2(text);
    if (mk === null) throw new Error('phalanx-a7: prefixed input with every marker candidate present');
    wire = PHALANX_A7_COL + legendFor(mk) + '\n' + a5.wire; layer = 'col';
  }
  const decoded = phalanxA7Decode(wire);
  if (decoded !== text) throw new Error('phalanx-a7: round trip failed');
  return { wire, decoded, exact: true, layer, inTokens, outTokens: countTokens(wire, enc) };
}
