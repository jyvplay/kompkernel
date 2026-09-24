/**
 * DIKE-Ω — escape-free framing for THEMIS implicit grammars.
 *
 * THEMIS's JSON header pays quote, comma, and escaping costs for every outer
 * expansion. DIKE uses two fixed one-token sentinels: 甲 separates expansions
 * and 乙 terminates their tape. It is an exact restricted-alphabet transform:
 * if either sentinel occurs naturally, or the real BPE bill does not fall,
 * the complete THEMIS wire is retained unchanged.
 */
import { countTokens, type EncodingName } from './bpe';
import { themisEncode, themisDecode, themisDecoderPrompt, THEMIS_START, THEMIS_IMPLICIT_GLYPHS, type ThemisResult } from './themis';

export const DIKE_START = '⬢';
export const DIKE_RULE_SEPARATOR = '甲';
export const DIKE_BODY_SEPARATOR = '乙';
export interface DikeResult extends ThemisResult { framedRules?: number; }

function parseThemis(wire: string): { expansions: string[]; body: string } | null {
  if (!wire.startsWith(THEMIS_START)) return null;
  const newline = wire.indexOf('\n', THEMIS_START.length);
  if (newline < 0) return null;
  try {
    const expansions = JSON.parse(wire.slice(THEMIS_START.length, newline));
    if (!Array.isArray(expansions) || !expansions.length ||
        expansions.length > THEMIS_IMPLICIT_GLYPHS.length ||
        expansions.some(x => typeof x !== 'string')) return null;
    return { expansions, body: wire.slice(newline + 1) };
  } catch { return null; }
}

export async function dikeEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<DikeResult> {
  const base = await themisEncode(text, enc);
  const parsed = parseThemis(base.wire);
  if (!parsed || base.wire.includes(DIKE_RULE_SEPARATOR) || base.wire.includes(DIKE_BODY_SEPARATOR))
    return { ...base, mode: `dike:${base.mode}`, notes: `${base.notes}; DIKE structural/collision fallback`, framedRules: 0 };

  const wire = DIKE_START + parsed.expansions.join(DIKE_RULE_SEPARATOR) + DIKE_BODY_SEPARATOR + parsed.body;
  const tokens = countTokens(wire, enc);
  if (tokens >= base.outTokens)
    return { ...base, mode: `dike:${base.mode}`, notes: `${base.notes}; DIKE exact-cost fallback`, framedRules: 0 };

  const decoded = await dikeDecode(wire);
  return { ...base, wire, decoded, exact: decoded === text, outTokens: tokens,
    savingsPct: base.inTokens ? Math.round((1 - tokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'dike:escape-free-framing', regimes: [...(base.regimes ?? []), 'escape-free-framing'],
    notes: `DIKE escape-free framing for ${parsed.expansions.length} rules; ${base.outTokens - tokens} tokens beyond THEMIS`,
    framedRules: parsed.expansions.length };
}

export async function dikeDecode(wire: string): Promise<string> {
  if (!wire.startsWith(DIKE_START)) return themisDecode(wire);
  const boundary = wire.indexOf(DIKE_BODY_SEPARATOR, DIKE_START.length);
  if (boundary < 0) return wire;
  const tape = wire.slice(DIKE_START.length, boundary);
  const expansions = tape.split(DIKE_RULE_SEPARATOR);
  if (!tape || expansions.length > THEMIS_IMPLICIT_GLYPHS.length) return wire;
  let body = wire.slice(boundary + DIKE_BODY_SEPARATOR.length);
  for (let i = expansions.length - 1; i >= 0; i--)
    body = body.split(THEMIS_IMPLICIT_GLYPHS[i]).join(expansions[i]);
  return themisDecode(body);
}

export function dikeDecoderPrompt(wire?: string): string {
  const glyphs = THEMIS_IMPLICIT_GLYPHS.slice(0, 64).join('');
  return `Decode this DIKE-Ω payload in this same user message. Remove leading ⬢. Split once at 乙: the left tape contains expansions separated by 甲 and the right part is the body. Expansion i corresponds to glyph i in: ${glyphs}. Replace those glyphs in reverse order, then follow the complete lower-stack instructions below. Preserve every character and output only the reconstruction. No system prompt, skills.md, plugin, tool, or prior turn is available.\n\n${themisDecoderPrompt()}${wire ? `\n\nDIKE PAYLOAD\n${wire}` : ''}`;
}
