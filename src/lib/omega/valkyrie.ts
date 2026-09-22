/**
 * src/lib/omega/valkyrie.ts
 * =============================================================================
 * 🛡️ VALKYRIE-V1 — Vectorized In-Context Degenerate Lattice Subgraph Contracting
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

export const VALKYRIE_SENTINEL = '⟁V';
export const VALKYRIE_LITERAL = '⟁V⟁V';

const OPTIONS: ContractorOptions = {
  sentinel: VALKYRIE_SENTINEL,
  literalSentinel: VALKYRIE_LITERAL,
  codeRangeStart: 0x0386,
  codeRangeEnd: 0x044f,
  codecName: 'VALKYRIE-V1',
};

export type ValkyrieRule = ContractorRule;
export type ValkyrieResult = ContractorResult;

export function valkyrieDecode(wire: string): string {
  return contractDecode(wire, OPTIONS);
}

export function valkyrieEncode(text: string, enc: EncodingName = 'o200k_base'): ValkyrieResult {
  return contractEncode(text, enc, OPTIONS);
}

export const VALKYRIE_SYSTEM_PROMPT = [
  '# 🛡️ VALKYRIE-V1 — Degenerate Subgraph Contracting Codec',
  'A message starting with `⟁V` carries contracted degenerate lattice subgraphs.',
  'Format: ⟁V<rule_count>\\n<glyph><length>:<subgraph>\\n...\\n<body>.',
  'Expand glyphs bottom-to-top in body. Reconstruction is 100% byte-exact.',
].join('\n');

export function valkyrieSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const tests = [
    { name: 'V0 empty', text: '' },
    { name: 'V1 repeated code block', text: 'for(let i=0;i<3;i++){\n  console.log(i);\n}\nfor(let i=0;i<3;i++){\n  console.log(i);\n}' },
  ];
  return tests.map((t) => {
    const r = valkyrieEncode(t.text, enc);
    const back = valkyrieDecode(r.wire);
    return { name: t.name, pass: r.exact && back === t.text, details: `${r.mode} ${r.inTokens}→${r.outTokens}` };
  });
}
