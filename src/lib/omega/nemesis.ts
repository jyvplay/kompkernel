/**
 * NEMESIS-Ω — grammar-of-grammar residual closure.
 *
 * MOIRA optimizes the residual body and emits a self-describing dictionary, but
 * the dictionary serialization is itself text with repeated syntax and shared
 * fragments. NEMESIS treats the complete winning MOIRA wire as a new admissible
 * string and induces one acyclic outer grammar over body + dictionary together.
 * This two-level SLP is mechanism-distinct from merely widening MOIRA's search.
 */
import { countTokens, type EncodingName } from './bpe';
import { moiraEncode, moiraDecode, moiraDecoderPrompt, optimizeConstituentLattice, type MoiraResult } from './moira';

export const NEMESIS_START = '◆\n';
export const NEMESIS_BODY = '\n◆\n';
type Rule = readonly [glyph: string, expansion: string];
export interface NemesisResult extends MoiraResult { outerRules?: number; }

function pack(body: string, rules: readonly Rule[]): string {
  return NEMESIS_START + rules.map(([g, e]) => `${g}=${JSON.stringify(e)}`).join('\n') + NEMESIS_BODY + body;
}

export async function nemesisEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<NemesisResult> {
  const base = await moiraEncode(text, enc);
  const outer = optimizeConstituentLattice(base.wire, enc, 20);
  if (!outer.rules.length) {
    return { ...base, mode: `nemesis:${base.mode}`, notes: `${base.notes}; NEMESIS outer-grammar fallback`, outerRules: 0 };
  }
  const wire = pack(outer.body, outer.rules);
  const tokens = countTokens(wire, enc);
  if (tokens >= base.outTokens) {
    return { ...base, mode: `nemesis:${base.mode}`, notes: `${base.notes}; NEMESIS exact-cost fallback`, outerRules: 0 };
  }
  const decoded = await nemesisDecode(wire);
  return {
    ...base,
    wire, decoded, exact: decoded === text, outTokens: tokens,
    savingsPct: base.inTokens ? Math.round((1 - tokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'nemesis:grammar-of-grammar',
    regimes: [...(base.regimes ?? []), 'grammar-of-grammar'],
    notes: `NEMESIS ${outer.rules.length}-rule outer SLP over MOIRA wire; ${base.outTokens - tokens} tokens beyond MOIRA`,
    outerRules: outer.rules.length,
  };
}

export async function nemesisDecode(wire: string): Promise<string> {
  if (!wire.startsWith(NEMESIS_START)) return moiraDecode(wire);
  const boundary = wire.indexOf(NEMESIS_BODY, NEMESIS_START.length);
  if (boundary < 0) return wire;
  let body = wire.slice(boundary + NEMESIS_BODY.length);
  try {
    const definitions = wire.slice(NEMESIS_START.length, boundary);
    const rules: Rule[] = definitions ? definitions.split('\n').map(line => {
      const equals = line.indexOf('=');
      if (equals < 1) throw new Error('invalid outer definition');
      return [line.slice(0, equals), JSON.parse(line.slice(equals + 1))];
    }) : [];
    for (let i = rules.length - 1; i >= 0; i--) body = body.split(rules[i][0]).join(rules[i][1]);
    return moiraDecode(body);
  } catch { return wire; }
}

export function nemesisDecoderPrompt(wire?: string): string {
  return `Decode this NEMESIS-Ω payload in this same user message. Between the standalone ◆ lines, each entry is glyph=JSON-string. Expand those glyphs to recover the inner MOIRA payload, then follow the complete MOIRA/KAIROS/KHOROS instructions below. Preserve every character and output only the reconstruction. No system prompt, skills.md, plugin, tool, or prior turn is available.\n\n${moiraDecoderPrompt()}${wire ? `\n\nNEMESIS PAYLOAD\n${wire}` : ''}`;
}
