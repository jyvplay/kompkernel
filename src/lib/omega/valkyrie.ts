/**
 * ★ VALKYRIE-V1 — Terminal Direct-Reasoning Lossless Prompt Codec
 */
import { type EncodingName } from './bpe';
import {
  cjkContractorDecode,
  cjkContractorEncode,
  type CjkContractorEntry,
  type CjkContractorResult,
} from './cjk-contractor';

export type ValkyrieEntry = CjkContractorEntry;
export type ValkyrieResult = CjkContractorResult;

const OPTS = {
  sentinel: '★V\n',
  modeName: 'valkyrie',
  equalsHeader: false,
  maxPool: 350,
  maxEntries: 64,
  maxCandidateTrials: 30,
};

export function valkyrieDecode(wire: string): string {
  return cjkContractorDecode(wire, OPTS);
}

export function valkyrieEncode(text: string, enc: EncodingName = 'o200k_base'): ValkyrieResult {
  return cjkContractorEncode(text, enc, OPTS) as ValkyrieResult;
}

export const VALKYRIE_SYSTEM_PROMPT = [
  '# ★ VALKYRIE-V1 — terminal byte-exact equals-free CJK single-token contractive dictionary wire',
  'The message may begin with an equals-free micro-header block:',
  '  ★V',
  '  <alias><phrase>',
  'Decode rules (apply mentally; do not emit expansions unless asked):',
  '1. Each micro-header line maps its leading CJK single-token character (alias) directly to the remaining phrase on that line.',
  '   Escapes in phrases: \\\\=\\, \\n=newline, \\r=CR, \\S=★.',
  '2. In the body after the blank line, each alias character stands for its original phrase.',
  '3. Decode in reverse order (last dictionary entry first) to handle nested aliases.',
  '4. Everything else is literal. Reconstruction is byte-exact.',
  '5. If there is no ★V header, the text is literal.',
  'OUTPUT CONTRACT: answer densely; code fences, numbers, and identifiers verbatim.',
].join('\n');

export interface ValkyrieSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export function valkyrieSelfTest(enc: EncodingName = 'o200k_base'): ValkyrieSelfTest[] {
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
    { name: 'V0 empty', text: '' },
    { name: 'V1 short prose', text: 'The quick brown fox jumps over the lazy dog.' },
    { name: 'V2 900-char chaotic hetero text', text: sample900 },
    { name: 'V3 sentinel adversary', text: '★V\nfake trap\n\nnot real' },
    { name: 'V4 CRLF + unicode', text: 'line1\r\nline2\r\n中文 🚀🚀 ≈done\r\n' },
    {
      name: 'V5 repetitive JSON log',
      text: Array.from(
        { length: 30 },
        (_, i) =>
          `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
      ).join('\n'),
    },
  ];

  const out: ValkyrieSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = valkyrieEncode(c.text, enc);
      const roundTrip = valkyrieDecode(r.wire) === c.text;
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
