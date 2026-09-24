/**
 * METIS-Ω — level-polymorphic succinct grammar closure.
 *
 * EUPRAXIA optimizes the NEMESIS→THEMIS→DIKE branch, but inputs whose best
 * result is a direct MOIRA grammar retain explicit nonterminal names, `=`,
 * quoted JSON expansions, and one definition per line. METIS closes that
 * disjoint fallback branch. It remaps MOIRA rule ordinal i to the already
 * verified one-token implicit glyph i and serializes only an escape-free
 * expansion tape. `?` is a tokenizer-superoptimized rule boundary and `乙`
 * ends the tape. Any sentinel or implicit-glyph collision rejects the transform;
 * an exact live-BPE tournament then preserves the complete EUPRAXIA fallback.
 */
import { countTokens, type EncodingName } from './bpe';
import { eupraxiaEncode, eupraxiaDecode, type EupraxiaResult } from './eupraxia';
import { MOIRA_START, MOIRA_BODY, moiraDecode } from './moira';
import { kairosDecoderPrompt } from './kairos';
import { THEMIS_IMPLICIT_GLYPHS } from './themis';

export const METIS_START = '⬤';
export const METIS_RULE_SEPARATOR = '?';
export const METIS_BODY_SEPARATOR = '乙';
export interface MetisResult extends EupraxiaResult { polymorphicRules?: number; }
type Rule = readonly [string, string];

function parseMoira(wire: string): { rules: Rule[]; body: string } | null {
  if (!wire.startsWith(MOIRA_START)) return null;
  const boundary = wire.indexOf(MOIRA_BODY, MOIRA_START.length);
  if (boundary < 0) return null;
  try {
    const definitions = wire.slice(MOIRA_START.length, boundary);
    const rules: Rule[] = definitions ? definitions.split('\n').map(line => {
      const equals = line.indexOf('=');
      if (equals < 1) throw new Error('invalid definition');
      const expansion = JSON.parse(line.slice(equals + 1));
      if (typeof expansion !== 'string') throw new Error('non-string expansion');
      return [line.slice(0, equals), expansion];
    }) : [];
    return rules.length ? { rules, body: wire.slice(boundary + MOIRA_BODY.length) } : null;
  } catch { return null; }
}

export async function metisEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<MetisResult> {
  const base = await eupraxiaEncode(text, enc);
  const parsed = parseMoira(base.wire);
  if (!parsed || parsed.rules.length > THEMIS_IMPLICIT_GLYPHS.length)
    return { ...base, mode: `metis:${base.mode}`, notes: `${base.notes}; METIS structural fallback`, polymorphicRules: 0 };

  const implicit = THEMIS_IMPLICIT_GLYPHS.slice(0, parsed.rules.length);
  if (base.wire.includes(METIS_RULE_SEPARATOR) || base.wire.includes(METIS_BODY_SEPARATOR) ||
      implicit.some(g => base.wire.includes(g)))
    return { ...base, mode: `metis:${base.mode}`, notes: `${base.notes}; METIS collision fallback`, polymorphicRules: 0 };

  let body = parsed.body;
  for (let i = 0; i < parsed.rules.length; i++) body = body.split(parsed.rules[i][0]).join(implicit[i]);
  const wire = METIS_START + parsed.rules.map(([, expansion]) => expansion).join(METIS_RULE_SEPARATOR) + METIS_BODY_SEPARATOR + body;
  const tokens = countTokens(wire, enc);
  if (tokens >= base.outTokens)
    return { ...base, mode: `metis:${base.mode}`, notes: `${base.notes}; METIS exact-cost fallback`, polymorphicRules: 0 };

  const decoded = await metisDecode(wire);
  return { ...base, wire, decoded, exact: decoded === text, outTokens: tokens,
    savingsPct: base.inTokens ? Math.round((1 - tokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'metis:polymorphic-succinct-grammar', regimes: [...(base.regimes ?? []), 'polymorphic-succinct-grammar'],
    notes: `METIS succinct closure for ${parsed.rules.length} direct MOIRA rules; ${base.outTokens - tokens} tokens beyond EUPRAXIA`,
    polymorphicRules: parsed.rules.length };
}

export async function metisDecode(wire: string): Promise<string> {
  if (!wire.startsWith(METIS_START)) return eupraxiaDecode(wire);
  const boundary = wire.indexOf(METIS_BODY_SEPARATOR, METIS_START.length);
  if (boundary < 0) return wire;
  const tape = wire.slice(METIS_START.length, boundary);
  if (!tape) return wire;
  const expansions = tape.split(METIS_RULE_SEPARATOR);
  if (expansions.length > THEMIS_IMPLICIT_GLYPHS.length) return wire;
  let body = wire.slice(boundary + METIS_BODY_SEPARATOR.length);
  for (let i = expansions.length - 1; i >= 0; i--)
    body = body.split(THEMIS_IMPLICIT_GLYPHS[i]).join(expansions[i]);
  return moiraDecode(body);
}

export function metisDecoderPrompt(wire?: string): string {
  const glyphs = THEMIS_IMPLICIT_GLYPHS.slice(0, 64).join('');
  return `Decode this METIS-Ω payload in this same user message. Remove leading ⬤. Split once at 乙: the left tape contains expansions separated by ? and the right part is the body. Expansion i corresponds to glyph i in: ${glyphs}. Replace those glyphs in reverse order. The result is a KAIROS-family payload; execute the complete lower-stack instructions below. The question marks in the left tape are separators, not expansion text. Preserve every other character and output only the reconstruction. No system prompt, skills.md, plugin, tool, prior turn, or external dictionary is available.\n\n${kairosDecoderPrompt()}${wire ? `\n\nMETIS PAYLOAD\n${wire}` : ''}`;
}
