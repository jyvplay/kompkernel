/**
 * src/lib/omega/phoenix.ts
 * =============================================================================
 * 𓅂 PHOENIX-P1 — Poly-Disjoint In-Context Topological Grammar Subsequence Extraction
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

export const PHOENIX_SENTINEL = 'Ψ';
export const PHOENIX_LITERAL = 'ΨΨ';

const OPTIONS: ContractorOptions = {
  sentinel: PHOENIX_SENTINEL,
  literalSentinel: PHOENIX_LITERAL,
  codeRangeStart: 0x0391,
  codeRangeEnd: 0x044f,
  codecName: 'PHOENIX-P1',
};

export type PhoenixRule = ContractorRule;
export type PhoenixResult = ContractorResult;

export function phoenixDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function phoenixEncode(text: string, enc: EncodingName = 'o200k_base'): PhoenixResult {
  return contractEncode(text, enc, OPTIONS);
}

export const PHOENIX_SYSTEM_PROMPT = [
  '# 𓅂 PHOENIX-P1 — Topological Grammar Subsequence Codec',
  'A message starting with `Ψ` carries extracted topological grammar motifs.',
  'Format: Ψ<rule_count>\\n<glyph><length>:<phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function phoenixSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'P0 empty', text: '' },
    { name: 'P1 repeated log header', text: '[INFO] gateway request completed with status 200\n[INFO] gateway request completed with status 200\n[INFO] gateway request completed with status 200' },
  ];
  return tests.map((t) => {
    const r = phoenixEncode(t.text, enc);
    const back = phoenixDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
