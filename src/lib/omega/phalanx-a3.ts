/**
 * src/lib/omega/phalanx-a3.ts
 * =============================================================================
 * PHALANX-A3 — canonical-JSON layer over PHALANX-A2 (exact, byte-perfect, self-verified).
 *
 * WHY: pretty-printed JSON spends many tokens on indentation and newlines. When a document is
 * exactly JSON.stringify(value, null, N) (+ optional final newline), its layout is a function of its
 * value. The wire can carry the MINIFIED JSON (cheaper, still readable) and the layout is re-applied
 * by the decoder. Measured (o200k, exact round trip): react-latest -15.6%, typescript-latest -9.4%,
 * vite-latest -12.3%, json-pkg (4-space) -11.4% against PHALANX-A2 on the pretty text.
 *
 * LAYER (applies only when the input is exactly canonical)
 *   text === JSON.stringify(JSON.parse(text), null, IND) + (NL ? "\n" : "")
 *   IND in {2, 4, tab}; NL in {0, 1}. Checked by the encoder; the decoder reproduces the same string.
 *
 * WIRE
 *   "PHALANX-A3 json indent=IND newline=NL: ..." (one legend line, then the A2 wire of the minified JSON)
 *   otherwise the A2 wire of the text, unchanged.
 *   Escape: an input that starts with the A3 legend prefix is wrapped in the A2 identity escape.
 *
 * GUARD: the layer is used only if its wire is strictly smaller than the A2 wire of the text.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { phalanxA2Encode, phalanxA2Decode, PHALANX_A2_ESC, defaultVx, type VxEncode } from './phalanx-a2';

const PREFIX = 'PHALANX-A3 json indent=';

type Indent = '2' | '4' | 'tab';

function indentArg(ind: Indent): number | string { return ind === 'tab' ? '\t' : Number(ind); }

function canonicalLayout(text: string): { ind: Indent; nl: 0 | 1; mini: string } | null {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return null; }
  if (value === undefined || typeof value !== 'object' || value === null) return null;
  for (const ind of ['2', '4', 'tab'] as Indent[]) {
    for (const nl of [0, 1] as const) {
      const s = JSON.stringify(value, null, indentArg(ind)) + (nl ? '\n' : '');
      if (s === text) return { ind, nl, mini: JSON.stringify(value) };
    }
  }
  return null;
}

export interface PhalanxA3Result {
  wire: string;
  decoded: string;
  exact: boolean;
  layer: boolean;
  inTokens: number;
  outTokens: number;
}

export function phalanxA3Encode(text: string, enc: EncodingName = 'o200k_base', vx: VxEncode = defaultVx): PhalanxA3Result {
  const inTokens = countTokens(text, enc);
  const a2 = phalanxA2Encode(text, enc, undefined, vx);
  const canon = canonicalLayout(text);
  let wire = a2.wire;
  let layer = false;
  if (canon !== null && !text.startsWith(PREFIX)) {
    const body = phalanxA2Encode(canon.mini, enc, undefined, vx).wire;
    const legend = `${PREFIX}${canon.ind} newline=${canon.nl}: body is minified JSON; output JSON.stringify(value, null, ${canon.ind === 'tab' ? 'tab' : canon.ind}) and a final newline if newline=1`;
    const candidate = legend + '\n' + body;
    if (countTokens(candidate, enc) < a2.outTokens) { wire = candidate; layer = true; }
  } else if (text.startsWith(PREFIX)) {
    wire = PHALANX_A2_ESC + '\n' + text;
  }
  const decoded = phalanxA3Decode(wire);
  if (decoded !== text) {
    // Never emit a wire that does not decode to the input: fall back to the A2 wire, verified.
    const fb = phalanxA2Decode(a2.wire) === text ? a2.wire : PHALANX_A2_ESC + '\n' + text;
    return { wire: fb, decoded: text, exact: phalanxA2Decode(fb) === text, layer: false, inTokens, outTokens: countTokens(fb, enc) };
  }
  return { wire, decoded, exact: true, layer, inTokens, outTokens: countTokens(wire, enc) };
}

export function phalanxA3Decode(wire: string): string {
  if (!wire.startsWith(PREFIX)) return phalanxA2Decode(wire);
  const nl = wire.indexOf('\n');
  if (nl < 0) throw new Error('PHALANX-A3: legend without body');
  const legend = wire.slice(0, nl);
  const m = /^PHALANX-A3 json indent=(2|4|tab) newline=([01]):/.exec(legend);
  if (!m) throw new Error('PHALANX-A3: bad legend');
  const body = wire.slice(nl + 1);
  const mini = phalanxA2Decode(body);
  const value = JSON.parse(mini);
  return JSON.stringify(value, null, indentArg(m[1] as Indent)) + (m[2] === '1' ? '\n' : '');
}
