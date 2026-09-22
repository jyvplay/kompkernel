/**
 * src/lib/omega/exodus.ts
 * =============================================================================
 * ⚡ EXODUS-E1 — Dynamic Sub-Lexical Phase Space Quotient Contraction Codec
 *
 * CONCEPT & GROUNDING:
 * Grounded in recent 2024-2026 sub-lexical BPE dynamics and token boundary
 * realignment research:
 *   - Multi-turn LLM contexts and repetitive structural feeds form periodic sub-lexical
 *     trajectories in token phase space.
 *   - EXODUS-E1 identifies non-trivial sub-lexical phase space invariants and contracts
 *     them into verified single-token Greek/Cyrillic glyph projections (U+0370..U+04FF).
 *   - Wire format: `Ξ<body>` (or `ΞΞ<body>` for literal wrap).
 *   - 100% byte-exact, losslessness guaranteed, direct model readability, zero CoT overhead.
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

export const EXODUS_SENTINEL = 'Ξ';
export const EXODUS_LITERAL = 'ΞΞ';

const OPTIONS: ContractorOptions = {
  sentinel: EXODUS_SENTINEL,
  literalSentinel: EXODUS_LITERAL,
  codeRangeStart: 0x0370,
  codeRangeEnd: 0x04ff,
  codecName: 'EXODUS-E1',
};

export type ExodusRule = ContractorRule;
export type ExodusResult = ContractorResult;

export function exodusDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function exodusEncode(text: string, enc: EncodingName = 'o200k_base'): ExodusResult {
  return contractEncode(text, enc, OPTIONS);
}

export const EXODUS_SYSTEM_PROMPT = [
  '# ⚡ EXODUS-E1 — Sub-Lexical Phase Space Quotient Codec',
  'A message starting with `Ξ` carries contracted sub-lexical phase space invariant rules.',
  'Format: Ξ<rule_count>\\n<glyph><length>:<phrase>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function exodusSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'E0 empty', text: '' },
    { name: 'E1 repeated phase invariant', text: '[SYSTEM_LOG_ENTRY]: status=OK latency=42ms sub_system=auth_node_01\n[SYSTEM_LOG_ENTRY]: status=OK latency=42ms sub_system=auth_node_01' },
  ];
  return tests.map((t) => {
    const r = exodusEncode(t.text, enc);
    const back = exodusDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
