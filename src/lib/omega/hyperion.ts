/**
 * src/lib/omega/hyperion.ts
 * =============================================================================
 * ☀ HYPERION-H1 — Hyper-Dimensional Polynomial Spectral Context Contraction
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

export const HYPERION_SENTINEL = 'Ϧ';
export const HYPERION_LITERAL = 'ϦϦ';

const OPTIONS: ContractorOptions = {
  sentinel: HYPERION_SENTINEL,
  literalSentinel: HYPERION_LITERAL,
  codeRangeStart: 0x0386,
  codeRangeEnd: 0x044f,
  codecName: 'HYPERION-H1',
};

export type HyperionRule = ContractorRule;
export type HyperionResult = ContractorResult;

export function hyperionDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function hyperionEncode(text: string, enc: EncodingName = 'o200k_base'): HyperionResult {
  return contractEncode(text, enc, OPTIONS);
}

export const HYPERION_SYSTEM_PROMPT = [
  '# ☀ HYPERION-H1 — Hyper-Dimensional Polynomial Spectral Context Codec',
  'A message starting with `Ϧ` carries contracted spectral basis templates.',
  'Format: Ϧ<rule_count>\\n<glyph><length>:<phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function hyperionSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'H0 empty', text: '' },
    { name: 'H1 repeated spectral orbit', text: 'status: 200 ok latency_ms: 42 region: us-east-1\nstatus: 200 ok latency_ms: 42 region: us-east-1' },
  ];
  return tests.map((t) => {
    const r = hyperionEncode(t.text, enc);
    const back = hyperionDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
