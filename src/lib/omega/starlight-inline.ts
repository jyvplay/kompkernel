/**
 * src/lib/omega/starlight-inline.ts
 * =============================================================================
 * STARLIGHT-S1 with its decode rule INSIDE the message (no system prompt).
 *
 * The raw STARLIGHT wire (starlight.ts) keeps its rules in STARLIGHT_SYSTEM_PROMPT,
 * which violates the constraint that a bare chat input must suffice. This wrapper
 * puts one rule line on the first line of the wire:
 *
 *   ★S: 丁=データベース; 七=保存される | each key before "=" in the body (after the blank line) is replaced by its value
 *
 * It is emitted only when the total wire (rule line included) costs fewer tokens
 * than the identity text. Otherwise the identity text is returned unchanged, so the
 * codec is never more expensive than the input. Round trip is checked before return.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { starlightEncode, starlightDecode } from './starlight';

const RULE_HEAD = '★S: ';
const RULE_TAIL = ' | each key before "=" in the body (after the blank line) is replaced by its value';

export interface StarlightInlineResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  mode: 'starlight-inline' | 'identity';
}

export function starlightInlineEncode(text: string, enc: EncodingName = 'o200k_base'): StarlightInlineResult {
  const inTokens = countTokens(text, enc);
  const identity = (): StarlightInlineResult => ({ wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens, mode: 'identity' });
  let s;
  try { s = starlightEncode(text, enc); } catch { return identity(); }
  if (s.mode !== 'starlight' || !s.wire.startsWith('★S\n')) return identity();
  const body = s.wire.slice('★S\n'.length);
  const entries = body.slice(0, body.indexOf('\n\n'));
  if (entries.length === 0) return identity();
  const oneLine = entries.split('\n').join('; ');
  const wire = RULE_HEAD + oneLine + RULE_TAIL + body.slice(body.indexOf('\n\n'));
  const decoded = starlightInlineDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity();
  return { wire, decoded, exact: true, inTokens, outTokens, mode: 'starlight-inline' };
}

export function starlightInlineDecode(wire: string): string {
  if (!wire.startsWith(RULE_HEAD)) return wire;
  const cut = wire.indexOf(RULE_TAIL);
  const entries = wire.slice(RULE_HEAD.length, cut).split('; ').join('\n');
  const rest = wire.slice(cut + RULE_TAIL.length);
  return starlightDecode('★S\n' + entries + rest);
}
