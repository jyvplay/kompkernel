/**
 * src/lib/omega/phalanx-a5.ts
 * =============================================================================
 * PHALANX-A5 — WRAPCANON layer over PHALANX-A4 (exact, byte-perfect, self-verified, identity-guarded).
 *
 * WIRE (wrap layer used)
 *   "[[WRP\n"
 *   one legend line: "# WRP: width=W keep=K ..."   (K = visible character absent from the input)
 *   the A4 wire of wrapEncode(text, W, K)
 * WIRE (otherwise): the A4 wire of the text, unchanged.
 * DECODE: wire starts with "[[WRP\n" -> parse W and K from the legend, wrapDecode(A4-decode(rest), W, K);
 *         otherwise A4-decode(wire).
 * GUARD: the wrap layer is used only if its wire is strictly cheaper (o200k) than the A4 wire. An input that starts with
 *        "[[WRP\n" is always carried by the wrap layer (width=0 is the identity escape), so the prefix is unambiguous.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { phalanxA4Encode, phalanxA4Decode } from './phalanx-a4';
import { defaultVx, type VxEncode } from './phalanx-a2';
import { wrapEncode, wrapDecode, wrapPickKeep } from './wrapcanon';

export const PHALANX_A5_WRP = '[[WRP\n';
const LEGEND_RE = /^# WRP: width=(\d+) keep=(.) /u;

export interface PhalanxA5Result { wire: string; decoded: string; exact: boolean; layer: 'a4' | 'wrp'; width: number; inTokens: number; outTokens: number }

function legendFor(W: number, keep: string): string {
  return `# WRP: width=${W} keep=${keep} a line starting with ${keep} is kept as it is; a single line longer than ${W} is re-wrapped greedily at ${W} columns; the rest is the A4 wire of that text.`;
}

export function phalanxA5Decode(wire: string): string {
  if (!wire.startsWith(PHALANX_A5_WRP)) return phalanxA4Decode(wire);
  const rest = wire.slice(PHALANX_A5_WRP.length);
  const nl = rest.indexOf('\n');
  const m = LEGEND_RE.exec(rest.slice(0, nl));
  if (!m) throw new Error('phalanx-a5: legend missing or malformed');
  return wrapDecode(phalanxA4Decode(rest.slice(nl + 1)), Number(m[1]), m[2]);
}

export function phalanxA5Encode(text: string, enc: EncodingName = 'o200k_base', vx: VxEncode = defaultVx): PhalanxA5Result {
  const a4 = phalanxA4Encode(text, enc, vx);
  const inTokens = countTokens(text, enc);
  const keep = wrapPickKeep(text);
  let wire = a4.wire;
  let layer: 'a4' | 'wrp' = 'a4';
  let width = 0;
  if (keep !== null) {
    let bestTok = countTokens(a4.wire, enc);
    for (const W of [60, 64, 68, 72, 76, 80]) {
      const e = wrapEncode(text, W, keep);
      if (e === null) continue;
      const w = PHALANX_A5_WRP + legendFor(W, keep) + '\n' + phalanxA4Encode(e, enc, vx).wire;
      const tok = countTokens(w, enc);
      if (tok < bestTok) { bestTok = tok; wire = w; layer = 'wrp'; width = W; }
    }
  }
  if (text.startsWith(PHALANX_A5_WRP) && layer !== 'wrp') {
    const k = wrapPickKeep(text) ?? '-';
    wire = PHALANX_A5_WRP + legendFor(0, k) + '\n' + a4.wire; layer = 'wrp'; width = 0;
  }
  const decoded = phalanxA5Decode(wire);
  if (decoded !== text) throw new Error('phalanx-a5: round trip failed');
  return { wire, decoded, exact: true, layer, width, inTokens, outTokens: countTokens(wire, enc) };
}
