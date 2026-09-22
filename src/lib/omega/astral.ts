/**
 * src/lib/omega/astral.ts
 * =============================================================================
 * 🌌 ASTRAL-A1 — Adaptive Structural & Textual Representation for Agentic Languages
 * =============================================================================
 */

import { type EncodingName } from './bpe';
import {
  contractEncode,
  contractDecode,
  type ContractorRule,
  type ContractorResult,
  type ContractorOptions,
} from './cjk-contractor';

export const ASTRAL_SENTINEL = 'α';
export const ASTRAL_LITERAL = 'αα';

const OPTIONS: ContractorOptions = {
  sentinel: ASTRAL_SENTINEL,
  literalSentinel: ASTRAL_LITERAL,
  codeRangeStart: 0x0370,
  codeRangeEnd: 0x04ff,
  codecName: 'ASTRAL-A1',
};

export type AstralRule = ContractorRule;
export type AstralResult = ContractorResult;

export function astralDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function astralEncode(text: string, enc: EncodingName = 'o200k_base'): AstralResult {
  return contractEncode(text, enc, OPTIONS);
}

export const ASTRAL_SYSTEM_PROMPT = [
  '# 🌌 ASTRAL-A1 — Adaptive Structural & Textual Representation Codec',
  'A message starting with `α` carries contracted structural collocations.',
  'Format: α<rule_count>\\n<glyph><length>:<phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function astralSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'A0 empty', text: '' },
    { name: 'A1 repeated markdown header', text: '### Incident review card 01\n- Evidence retained: pass\n### Incident review card 01\n- Evidence retained: pass' },
  ];
  return tests.map((t) => {
    const r = astralEncode(t.text, enc);
    const back = astralDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
