/**
 * src/lib/omega/phalanx-a6.ts
 * =============================================================================
 * PHALANX-A6 — PADTAB table layer over PHALANX-A5 (exact, byte-perfect, self-verified, identity-guarded).
 *
 * WIRE (table layer used)
 *   "[[PAD\n"
 *   one legend line "# PAD: ... Marker: <M>"   (M = visible character absent from the input)
 *   the A5 wire of padEncode(text, M)
 * WIRE (otherwise): the A5 wire of the text, unchanged.
 * DECODE: wire starts with "[[PAD\n" -> read M from the legend, padDecode(A5-decode(rest), M); else A5-decode(wire).
 * GUARD: the table layer is used only if its wire is strictly cheaper (o200k) than the A5 wire. An input that starts with
 *        "[[PAD\n" is always carried by the table layer. If every marker candidate occurs in such an input, encoding throws.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { phalanxA5Encode, phalanxA5Decode } from './phalanx-a5';
import { padEncode, padDecode, padPickMark } from './padtab';

export const PHALANX_A6_PAD = '[[PAD\n';
const LEGEND_RE = /Marker: (.)$/u;

export interface PhalanxA6Result { wire: string; decoded: string; exact: boolean; layer: 'a5' | 'pad'; inTokens: number; outTokens: number }

function legendFor(mark: string): string {
  return `# PAD: a line starting with ${mark}T is a table block: header "${mark}T k n align" (k columns, n rows, align per column: L left, R right), then n rows of space-separated cells; the decoder re-pads each row to the column positions. Marker: ${mark}`;
}

export function phalanxA6Decode(wire: string): string {
  if (!wire.startsWith(PHALANX_A6_PAD)) return phalanxA5Decode(wire);
  const rest = wire.slice(PHALANX_A6_PAD.length);
  const nl = rest.indexOf('\n');
  const legend = rest.slice(0, nl);
  const m = LEGEND_RE.exec(legend);
  if (!legend.startsWith('# PAD: ') || !m) throw new Error('phalanx-a6: legend missing or malformed');
  return padDecode(phalanxA5Decode(rest.slice(nl + 1)), m[1]);
}

export function phalanxA6Encode(text: string, enc: EncodingName = 'o200k_base'): PhalanxA6Result {
  const a5 = phalanxA5Encode(text, enc);
  const inTokens = countTokens(text, enc);
  let wire = a5.wire;
  let layer: 'a5' | 'pad' = 'a5';
  const mark = padPickMark(text);
  if (mark !== null) {
    const body = padEncode(text, mark);
    if (body !== text) {
      const w = PHALANX_A6_PAD + legendFor(mark) + '\n' + phalanxA5Encode(body, enc).wire;
      if (countTokens(w, enc) < countTokens(a5.wire, enc)) { wire = w; layer = 'pad'; }
    }
  }
  if (text.startsWith(PHALANX_A6_PAD) && layer !== 'pad') {
    const mk = padPickMark(text);
    if (mk === null) throw new Error('phalanx-a6: prefixed input with every marker candidate present');
    wire = PHALANX_A6_PAD + legendFor(mk) + '\n' + a5.wire; layer = 'pad';
  }
  const decoded = phalanxA6Decode(wire);
  if (decoded !== text) throw new Error('phalanx-a6: round trip failed');
  return { wire, decoded, exact: true, layer, inTokens, outTokens: countTokens(wire, enc) };
}
