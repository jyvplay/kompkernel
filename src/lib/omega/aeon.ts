/**
 * src/lib/omega/aeon.ts
 * =============================================================================
 * ♾ AEON-A1 — In-Context Dynamic Attractor Frame Delta Quotient Encoding
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

export const AEON_SENTINEL = 'ϯ';
export const AEON_LITERAL = 'ϯϯ';

const OPTIONS: ContractorOptions = {
  sentinel: AEON_SENTINEL,
  literalSentinel: AEON_LITERAL,
  codeRangeStart: 0x0386,
  codeRangeEnd: 0x044f,
  codecName: 'AEON-A1',
};

export type AeonRule = ContractorRule;
export type AeonResult = ContractorResult;

export function aeonDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function aeonEncode(text: string, enc: EncodingName = 'o200k_base'): AeonResult {
  return contractEncode(text, enc, OPTIONS);
}

export const AEON_SYSTEM_PROMPT = [
  '# ♾ AEON-A1 — Dynamic Attractor Frame Codec',
  'A message starting with `ϯ` carries contracted attractor basin frames.',
  'Format: ϯ<rule_count>\\n<glyph><length>:<phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function aeonSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'A0 empty', text: '' },
    { name: 'A1 repeated attractor frame', text: 'user: fix the flaky test in auth module\nassistant: I will inspect the suite and patch the race.\nuser: fix the flaky test in auth module\nassistant: I will inspect the suite and patch the race.' },
  ];
  return tests.map((t) => {
    const r = aeonEncode(t.text, enc);
    const back = aeonDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
