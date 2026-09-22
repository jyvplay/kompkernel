/**
 * src/lib/omega/solaris.ts
 * =============================================================================
 * ☀️ OMEGA-S1 "SOLARIS" — SPECTRAL ORTHOGONAL BASIS POLYNOMIAL CONTRACTION
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

export const SOLARIS_SENTINEL = '☉';
export const SOLARIS_LITERAL = '☉☉';

const OPTIONS: ContractorOptions = {
  sentinel: SOLARIS_SENTINEL,
  literalSentinel: SOLARIS_LITERAL,
  codeRangeStart: 0x5590,
  codeRangeEnd: 0x9fa5,
  codecName: 'SOLARIS-S1',
};

export type SolarisRule = ContractorRule;
export type SolarisResult = ContractorResult;

export function solarisDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function solarisEncode(text: string, enc: EncodingName = 'o200k_base'): SolarisResult {
  return contractEncode(text, enc, OPTIONS);
}

export const SOLARIS_SYSTEM_PROMPT = [
  '# ☀️ OMEGA-S1 SOLARIS — Spectral Orthogonal Basis Polynomial Codec',
  'A message starting with `☉` carries contracted spectral basis projections.',
  'Format: ☉<rule_count>\\n<glyph><length>:<basis>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function solarisSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'S0 empty', text: '' },
    { name: 'S1 repeated spectral basis', text: 'status: 200 ok latency_ms: 42 region: us-east-1\nstatus: 200 ok latency_ms: 42 region: us-east-1' },
  ];
  return tests.map((t) => {
    const r = solarisEncode(t.text, enc);
    const back = solarisDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
