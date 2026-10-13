/**
 * src/lib/omega/veritas-q.ts — VERITAS-Q: VERITAS-M search with an instruction-carrying, escape-conditional legend.
 * =============================================================================
 * Same VXR entries, same body, same decoder path as VERITAS-M (veritasRDecode / veritasADecode skip a leading
 * "# " line, so the legend text is not parsed by the decoder). The only change is the legend line:
 *
 *   - Minimal legend, when the wire contains no escape character '~':
 *       "# X=T; output the decoded text exactly; ]]"
 *   - Escape legend, when it does:
 *       "# X=T; ~~ ~N nl ~R cr; output the decoded text exactly; ]]"
 *
 * The legend now carries the one instruction a single user message needs (print the decoded text). That
 * instruction is COUNTED in every VERITAS-Q figure. The VERITAS-M figure never included it, so VERITAS-M
 * numbers understate the one-chat cost by about 8 tokens per file. The old full VXR legend (33 tokens, no
 * instruction) is 33 tokens; the minimal VERITAS-Q legend with the instruction is 15; the escape legend is 23.
 *
 * Honesty: the decoder is unchanged. Whether a language model reads these legends exactly is NOT verified in this
 * repository. No LLM is reachable from the sandbox. bench/z38/llm-kit provides the prompts for an external check.
 * The byte-exact claim rests on veritasRDecode, not on any model.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { VXR_SENTINEL } from './veritas-a';
import { VXR_LEGEND, veritasRDecode } from './veritas-r';
import { veritasMEncode } from './veritas-m';

export const VXQ_INSTRUCTION = 'output the decoded text exactly';
export const VXQ_MINIMAL_LEGEND = `# X=T; ${VXQ_INSTRUCTION}; ]]`;
export const VXQ_ESCAPE_LEGEND = `# X=T; ~~ ~N nl ~R cr; ${VXQ_INSTRUCTION}; ]]`;

export interface VeritasQResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  entries: number;
  legend: 'minimal' | 'escape' | 'none';
}

/** Rewrite a VXR wire's legend. Pure string operation; the caller verifies by decoding. */
export function vxqRewireLegend(wire: string): { wire: string; legend: 'minimal' | 'escape' | 'none' } {
  if (!wire.startsWith(VXR_SENTINEL + VXR_LEGEND + '\n')) return { wire, legend: 'none' };
  const rest = wire.slice(VXR_SENTINEL.length + VXR_LEGEND.length);
  if (rest.includes('~')) return { wire: VXR_SENTINEL + VXQ_ESCAPE_LEGEND + rest, legend: 'escape' };
  return { wire: VXR_SENTINEL + VXQ_MINIMAL_LEGEND + rest, legend: 'minimal' };
}

export function veritasQEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasQResult {
  const m = veritasMEncode(text, enc);
  const { wire, legend } = vxqRewireLegend(m.wire);
  const rewired = veritasRDecode(wire) === text;
  // Hard gate: if the rewrite is not exact, emit the VERITAS-M wire unchanged (never expected; kept as a gate).
  const finalWire = rewired ? wire : m.wire;
  const exact = veritasRDecode(finalWire) === text;
  return {
    wire: finalWire,
    decoded: exact ? text : veritasRDecode(finalWire),
    exact,
    inTokens: m.inTokens,
    outTokens: countTokens(finalWire, enc),
    entries: m.entries,
    legend: rewired ? legend : 'none',
  };
}
