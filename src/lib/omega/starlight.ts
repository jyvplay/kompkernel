/**
 * ★ STARLIGHT-S1 — Direct Reasoning Byte-Exact Lossless Codec
 */
import { type EncodingName } from './bpe';
import {
  cjkContractorDecode,
  cjkContractorEncode,
  type CjkContractorEntry,
  type CjkContractorResult,
} from './cjk-contractor';

export type StarlightEntry = CjkContractorEntry;
export type StarlightResult = CjkContractorResult;

const OPTS = {
  sentinel: '★S\n',
  modeName: 'starlight',
  equalsHeader: true,
  maxPool: 150,
  maxEntries: 32,
  maxCandidateTrials: 25,
};

export function starlightDecode(wire: string): string {
  return cjkContractorDecode(wire, OPTS);
}

export function starlightEncode(text: string, enc: EncodingName = 'o200k_base'): StarlightResult {
  return cjkContractorEncode(text, enc, OPTS) as StarlightResult;
}

export const STARLIGHT_SYSTEM_PROMPT = [
  '# ★ STARLIGHT-S1 — byte-exact CJK single-token contractive dictionary wire',
  'The message may begin with a header block:',
  '  ★S',
  '  alias=phrase',
  'Decode rules (apply mentally; do not emit expansions unless asked):',
  '1. Each header line maps a CJK single-token character (alias) to its original phrase.',
  '   Escapes in phrases: \\\\=\\, \\n=newline, \\r=CR, \\S=★.',
  '2. In the body after the blank line, each alias character stands for its original phrase.',
  '3. Decode in reverse order (last dictionary entry first) to handle nested aliases.',
  '4. Everything else is literal. Reconstruction is byte-exact.',
  '5. If there is no ★S header, the text is literal.',
  'OUTPUT CONTRACT: answer densely; code fences, numbers, and identifiers verbatim.',
].join('\n');

export interface StarlightSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export function starlightSelfTest(enc: EncodingName = 'o200k_base'): StarlightSelfTest[] {
  const sample900 =
    'System Prompt & Operational Directives:\n' +
    'You are an advanced autonomous reasoning engine executing multi-step agentic workflows.\n' +
    'Task Queue:\n' +
    '1. Parse CSV Dataset:\n' +
    'id,service,status,latency_ms,retry_cnt\n' +
    '101,auth-gw,200,14.2,0\n' +
    '102,billing-db,500,892.1,3\n' +
    '103,cache-node,200,1.8,0\n' +
    '2. Inspect JSON state payload:\n' +
    '{"cluster": "prod-us-east", "active_nodes": [101, 103], "health": {"score": 0.98, "degraded": false}, "flags": ["h2", "tls1.3"]}\n' +
    '3. Analyze Python algorithm snippet:\n' +
    'def evaluate_entropy(tokens: list[str]) -> float:\n' +
    '    # Compute normalized shannon entropy\n' +
    '    counts = {t: tokens.count(t) for t in set(tokens)}\n' +
    '    n = len(tokens)\n' +
    '    return -sum((c/n) * Math.log2(c/n) for c as c in counts.values()) if n > 0 else 0.0\n' +
    '4. CJK / Chinese summary verification:\n' +
    '本系统采用高阶同态语法树与多维熵率压缩，在严格保证字节无损(byte-exact lossless)的前提下，达成极致BPE Token缩减.\n' +
    '5. Execution logs:\n' +
    '[2026-09-16 03:10:01] INFO [auth-gw] token_refresh ok user_id=88421\n' +
    '[2026-09-16 03:10:02] WARN [billing-db] query timeout after 800ms\n' +
    '6. End of instructions. Output final decision tag [PROCEED].';

  const cases: { name: string; text: string }[] = [
    { name: 'S0 empty', text: '' },
    { name: 'S1 short prose', text: 'The quick brown fox jumps over the lazy dog.' },
    { name: 'S2 900-char chaotic hetero text', text: sample900 },
    { name: 'S3 sentinel adversary', text: '★S\nfake=trap\n\nnot real' },
    { name: 'S4 CRLF + unicode', text: 'line1\r\nline2\r\n中文 🚀🚀 ≈done\r\n' },
    {
      name: 'S5 repetitive JSON log',
      text: Array.from(
        { length: 30 },
        (_, i) =>
          `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
      ).join('\n'),
    },
  ];

  const out: StarlightSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = starlightEncode(c.text, enc);
      const roundTrip = starlightDecode(r.wire) === c.text;
      const guardOk = r.mode === 'forced-wrap' ? true : r.outTokens <= r.inTokens;
      out.push({
        name: c.name,
        pass: roundTrip && r.exact && guardOk,
        details: `mode=${r.mode} entries=${r.entries.length} tok ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) exact=${r.exact}`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }

  return out;
}
