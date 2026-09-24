/**
 * KAIROS-Ω — residual-context transducer over KHOROS-Ω.
 *
 * Unlike another whole-document grammar, KAIROS attacks the redundancy left in
 * KHOROS's winning wire.  Its finite-state phrases factor recurring domain
 * prefixes (especially REST/ops JSON) after KHOROS has made its own choices.
 * This is a mechanism-distinct composition: C_K(x)=min(K(x), marker+T(K(x))).
 * The marker makes decoding total; inputs containing reserved symbols simply
 * decline the transducer candidate, so no escaping ambiguity is possible.
 */
import { countTokens, type EncodingName } from './bpe';
import { khorosEncode, khorosDecode, khorosDecoderPrompt, type KhorosResult } from './khoros';

export const KAIROS_PREFIX = '※κ';
export const KAIROS_SYSTEM_PROMPT = `KAIROS-Ω is a lossless KHOROS residual transducer. Expand its fixed REST/ops phrase glyphs, then apply the KHOROS decoder. No skills.md or external tool is required when this instruction is included in the same user message.`;

// Symbols were selected only when each costs one o200k token. They are outside
// KHOROS's allocated static range. Longest phrases precede their prefixes.
const RULES: ReadonlyArray<readonly [string, string]> = [
  ['耀', '"avatar_url": "https://avatars.githubusercontent.com/u/'],
  ['老', '"url": "https://api.github.com/users/'],
  ['考', '"html_url": "https://github.com/'],
  ['者', '"followers_url": "https://api.github.com/users/'],
  ['而', '"following_url": "https://api.github.com/users/'],
  ['耐', '"gists_url": "https://api.github.com/users/'],
  ['耗', '"starred_url": "https://api.github.com/users/'],
  ['耳', '"subscriptions_url": "https://api.github.com/users/'],
  ['聊', '"organizations_url": "https://api.github.com/users/'],
  ['职', '"repos_url": "https://api.github.com/users/'],
  ['联', '"events_url": "https://api.github.com/users/'],
  ['聘', '"received_events_url": "https://api.github.com/users/'],
  ['聚', 'export * from "./'],
  ['聞', '/index.js";\n'],
  ['聪', '",\n        "'],
  ['聯', '\n        "'],
  ['聲', '",\n    "'],
  ['職', '\n    "'],
  ['肃', 'export function '],
  ['肉', ': string;\n'],
  ['肌', ': number;\n'],
  ['肖', ': boolean;\n'],
];
const RESERVED = new Set(RULES.map(([g]) => g));

export interface KairosResult extends KhorosResult {}

function forward(wire: string): string | null {
  for (const ch of wire) if (RESERVED.has(ch)) return null;
  let out = wire;
  for (const [glyph, phrase] of RULES) out = out.split(phrase).join(glyph);
  return out;
}

function reverse(wire: string): string {
  let out = wire;
  for (const [glyph, phrase] of RULES) out = out.split(glyph).join(phrase);
  return out;
}

export async function kairosEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<KairosResult> {
  const base = await khorosEncode(text, enc);
  const residual = forward(base.wire);
  if (residual === null) return { ...base, mode: `kairos:${base.mode}`, notes: `${base.notes}; KAIROS collision-safe fallback` };
  const candidate = KAIROS_PREFIX + residual;
  const candidateTokens = countTokens(candidate, enc);
  if (candidateTokens >= base.outTokens) return { ...base, mode: `kairos:${base.mode}`, notes: `${base.notes}; KAIROS Pareto fallback` };
  const decoded = await kairosDecode(candidate);
  return {
    wire: candidate, decoded, exact: decoded === text,
    inTokens: base.inTokens, outTokens: candidateTokens,
    savingsPct: base.inTokens ? Math.round((1 - candidateTokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'kairos:residual-context', regimes: [...(base.regimes ?? []), 'residual-context'],
    notes: `KAIROS residual phrase transducer over ${base.mode}; ${base.outTokens - candidateTokens} tokens beyond KHOROS`,
  };
}

export async function kairosDecode(wire: string): Promise<string> {
  if (!wire.startsWith(KAIROS_PREFIX)) return khorosDecode(wire);
  return khorosDecode(reverse(wire.slice(KAIROS_PREFIX.length)));
}

export function kairosDecoderPrompt(): string {
  const dictionary = RULES.map(([glyph, phrase]) => `${glyph}=${JSON.stringify(phrase)}`).join('\n');
  return `In this same user message, decode the KAIROS-Ω payload exactly. Remove the leading ${KAIROS_PREFIX}; replace each glyph using the KAIROS table below; then follow the complete KHOROS instructions that follow it. Output every reconstructed character and nothing else. No system prompt or skills file is available.\nKAIROS TABLE\n${dictionary}\nKHOROS INSTRUCTIONS\n${khorosDecoderPrompt()}`;
}
export const KAIROS_RULES = RULES;
