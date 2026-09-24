/**
 * THEMIS-Ω — succinct implicit-symbol serialization for nested prompt grammars.
 *
 * NEMESIS proves that a grammar over a grammar is profitable, but redundantly
 * transmits each outer nonterminal and per-rule `=`/newline syntax. THEMIS maps
 * rule ordinal i to a fixed one-token Hangul symbol and transmits only a JSON
 * array of expansions. The body uses those implicit symbols. This is a
 * tokenizer-aware analogue of succinct post-order SLP naming, not a new static
 * phrase dictionary. Exact collision checks and a NEMESIS fallback preserve
 * totality and Pareto safety.
 */
import { countTokens, type EncodingName } from './bpe';
import { nemesisEncode, nemesisDecode, nemesisDecoderPrompt, NEMESIS_START, NEMESIS_BODY, type NemesisResult } from './nemesis';

export const THEMIS_START = '⬡';
export interface ThemisResult extends NemesisResult { succinctRules?: number; }
type Rule = readonly [glyph: string, expansion: string];

const IMPLICIT_GLYPHS: string[] = [];
for (let cp = 0xac00; cp <= 0xd7a3; cp++) {
  const ch = String.fromCharCode(cp);
  if (countTokens(ch, 'o200k_base') === 1) IMPLICIT_GLYPHS.push(ch);
}

function parseNemesis(wire: string): { rules: Rule[]; body: string } | null {
  if (!wire.startsWith(NEMESIS_START)) return null;
  const boundary = wire.indexOf(NEMESIS_BODY, NEMESIS_START.length);
  if (boundary < 0) return null;
  try {
    const definitions = wire.slice(NEMESIS_START.length, boundary);
    const rules: Rule[] = definitions ? definitions.split('\n').map(line => {
      const equals = line.indexOf('=');
      if (equals < 1) throw new Error('invalid definition');
      return [line.slice(0, equals), JSON.parse(line.slice(equals + 1))];
    }) : [];
    return { rules, body: wire.slice(boundary + NEMESIS_BODY.length) };
  } catch { return null; }
}

export async function themisEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<ThemisResult> {
  const base = await nemesisEncode(text, enc);
  const parsed = parseNemesis(base.wire);
  if (!parsed || !parsed.rules.length || parsed.rules.length > IMPLICIT_GLYPHS.length) {
    return { ...base, mode: `themis:${base.mode}`, notes: `${base.notes}; THEMIS structural fallback`, succinctRules: 0 };
  }

  // New symbols must not already occur anywhere in the complete lower wire.
  const implicit = IMPLICIT_GLYPHS.slice(0, parsed.rules.length);
  if (implicit.some(g => base.wire.includes(g))) {
    return { ...base, mode: `themis:${base.mode}`, notes: `${base.notes}; THEMIS collision fallback`, succinctRules: 0 };
  }

  let body = parsed.body;
  for (let i = 0; i < parsed.rules.length; i++) body = body.split(parsed.rules[i][0]).join(implicit[i]);
  const expansions = parsed.rules.map(([, expansion]) => expansion);
  const wire = THEMIS_START + JSON.stringify(expansions) + '\n' + body;
  const tokens = countTokens(wire, enc);
  if (tokens >= base.outTokens) {
    return { ...base, mode: `themis:${base.mode}`, notes: `${base.notes}; THEMIS exact-cost fallback`, succinctRules: 0 };
  }
  const decoded = await themisDecode(wire);
  return {
    ...base,
    wire, decoded, exact: decoded === text, outTokens: tokens,
    savingsPct: base.inTokens ? Math.round((1 - tokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'themis:succinct-implicit-slp',
    regimes: [...(base.regimes ?? []), 'succinct-implicit-slp'],
    notes: `THEMIS implicit ordinal naming for ${expansions.length} outer rules; ${base.outTokens - tokens} tokens beyond NEMESIS`,
    succinctRules: expansions.length,
  };
}

export async function themisDecode(wire: string): Promise<string> {
  if (!wire.startsWith(THEMIS_START)) return nemesisDecode(wire);
  const newline = wire.indexOf('\n', THEMIS_START.length);
  if (newline < 0) return wire;
  try {
    const expansions = JSON.parse(wire.slice(THEMIS_START.length, newline));
    if (!Array.isArray(expansions) || expansions.length > IMPLICIT_GLYPHS.length || expansions.some(x => typeof x !== 'string')) return wire;
    let body = wire.slice(newline + 1);
    for (let i = expansions.length - 1; i >= 0; i--) body = body.split(IMPLICIT_GLYPHS[i]).join(expansions[i]);
    return nemesisDecode(body);
  } catch { return wire; }
}

export function themisDecoderPrompt(wire?: string): string {
  const glyphs = IMPLICIT_GLYPHS.slice(0, 64).join('');
  return `Decode this THEMIS-Ω payload in this same user message. Remove the leading ⬡. The first line is a JSON array of expansions. Array item i corresponds to glyph i in this ordered symbol string: ${glyphs}. Replace symbols in reverse array order, then follow the complete NEMESIS/MOIRA/KAIROS/KHOROS instructions below. Preserve every character and output only the reconstruction. No system prompt, skills.md, plugin, tool, or prior turn is available.\n\n${nemesisDecoderPrompt()}${wire ? `\n\nTHEMIS PAYLOAD\n${wire}` : ''}`;
}

export const THEMIS_IMPLICIT_GLYPHS = IMPLICIT_GLYPHS;
