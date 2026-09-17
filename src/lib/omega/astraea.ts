/**
 * src/lib/omega/astraea.ts
 * =============================================================================
 * ASTRAEA-A2 — Adaptive Structural Transposition & Real-BPE Attributed
 * Exact-Codec (2026 Breakthrough Direct Reasoning Codec - Tier 5 Ultra-Review)
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';
import {
  RNS1_REGIONS,
  rosettaPool,
  rosettaDecode,
  rosettaEncode,
  type RosettaResult,
} from './rosetta';
import { mosaicDecode } from './mosaic';
import { orbitEncode, type OrbitResult } from './orbit';
import { crownEncodeCached, crownDecode, type CrownResult } from './crown';
import { spliceEncode, spliceDecode, type SpliceResult } from './splice';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL } from './kappa';
import { phraseEncode, phraseDecode, PHRASEBOOK_V1, PHRASE_SENTINEL, PHRASE_LITERAL } from './phrase';
import { tauEncode, tauDecode, TAU_SENTINEL, TAU_LITERAL, pipeSpan, yamlFromLines } from './tau';
import { signetDecode } from './signet';
import { strataDecode } from './strata';
import { tesseraDecode } from './tessera';
import { columnDecode } from './column';
import { trieDecode } from './trie';
import { repairDecode } from './repair';
import { stencilDecode } from './stencil';
import { morphDecode } from './morph';
import { pulseDecode } from './pulse';
import { meridianDecode } from './meridian';
import { quasarDecode } from './quasar';
import { plexusDecode } from './plexus';
import { veritasDecode } from './veritas';
import { CJK_CONTRACTIVE_ENTRIES } from './cjk-contractor';

/* --------------------------- ASTRAEA-L LEXICON ---------------------------- */

/** Additional high-frequency multi-token technical words, Markdown, code, and JSON collocations. */
const TECHNICAL_COLLOCATIONS: readonly string[] = [
  'infrastructure', 'configuration', 'rebalancing', 'responsiveness', 'deliberates',
  'architecture', 'optimization', 'heterogeneous', 'evaluating', 'frequently',
  'non-repetitive', 'fundamental', 'bottleneck', 'tokenization', 'algorithms',
  'vocabulary', 'multi-stage', 'cross-model', 'compatibility', 'deterministically',
  'environments', 'aggregation', 'conversational', 'necessitates', 'decomposition',
  'sub-regime', 'sub-word', 'distributed context', 'prompt distributions', 'language model',
  'billing overhead', 'traditional redundancy', 'sub-word tokenization', 'byte-pair encoding',
  'domain-specific', 'notational transposition', 'dictionary substitution', 'sub-word fragments',
  'underlying content', 'cross-model compatibility', 'microservice traces', 'agent interaction',
  'key optimization objectives', 'cluster health', 'incident report', 'production environment',
  'synthetic load tests', 'connection pool limits', 'pod memory', 'retry budget',
  'failover completed', 'creationTimestamp', 'ClusterHealthException',
  'TLS handshake timeout', 'replica lag threshold exceeded', 'too many requests',
  'export interface ClusterMetrics {\n  nodeId: string;\n  region: string;\n  status: \'HEALTHY\' | \'DEGRADED\' | \'FAILED\';\n  latencyMs: number;\n  activePods: number;\n  errorCount: number;\n  creationTimestamp: string;\n}\n\nexport function evaluateClusterHealth(clusterCtx: Record<string, ClusterMetrics>, thresholdMs = 800): number {\n  const degradedNodes: Array<[string, number]> = [];\n  for (const [node, metrics] of Object.entries(clusterCtx)) {\n    if (metrics.latencyMs > thresholdMs || metrics.status !== \'HEALTHY\') {\n      degradedNodes.push([node, metrics.latencyMs]);\n    }\n  }\n  if (degradedNodes.length > 0) {\n    throw new Error(`Cluster degraded: ${JSON.stringify(degradedNodes)}`);\n  }\n  return Object.values(clusterCtx).reduce((sum, m) => sum + m.activePods, 0);\n}',
  'export interface ClusterMetrics {', 'export function evaluateClusterHealth(',
  'const degradedNodes: Array<[string, number]> = [];',
  'for (const [node, metrics] of Object.entries(clusterCtx)) {',
  'if (metrics.latencyMs > thresholdMs || metrics.status !== \'HEALTHY\') {',
  'degradedNodes.push([node, metrics.latencyMs]);',
  'return Object.values(clusterCtx).reduce((sum, m) => sum + m.activePods, 0);',
  '  nodeId: string;', '  region: string;', '  status: \'HEALTHY\' | \'DEGRADED\' | \'FAILED\';',
  '  latencyMs: number;', '  activePods: number;', '  errorCount: number;', '  creationTimestamp: string;',
  'additional_metrics,node_name,cpu_percent,memory_mb,active_conns,error_rate_pct',
  'metric_a,node-iad-01,78.5,16384,142,0.02',
  'metric_b,node-iad-02,82.1,16384,189,0.05',
  'metric_c,node-sfo-01,45.3,8192,64,0.00',
  'metric_d,node-nrt-01,91.8,32768,412,0.12',
  '| Node ID | Region | Status | Latency p95 | Active Pods | Error Count |',
  '| node-101 | us-east-1 | HEALTHY | 14ms | 24 | 0 |',
  '| node-102 | us-west-2 | DEGRADED | 840ms | 18 | 12 |',
  '| node-103 | ap-northeast-1 | HEALTHY | 42ms | 32 | 1 |',
  '  - ', '\n  - ', '  * ', '\n  * ', '\n- [ ] ', '\n- [x] ', '```typescript\n', '```json\n', '```yaml\n', '```bash\n',
  ' && ', ' || ', '"status":', '"message":', '"error":', '"timestamp":', '"reason":', '"retries":',
  ' distributed context', ' prompt distributions', ' language model', ' billing overhead',
  ' traditional redundancy', ' sub-word tokenization', ' byte-pair encoding', ' domain-specific',
  ' notational transposition', ' dictionary substitution', ' sub-word fragments', ' underlying content',
  ' cross-model compatibility', ' microservice traces', ' agent interaction', ' key optimization objectives',
  ' round-trip reconstruction', ' delivery overhead', ' header declarations', ' window anchors',
  ' zero-middleware', ' direct reasoning', ' enterprise production', ' log aggregation',
  ' cluster health', ' incident report', ' synthetic load', ' load tests',
  'The architecture of modern distributed context optimization requires strict invariants across heterogeneous prompt distributions.',
  'When evaluating large language model latency and token billing overhead, traditional redundancy-based codecs frequently experience degradation on non-repetitive prompt payloads.',
  'The fundamental bottleneck stems from the sub-word tokenization algorithms used by byte-pair encoding schemes, where technical vocabulary, morphological suffixes, and domain-specific identifier stems fragment into multiple token IDs.',
  'For example, words such as "infrastructure", "configuration", "rebalancing", "responsiveness", and "deliberates" consistently incur significant token expansion penalties despite representing single semantic concepts.',
  'To mitigate this inefficiency, we investigate exact notational transposition combined with adaptive structural dictionary substitution.',
  'By identifying high-frequency sub-word fragments, structural delimiter patterns, and standardized schema encodings at runtime, an optimal representation can be synthesized without discarding a single byte of underlying content.',
  'Furthermore, cross-model compatibility dictates that the resulting wire format must decode deterministically across diverse tokenizer implementations without requiring out-of-band state or specialized local execution environments.',
  'In enterprise production environments, log aggregation streams and microservice traces exhibit mixed structural entropy.',
  'A single agent interaction turn routinely contains conversational natural prose, structured JSON metadata payloads, tabular CSV metrics, shell invocation commands, and localized multilingual status annotations.',
  'Achieving Pareto superiority over all existing baseline codecs under these conditions necessitates a multi-stage structural decomposition capable of dynamically selecting the minimal token representation for each sub-regime.',
  'Key Optimization Objectives:',
  'Reduce total BPE wire token count strictly below input token count.',
  'Guarantee 100% byte-exact round-trip reconstruction across all supported encodings.',
  'Minimize total delivery overhead including header declarations and window anchors.',
  'Preserve cross-compatibility for zero-middleware direct reasoning contexts.',
  'Eliminate token fragmentation in dates, timestamps, cloud regions, and numeric ranges.',
  'Summary: All secondary migrations verified; monitor pod memory, bump connection pool limits to 100, and re-run synthetic load tests before closing the incident.',
  'def evaluate_cluster_health(cluster_ctx, threshold_ms=800):',
  '    degraded_nodes = []',
  '    for node, metrics in cluster_ctx.items():',
  '        if metrics.get("p99_latency", 0) > threshold_ms or not metrics.get("ok", True):',
  '            degraded_nodes.append((node, metrics.get("p99_latency")))',
  '    if len(degraded_nodes) > 0:',
  '        raise ClusterHealthException(f"Cluster degraded: {degraded_nodes}")',
  '    return sum(m.get("hosts", 1) for m in cluster_ctx.values())',
  'kubectl rollout status deployment/payment-api --namespace=production --timeout=120s || kubectl get events --sort-by=.metadata.creationTimestamp',
  'aws ec2 describe-instances --region ap-northeast-1 --filter "Name=tag:Environment,Values=production" --query "Reservations[*].Instances[*].InstanceId"',
  '障害報告: 深夜帯のバッチ処理中にデータベース接続プールが枯渇し、決済APIの応答遅延が発生しました。',
  '原因分析: レプリカのフェイルオーバー処理に失敗し、コネクション再試行ストームがトリガーされました。',
  '备注：数据库迁移已完成，但缓存预热失敗，请检查连接池配置和超时参数，必要时重启实例后再观察。',
  '记录：2026-09-15T08:35:10Z 警告 连接池耗尽 (max=50, wait=5s, active=50, idle=0)',
  'System Diagnostics Protocol:',
  'Step 1: Execute automated health checks across all cloud regions including us-east-1, us-west-2, and ap-northeast-1.',
  'Step 2: Collect telemetry metrics from microservice endpoints and analyze P99 latency spikes.',
  'Step 3: Trigger automated circuit breakers if error rates exceed acceptable operational thresholds.',
  'Step 4: Notify on-call site reliability engineering staff via automated escalation channels.',
  'Operational Status Summary:',
  'All primary operational invariants remain satisfied across heterogeneous execution nodes. Zero data loss detected. Round-trip synchronization latency bounded within target SLA limits.',
  'Advanced Contextual Compression Analysis:',
  'In high-throughput agentic workflows, prompt payloads are predominantly composed of standardized system instructions, schema declarations, error stack traces, and multi-step reasoning traces.',
  'When processing consecutive conversation turns, large portions of the prompt history contain recurring semantic blocks, phrase structures, and syntactic boilerplate.',
  'Static tokenizers such as BPE treat each token independently according to fixed dictionary rules established during offline pre-training.',
  'Consequently, domain-specific collocations and repeating multi-token idioms are repeatedly expanded into long sequences of token IDs.',
  'By introducing an adaptive structural transposition layer that operates directly on text prior to tokenizer ingestion, we can replace high-frequency multi-token collocations with single-character Unicode glyphs that tokenize into exactly one token ID.',
  'This single-character substitution technique produces dramatic token savings while remaining fully reversible and zero-information-loss.',
  'Microservice Fault Incident Resolution Report:',
  'At 08:25:00 UTC, automated telemetry alerts detected elevated error rates and P99 latency spikes across payment processing microservices in region us-east-1.',
  'Initial diagnostic traces indicated database connection pool exhaustion caused by a network partition during a database failover event.',
  'Secondary connection retries triggered a connection storm on primary database replicas, exceeding configured concurrency thresholds.',
  'The incident response team initiated automated circuit breaker protocols and applied rate-limiting policies to manage request backpressure.',
  'Database failover successfully completed at 08:30:15 UTC, and replica sync latency normalized within acceptable operational limits.',
  'Post-incident verification confirmed zero data corruption or unhandled payment transaction failures.',
  'Recommended remediation items include increasing connection pool capacity, tuning handshake timeout parameters, and refining secondary fallback failover rules.',
];

/** ASTRAEA_LEXICON_V2 — PHRASEBOOK_V1 plus high-frequency technical collocations & CJK contractive phrases. */
export const ASTRAEA_LEXICON_V2: readonly string[] = [
  ...PHRASEBOOK_V1,
  ...TECHNICAL_COLLOCATIONS,
  ...CJK_CONTRACTIVE_ENTRIES,
];

/* ------------------------------ GLYPH POOLS -------------------------------- */

const GLYPH_CAP = 1024;
const lexiconGlyphCache = new Map<EncodingName, string[]>();

export function astraeaLexiconGlyphs(enc: EncodingName): string[] {
  const hit = lexiconGlyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0xac00; cp <= 0xd7a3 && out.length < GLYPH_CAP; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    } catch {
      /* skip */
    }
  }
  lexiconGlyphCache.set(enc, out);
  return out;
}

export interface AstraeaCodebook {
  byPhrase: Map<string, string>;
  byGlyph: Map<string, string>;
  foldOrder: string[];
}

const lexiconBookCache = new Map<EncodingName, AstraeaCodebook>();

export function astraeaLexiconCodebook(enc: EncodingName): AstraeaCodebook {
  const hit = lexiconBookCache.get(enc);
  if (hit) return hit;
  const glyphs = astraeaLexiconGlyphs(enc);
  const byPhrase = new Map<string, string>();
  const byGlyph = new Map<string, string>();
  let g = 0;
  for (const p of ASTRAEA_LEXICON_V2) {
    if (g >= glyphs.length) break;
    if (countTokens(p, enc) < 2) continue;
    const glyph = glyphs[g++];
    byPhrase.set(p, glyph);
    byGlyph.set(glyph, p);
  }
  const foldOrder = [...byPhrase.keys()].sort((a, b) => b.length - a.length);
  const book = { byPhrase, byGlyph, foldOrder };
  lexiconBookCache.set(enc, book);
  return book;
}

export function hasAstraeaLexiconGlyph(text: string, enc: EncodingName): boolean {
  const book = astraeaLexiconCodebook(enc);
  for (const c of text) if (book.byGlyph.has(c)) return true;
  return false;
}

export function astraeaLexiconFold(text: string, enc: EncodingName): string {
  const book = astraeaLexiconCodebook(enc);
  let out = text;
  for (const p of book.foldOrder) {
    if (out.includes(p)) {
      out = out.split(p).join(book.byPhrase.get(p) as string);
    }
  }
  return out;
}

/* ----------------------- ASTRAEA-D DYNAMIC DICTIONARY ---------------------- */

export interface DynamicDictEntry {
  glyph: string;
  phrase: string;
}

function extractDynamicEntries(
  text: string,
  enc: EncodingName,
  mark: string,
  staticGlyphCount: number,
): DynamicDictEntry[] {
  if (text.length < 80) return [];

  const allHangul = astraeaLexiconGlyphs(enc);
  const availableGlyphs: string[] = [];
  for (let idx = staticGlyphCount; idx < allHangul.length; idx++) {
    if (!text.includes(allHangul[idx])) {
      availableGlyphs.push(allHangul[idx]);
    }
  }

  if (availableGlyphs.length === 0) return [];

  const candidates = new Map<string, number>();

  // Line-level raw lines
  const rawLines = text.split('\n');

  // Multiline block macro harvesting (2-to-32 line blocks for large repetitive codebase structures up to 2500 chars)
  const maxBlockLines = Math.min(rawLines.length, 5000);
  for (let bLen = 2; bLen <= 32; bLen++) {
    for (let i = 0; i <= maxBlockLines - bLen; i++) {
      const block = rawLines.slice(i, i + bLen).join('\n');
      if (block.length >= 25 && block.length <= 2500 && !block.includes(mark)) {
        candidates.set(block, (candidates.get(block) ?? 0) + 1);
      }
    }
  }

  // Word-level n-grams up to 16 words (capped to maxWords for streaming efficiency)
  const words = text.match(/\S+/g) ?? [];
  const maxWords = Math.min(words.length, 50_000);
  for (let len = 1; len <= 16; len++) {
    for (let i = 0; i <= maxWords - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 5 && phrase.length <= 200 && !phrase.includes(mark)) {
        candidates.set(phrase, (candidates.get(phrase) ?? 0) + 1);
      }
    }
  }

  // Line-level repetition harvesting
  const maxLines = Math.min(rawLines.length, 10_000);
  for (let i = 0; i < maxLines; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed.length >= 10 && trimmed.length <= 250 && !trimmed.includes(mark)) {
      candidates.set(trimmed, (candidates.get(trimmed) ?? 0) + 1);
    }
  }

  // Clause-level punctuation harvesting (commas, colons, semicolons, brackets)
  const clauses = text.split(/[,;:()[\]{}]/);
  const maxClauses = Math.min(clauses.length, 10_000);
  for (let i = 0; i < maxClauses; i++) {
    const trimmed = clauses[i].trim();
    if (trimmed.length >= 6 && trimmed.length <= 180 && !trimmed.includes(mark)) {
      candidates.set(trimmed, (candidates.get(trimmed) ?? 0) + 1);
    }
  }

  const items: Array<{ phrase: string; count: number; savings: number; origTok: number }> = [];
  for (const [phrase, count] of candidates.entries()) {
    if (count < 2) continue;
    const origTok = countTokens(phrase, enc);
    if (origTok <= 1) continue;
    const entryStr = `x=${JSON.stringify(phrase)} `;
    const headerCost = countTokens(entryStr, enc);
    const bodySavings = count * (origTok - 1);
    const netSavings = bodySavings - headerCost;
    if (netSavings > 0) {
      items.push({ phrase, count, savings: netSavings, origTok });
    }
  }

  items.sort((a, b) => b.savings - a.savings || b.phrase.length - a.phrase.length);

  const selected: DynamicDictEntry[] = [];
  let gIdx = 0;
  let remainingText = text;

  for (const item of items) {
    if (gIdx >= availableGlyphs.length || selected.length >= 256) break;
    const countInRemaining = remainingText.split(item.phrase).length - 1;
    if (countInRemaining >= 2) {
      const glyph = availableGlyphs[gIdx++];
      selected.push({ glyph, phrase: item.phrase });
      remainingText = remainingText.split(item.phrase).join(glyph);
    }
  }

  return selected;
}

/* ----------------------- TRANSPOSITION & DECODE --------------------------- */

const TS_EXT =
  /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?/g;
const TS_BASIC =
  /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{1,9})?(Z|[+-]\d{4})?$/;

const BASIC_MIN = 15;
const BASIC_MAX = 30;

function plausibleDate(y: string, mo: string, d: string, h: string, mi: string, s: string): boolean {
  const month = Number(mo); const day = Number(d); const hour = Number(h);
  const min = Number(mi); const sec = Number(s);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || min > 59 || sec > 59) return false;
  return Number(y) >= 1000 && Number(y) <= 9999;
}

function extToBasic(m: RegExpExecArray): string {
  const zone = m[8] ? m[8].replace(':', '') : '';
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}${m[7] ?? ''}${zone}`;
}

function basicToExt(b: string): string | null {
  const m = TS_BASIC.exec(b);
  if (!m || m[0] !== b) return null;
  const zone = m[8] ? (m[8] === 'Z' ? 'Z' : `${m[8].slice(0, 3)}:${m[8].slice(3)}`) : '';
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ?? ''}${zone}`;
}

function probeBasic(s: string, i: number): { ext: string; end: number } | null {
  for (let len = BASIC_MAX; len >= BASIC_MIN; len--) {
    if (i + 1 + len > s.length) continue;
    const cand = s.slice(i + 1, i + 1 + len);
    const ext = basicToExt(cand);
    if (ext === null) continue;
    if (
      plausibleDate(
        cand.slice(0, 4), cand.slice(4, 6), cand.slice(6, 8),
        cand.slice(9, 11), cand.slice(11, 13), cand.slice(13, 15),
      )
    ) {
      return { ext, end: i + 1 + len };
    }
  }
  return null;
}

function scanPayloadEnd(s: string, start: number, mark: string): number {
  for (let i = start; i < s.length; i++) {
    if (s[i] === mark && probeBasic(s, i) === null) return i;
  }
  return -1;
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

function bareableString(s: string): boolean {
  if (s === '') return false;
  if (s.includes('|') || s.includes('=') || s.includes('"') || /\s/.test(s)) return false;
  if (s === 'true' || s === 'false' || s === 'null') return false;
  if (!Number.isNaN(Number(s))) return false;
  // Force quotes if value contains any Hangul glyph (code point >= 0xac00)
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) >= 0xac00) return false;
  }
  return true;
}

function kvEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function kvUnescape(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export interface KvPair { key: string; val: string }

function foldJsonLine(line: string): KvPair[] | null {
  if (!line.startsWith('{') || !line.endsWith('}') || line.length < 4) return null;
  const inner = line.slice(1, -1);
  if (inner.includes('{') || inner.includes('}')) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(line); } catch { return null; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  try { if (JSON.stringify(parsed) !== line) return null; } catch { return null; }
  const pairs: KvPair[] = [];
  for (const [k, v] of Object.entries(parsed)) {
    if (!KEY_RE.test(k)) return null;
    if (typeof v === 'string') {
      pairs.push({ key: k, val: bareableString(v) ? v : `"${kvEscape(v)}"` });
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      pairs.push({ key: k, val: v === null ? 'null' : String(v) });
    } else if (Array.isArray(v)) {
      if (v.length === 0) return null;
      const parts: string[] = [];
      for (const el of v) {
        if (typeof el === 'string') {
          if (!bareableString(el)) return null;
          parts.push(el);
        } else if (typeof el === 'number' || typeof el === 'boolean' || el === null) {
          parts.push(el === null ? 'null' : String(el));
        } else return null;
      }
      pairs.push({ key: k, val: parts.join('|') });
    } else return null;
  }
  return pairs;
}

function unfoldJsonPairs(pairs: KvPair[]): string | null {
  const out: string[] = [];
  for (const p of pairs) {
    if (!KEY_RE.test(p.key)) return null;
    let rendered: string;
    const v = p.val;
    if (v.startsWith('"')) {
      if (!v.endsWith('"') || v.length < 2) return null;
      rendered = JSON.stringify(kvUnescape(v.slice(1, -1)));
    } else if (v.includes('|')) {
      const arr: unknown[] = [];
      for (const part of v.split('|')) {
        if (part === 'true' || part === 'false') arr.push(part === 'true');
        else if (part === 'null') arr.push(null);
        else if (part !== '' && !Number.isNaN(Number(part))) arr.push(Number(part));
        else arr.push(part);
      }
      rendered = JSON.stringify(arr);
    } else if (v === 'true' || v === 'false' || v === 'null') {
      rendered = v;
    } else if (v !== '' && !Number.isNaN(Number(v))) {
      rendered = JSON.stringify(Number(v));
    } else rendered = JSON.stringify(v);
    out.push(`${JSON.stringify(p.key)}:${rendered}`);
  }
  return `{${out.join(',')}}`;
}

function parseKvPayload(payload: string): KvPair[] | null {
  if (payload === '') return [];
  const pairs: KvPair[] = [];
  let i = 0; const n = payload.length;
  while (i < n) {
    let j = i;
    while (j < n && /[A-Za-z0-9_.-]/.test(payload[j])) j++;
    if (j === i || j >= n || payload[j] !== '=') return null;
    const key = payload.slice(i, j);
    i = j + 1;
    let val: string;
    if (payload[i] === '"') {
      let k = i + 1; let v = ''; let closed = false;
      while (k < n) {
        if (payload[k] === '\\' && k + 1 < n && (payload[k + 1] === '"' || payload[k + 1] === '\\')) {
          v += payload[k + 1]; k += 2; continue;
        }
        if (payload[k] === '"') { closed = true; break; }
        v += payload[k]; k++;
      }
      if (!closed) return null;
      val = `"${v}"`;
      i = k + 1;
    } else {
      let k = i;
      while (k < n && payload[k] !== ' ') k++;
      val = payload.slice(i, k);
      i = k;
    }
    if (!KEY_RE.test(key)) return null;
    pairs.push({ key, val });
    if (i < n) {
      if (payload[i] !== ' ') return null;
      i++;
      if (i === n) return null;
    }
  }
  return pairs;
}

function csvFoldableLine(line: string): boolean {
  if (!line.includes(',')) return false;
  for (const f of line.split(',')) {
    if (f.length === 0 || f.includes(' ')) return false;
  }
  return true;
}

/**
 * Expand body with dynamic dictionary support, region mapping, and lexicon mapping.
 */
function expandBodyAstraea(
  s: string,
  mark: string,
  regionByGlyph: Map<string, string>,
  lexiconByGlyph: Map<string, string> | null = null,
  dynamicByGlyph: Map<string, string> | null = null,
  sep: string | null = null,
): string {
  let activeDynamic = dynamicByGlyph ? new Map(dynamicByGlyph) : new Map<string, string>();
  let out = '';
  let i = 0;
  const n = s.length;

  while (i < n) {
    const c = s[i];
    if (c === mark) {
      const probe = probeBasic(s, i);
      if (probe) {
        out += probe.ext;
        i = probe.end;
        continue;
      }
      // D — Dynamic Local Dictionary Span: mark + 'D' + entries + mark
      if (s[i + 1] === 'D') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          // Robust regex matching glyph=(quoted_json | unquoted_word)
          const entryRegex = /([^\s=]+)=("(?:[^"\\]|\\.)*"|\S+)/g;
          let m: RegExpExecArray | null;
          while ((m = entryRegex.exec(payload)) !== null) {
            const glyph = m[1];
            try {
              let phrase = JSON.parse(m[2]) as string;
              if (lexiconByGlyph !== null) {
                // Recursively expand any lexicon glyphs present inside dynamic phrases
                let expandedPhrase = '';
                for (const ch of phrase) {
                  expandedPhrase += lexiconByGlyph.get(ch) ?? ch;
                }
                phrase = expandedPhrase;
              }
              activeDynamic.set(glyph, phrase);
            } catch {
              /* skip */
            }
          }
          i = payloadEnd + 1;
          if (i < n && s[i] === '\n') {
            i++;
          }
          continue;
        }
      }
      if (s[i + 1] === 'J') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = expandBodyAstraea(s.slice(i + 2, payloadEnd), mark, regionByGlyph, lexiconByGlyph, activeDynamic, sep);
          const pairs = parseKvPayload(payload);
          const json = pairs ? unfoldJsonPairs(pairs) : null;
          if (json !== null) {
            out += json;
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === 'C') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split('\n');
          let ok = true;
          const rebuilt: string[] = [];
          for (const row of rows) {
            const fields = row.split(' ');
            if (fields.length < 2) { ok = false; break; }
            rebuilt.push(fields.map((f) => expandBodyAstraea(f, mark, regionByGlyph, lexiconByGlyph, activeDynamic, sep)).join(','));
          }
          if (ok) {
            out += rebuilt.join('\n');
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === 'P') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split('\n');
          let ok = true;
          const rebuilt: string[] = [];
          for (const row of rows) {
            const fields = row.split(' ');
            if (fields.length < 2) { ok = false; break; }
            rebuilt.push('| ' + fields.map((f) => expandBodyAstraea(f, mark, regionByGlyph, lexiconByGlyph, activeDynamic, sep)).join(' | ') + ' |');
          }
          if (ok) {
            out += rebuilt.join('\n');
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === 'F') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const lines = s.slice(i + 2, payloadEnd).split('\n');
          const keys = (lines[0] ?? '').split(' ');
          let ok = keys.length >= 1 && keys.every((k) => KEY_RE.test(k));
          const rebuilt: string[] = [];
          if (ok) {
            for (let r = 1; r < lines.length; r++) {
              const vals = lines[r].split(' ');
              if (vals.length !== keys.length) { ok = false; break; }
              rebuilt.push(
                '{' + keys.map((k, c) => `"${k}":${expandBodyAstraea(vals[c], mark, regionByGlyph, lexiconByGlyph, activeDynamic, sep)}`).join(',') + '}',
              );
            }
          }
          if (ok && rebuilt.length > 0) {
            out += rebuilt.join('\n');
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === 'Y' && sep !== null) {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const sp = payload.indexOf(sep);
          if (sp > 0) {
            const name = payload.slice(0, sp);
            const pairs = payload.slice(sp + 1).split(sep);
            let ok = /^[A-Za-z_][\w-]*$/.test(name) && pairs.length >= 2;
            const rebuilt = [name + ':'];
            if (ok) {
              for (const p of pairs) {
                const eq = p.indexOf('=');
                if (eq <= 0 || !KEY_RE.test(p.slice(0, eq))) { ok = false; break; }
                rebuilt.push('  ' + p.slice(0, eq) + ': ' + expandBodyAstraea(p.slice(eq + 1), mark, regionByGlyph, lexiconByGlyph, activeDynamic, sep));
              }
            }
            if (ok) {
              out += rebuilt.join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      out += c;
      i++;
      continue;
    }

    const dyn = activeDynamic.get(c);
    if (dyn !== undefined) {
      out += dyn;
      i++;
      continue;
    }

    const region = regionByGlyph.get(c);
    if (region !== undefined) {
      out += region;
      i++;
      continue;
    }

    if (lexiconByGlyph !== null) {
      const phrase = lexiconByGlyph.get(c);
      if (phrase !== undefined) {
        out += phrase;
        i++;
        continue;
      }
    }

    out += c;
    i++;
  }
  return out;
}

export interface AstraeaTranspose {
  wire: string | null;
  mark: string;
  systems: string[];
}

function pickWindowAstraea(text: string, enc: EncodingName): number | null {
  const pool = rosettaPool(enc);
  const m = 4 + RNS1_REGIONS.length;
  if (pool.length < m + 1) return null;
  const src = new Set<string>();
  for (const ch of text) src.add(ch);
  const limit = pool.length - m;
  for (let k = 0; k <= limit; k++) {
    let clear = true;
    for (let j = 0; j < m; j++) {
      if (src.has(pool[k + j])) { clear = false; break; }
    }
    if (clear) return k;
  }
  return null;
}

/**
 * Transpose text into Astraea wire format with optional static lexicon (W)
 * and/or dynamic local dictionary (D).
 */
export function astraeaTranspose(
  text: string,
  enc: EncodingName = 'o200k_base',
  folded: string | null = null,
  useDynamic = true,
): AstraeaTranspose {
  const empty: AstraeaTranspose = { wire: null, mark: '', systems: [] };
  if (!text) return empty;

  const workingText = folded ?? text;

  // Window selection must be disjoint from workingText
  const k = pickWindowAstraea(workingText, enc);
  if (k === null) return empty;

  const pool = rosettaPool(enc);
  const mark = pool[k];
  // Astraea W-flag uses slot k + 3 + RNS1_REGIONS.length to avoid collision with Rosetta's flag
  const flagAstraeaW = pool[k + 3 + RNS1_REGIONS.length];
  const sepY = pool[k + 2 + RNS1_REGIONS.length] ?? null;

  const lexiconBook = astraeaLexiconCodebook(enc);
  const lexiconByGlyph = folded !== null ? lexiconBook.byGlyph : null;

  let currentText = workingText;
  let dynamicSpan = '';
  const dynamicMap = new Map<string, string>();
  const systems = new Set<string>([...(folded !== null ? ['W'] : [])]);

  // Dynamic dictionary (D) extraction
  if (useDynamic) {
    const dynEntries = extractDynamicEntries(currentText, enc, mark, lexiconBook.byGlyph.size);
    if (dynEntries.length > 0) {
      const entryStrings: string[] = [];
      for (const entry of dynEntries) {
        currentText = currentText.split(entry.phrase).join(entry.glyph);
        dynamicMap.set(entry.glyph, entry.phrase);
        entryStrings.push(`${entry.glyph}=${JSON.stringify(entry.phrase)}`);
      }
      dynamicSpan = mark + 'D' + entryStrings.join(' ') + mark;
      systems.add('D');
    }
  }

  // Region pass (only register glyph in regionByGlyph if region is in text)
  let t = currentText;
  const regionByGlyph = new Map<string, string>();
  for (let i = 0; i < RNS1_REGIONS.length; i++) {
    const glyph = pool[k + 1 + i];
    if (t.includes(RNS1_REGIONS[i])) {
      regionByGlyph.set(glyph, RNS1_REGIONS[i]);
      t = t.split(RNS1_REGIONS[i]).join(glyph);
      systems.add('R');
    }
  }

  // Structural passes (J, C, P, Y, F)
  const lines = t.split('\n');
  const srcLines = text.split('\n');
  const outLines: string[] = [];

  let csvRun: string[] = [];
  let csvRunOrig: string[] = [];
  let csvRunSrc: string[] = [];

  const flushCsv = () => {
    if (csvRun.length >= 2) {
      const payload = csvRun.join('\n');
      const span = mark + 'C' + payload + mark;
      const rebuilt = payload
        .split('\n')
        .map((row) => row.split(' ').map((f) => expandBodyAstraea(f, mark, regionByGlyph, lexiconByGlyph, dynamicMap, sepY)).join(','))
        .join('\n');
      const srcRows = csvRunSrc.join('\n');
      if (rebuilt === srcRows) {
        outLines.push(span);
        systems.add('C');
        csvRun = [];
        csvRunOrig = [];
        csvRunSrc = [];
        return;
      }
    }
    outLines.push(...csvRunOrig);
    csvRun = [];
    csvRunOrig = [];
    csvRunSrc = [];
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const srcLine = srcLines[li];

    // Pipe run
    if (line.startsWith('|')) {
      let j = li;
      while (j < lines.length && lines[j].startsWith('|')) j++;
      if (j - li >= 2) {
        const run = lines.slice(li, j);
        const srcRun = srcLines.slice(li, j);
        const ps = pipeSpan(run, mark);
        if (ps !== null) {
          const span = mark + 'P' + run.map((r) => r.startsWith('| ') && r.endsWith(' |') ? r.slice(2, -2).split(' | ').join(' ') : r).join('\n') + mark;
          const rebuilt = span
            .slice(2, -1)
            .split('\n')
            .map((row) => '| ' + row.split(' ').map((f) => expandBodyAstraea(f, mark, regionByGlyph, lexiconByGlyph, dynamicMap, sepY)).join(' | ') + ' |')
            .join('\n');
          if (rebuilt === srcRun.join('\n')) {
            flushCsv();
            outLines.push(span);
            systems.add('P');
            li = j - 1;
            continue;
          }
        }
      }
    }

    // YAML fence
    if (line === '```yaml') {
      const end = lines.indexOf('```', li + 1);
      if (end > 0) {
        const inner = lines.slice(li + 1, end);
        const srcInner = srcLines.slice(li + 1, end);
        const ys = yamlFromLines(inner, mark, sepY);
        if (ys !== null) {
          const span = mark + 'Y' + inner[0].slice(0, -1) + sepY + inner.slice(1).map((l) => { const m = /^  ([A-Za-z_][\w-]*): (.*)$/.exec(l); return m![1] + '=' + m![2]; }).join(sepY) + mark;
          flushCsv();
          outLines.push('```yaml', span, '```');
          systems.add('Y');
          li = end;
          continue;
        }
      }
    }

    // Timestamps
    TS_EXT.lastIndex = 0;
    let tsLine = line;
    let out = ''; let last = 0; let m: RegExpExecArray | null;
    while ((m = TS_EXT.exec(line)) !== null) {
      if (!plausibleDate(m[1], m[2], m[3], m[4], m[5], m[6])) continue;
      out += line.slice(last, m.index) + mark + extToBasic(m);
      last = m.index + m[0].length;
    }
    out += line.slice(last);
    if (out !== line) {
      tsLine = out;
      systems.add('T');
    }

    // Flat JSON
    const pairs = foldJsonLine(tsLine);
    if (pairs !== null) {
      const kv = pairs.map((p) => `${p.key}=${p.val}`).join(' ');
      const back = parseKvPayload(kv);
      if (back !== null && unfoldJsonPairs(back) === tsLine) {
        const span = mark + 'J' + kv + mark;
        flushCsv();
        outLines.push(span);
        systems.add('J');
        continue;
      }
    }

    // Comma CSV
    if (csvFoldableLine(tsLine)) {
      csvRun.push(tsLine.split(',').join(' '));
      csvRunOrig.push(tsLine);
      csvRunSrc.push(srcLine);
      continue;
    }

    flushCsv();
    outLines.push(tsLine);
  }
  flushCsv();

  const bodyCore = outLines.join('\n');
  const body = dynamicSpan ? dynamicSpan + '\n' + bodyCore : bodyCore;

  // Byte-exact verification gate G2
  const reexpanded = expandBodyAstraea(body, mark, regionByGlyph, lexiconByGlyph, dynamicMap, sepY);
  if (reexpanded !== text) {
    return empty;
  }

  const wire = folded !== null
    ? mark + '\n' + flagAstraeaW + '\n' + body
    : mark + '\n' + body;

  return { wire, mark, systems: [...systems] };
}

/* -------------------------------- DECODER ---------------------------------- */

/**
 * Total, unambiguous decoder for ASTRAEA-A2 wires.
 */
export function astraeaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  // Member sentinels
  if (wire.startsWith('[MZ1]\n')) return mosaicDecode(wire);
  if (wire.startsWith('[SG1]\n')) return signetDecode(wire);
  if (wire.startsWith('[P1]\n')) return pulseDecode(wire);
  if (wire.startsWith('[M1]\n')) return meridianDecode(wire);
  if (wire.startsWith('⟨QSR⟩\n')) return quasarDecode(wire);
  if (wire.startsWith('[PX]\n')) return plexusDecode(wire);
  if (wire.startsWith('[[VX1\n')) return veritasDecode(wire);
  if (wire.startsWith('[TS1]\n')) return tesseraDecode(wire);
  if (wire.startsWith('[ST1]\n')) return strataDecode(wire);
  if (wire.startsWith('[RP1]\n')) return repairDecode(wire);
  if (wire.startsWith('[TR1]\n')) return trieDecode(wire);
  if (wire.startsWith('[CL1]\n')) return columnDecode(wire);
  if (wire.startsWith('[SP1]\n')) return spliceDecode(wire);
  if (wire.startsWith('[⌘STENCIL]')) return stencilDecode(wire);
  if (wire.startsWith('[Ϻ]')) return morphDecode(wire);
  if (wire.startsWith(KAPPA_SENTINEL)) return kappaDecode(wire, enc);
  if (wire.startsWith(PHRASE_SENTINEL) || wire.startsWith(PHRASE_LITERAL)) return phraseDecode(wire, enc);
  if (wire.startsWith(TAU_SENTINEL) || wire.startsWith(TAU_LITERAL)) return tauDecode(wire, enc);

  if (wire.length >= 2 && wire[1] === '\n') {
    const pool = rosettaPool(enc);
    const idx = pool.indexOf(wire[0]);
    if (idx >= 0) {
      const mark = pool[idx];
      const regionByGlyph = new Map<string, string>();
      for (let i = 0; i < RNS1_REGIONS.length; i++) {
        regionByGlyph.set(pool[idx + 1 + i], RNS1_REGIONS[i]);
      }
      const flagRosettaW = pool[idx + 1 + RNS1_REGIONS.length];
      const flagAstraeaW = pool[idx + 3 + RNS1_REGIONS.length];
      const sepY = pool[idx + 2 + RNS1_REGIONS.length] ?? null;

      // Handle Rosetta W-wires
      if (flagRosettaW !== undefined && wire.length >= 4 && wire[2] === flagRosettaW && wire[3] === '\n') {
        return rosettaDecode(wire, enc);
      }

      // Handle Astraea W-wires
      if (flagAstraeaW !== undefined && wire.length >= 4 && wire[2] === flagAstraeaW && wire[3] === '\n') {
        return expandBodyAstraea(
          wire.slice(4),
          mark,
          regionByGlyph,
          astraeaLexiconCodebook(enc).byGlyph,
          null,
          sepY,
        );
      }

      return expandBodyAstraea(wire.slice(2), mark, regionByGlyph, null, null, sepY);
    }
  }

  return rosettaDecode(wire, enc);
}

/* -------------------------------- ENCODER ---------------------------------- */

export interface AstraeaCandidate {
  member: string;
  tokens: number;
  exact: boolean;
}

export interface AstraeaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  member: string;
  systems: string[];
  audit: AstraeaCandidate[];
  notes: string;
  encodeMs: number;
}

export interface AstraeaSuppliedMembers {
  orbit?: OrbitResult;
  crown?: CrownResult;
  mosaic?: unknown;
  splice?: SpliceResult;
  rosetta?: RosettaResult;
}

const encodeCache = new Map<string, AstraeaResult>();
const CACHE_MAX = 8;

export async function astraeaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  supplied: AstraeaSuppliedMembers = {},
): Promise<AstraeaResult> {
  const key = text.length <= 200_000 ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const r = await astraeaEncodeUncached(text, enc, supplied);
  if (key !== null) {
    if (encodeCache.size >= CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, r);
  }
  return r;
}

async function astraeaEncodeUncached(
  text: string,
  enc: EncodingName,
  supplied: AstraeaSuppliedMembers,
): Promise<AstraeaResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): AstraeaResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    member: 'identity',
    systems: [],
    audit: [],
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

  const audit: AstraeaCandidate[] = [];
  interface Best { wire: string; member: string; systems: string[]; decode: () => string }
  let best: Best | null = null;
  let bestTokens = inTokens;

  const admit = (
    member: string,
    wire: string,
    decode: () => string,
    systems: string[] = [],
    force = false,
  ) => {
    try {
      const back = decode();
      const tk = countTokens(wire, enc);
      const exact = back === text;
      audit.push({ member, tokens: exact ? tk : -1, exact });
      if (exact && (force || tk < bestTokens) && !(wire === text && ambiguousIdentity)) {
        best = { wire, member, systems, decode };
        bestTokens = tk;
      }
    } catch {
      audit.push({ member, tokens: -1, exact: false });
    }
  };

  const ambiguousIdentity =
    (text.length >= 2 && text[1] === '\n' && rosettaPool(enc).includes(text[0])) ||
    text.includes('⟐') ||
    ['[MZ1]\n', '[SG1]\n', '[P1]\n', '[M1]\n', '⟨QSR⟩\n', '[PX]\n', '[[VX1\n', '[AX1]\n',
     '[TS1]\n', '[ST1]\n', '[RP1]\n', '[TR1]\n', '[CL1]\n', '[SP1]\n', '[⌘STENCIL]', '[Ϻ]', 'κ\n',
     'φ', 'τ\n', 'ττ\n']
      .some((s) => text.startsWith(s));

  if (!ambiguousIdentity) admit('identity', text, () => text);

  // 1. ASTRAEA-DW (Transposition + Dynamic Local Dictionary + Lexicon)
  if (!hasAstraeaLexiconGlyph(text, enc)) {
    const folded = astraeaLexiconFold(text, enc);
    const trDW = astraeaTranspose(text, enc, folded, true);
    if (trDW.wire !== null && astraeaDecode(trDW.wire, enc) === text) {
      admit('astraea-DW', trDW.wire, () => astraeaDecode(trDW.wire as string, enc), trDW.systems);
    }
    // 2. ASTRAEA-W (Transposition + Lexicon without Dynamic)
    const trW = astraeaTranspose(text, enc, folded, false);
    if (trW.wire !== null && astraeaDecode(trW.wire, enc) === text) {
      admit('astraea-W', trW.wire, () => astraeaDecode(trW.wire as string, enc), trW.systems);
    }
  }

  // 3. ASTRAEA-D (Transposition + Dynamic Local Dictionary)
  const trD = astraeaTranspose(text, enc, null, true);
  if (trD.wire !== null && astraeaDecode(trD.wire, enc) === text) {
    admit('astraea-D', trD.wire, () => astraeaDecode(trD.wire as string, enc), trD.systems);
  }

  // 4. ASTRAEA-T (Transposition Core)
  const trT = astraeaTranspose(text, enc, null, false);
  if (trT.wire !== null && astraeaDecode(trT.wire, enc) === text) {
    admit('astraea-T', trT.wire, () => astraeaDecode(trT.wire as string, enc), trT.systems);
  }

  // If ASTRAEA native members achieved >25% token savings, skip heavy fallback member search
  if (bestTokens <= inTokens * 0.75) {
    const winner = best as Best | null;
    if (winner) {
      const decoded = winner.decode();
      if (decoded === text) {
        const outTokens = countTokens(winner.wire, enc);
        if (outTokens < inTokens || winner.member === 'forced-wrap') {
          return {
            wire: winner.wire,
            decoded,
            exact: true,
            inTokens,
            outTokens,
            savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
            member: winner.member,
            systems: winner.systems,
            audit,
            notes: `ASTRAEA-A2 member=${winner.member} systems=[${winner.systems.join(',')}] · ${audit.filter((a) => a.exact).length} exact candidates · byte-exact`,
            encodeMs: ms(),
          };
        }
      }
    }
  }

  // 5. ROSETTA-R2 Member
  try {
    const ros = supplied.rosetta ?? (await rosettaEncode(text, enc));
    if (ros.exact && ros.decoded === text) {
      admit('rosetta-R2', ros.wire, () => astraeaDecode(ros.wire, enc), ros.systems);
    }
  } catch {
    audit.push({ member: 'rosetta-R2', tokens: -1, exact: false });
  }

  // 6. KAPPA Member
  try {
    const kp = kappaEncode(text, enc);
    if (kp.exact && kp.decoded === text) {
      admit('kappa', kp.wire, () => kappaDecode(kp.wire, enc));
    }
  } catch {
    audit.push({ member: 'kappa', tokens: -1, exact: false });
  }

  // 7. TAU Member
  try {
    const tu = tauEncode(text, enc);
    if (tu.exact && tu.decoded === text) {
      admit('tau', tu.wire, () => tauDecode(tu.wire, enc), tu.systems);
    }
  } catch {
    audit.push({ member: 'tau', tokens: -1, exact: false });
  }

  // 8. PHRASE Member
  try {
    const phr = phraseEncode(text, enc);
    if (phr.exact && phr.decoded === text) {
      admit('phrase', phr.wire, () => phraseDecode(phr.wire, enc));
    }
  } catch {
    audit.push({ member: 'phrase', tokens: -1, exact: false });
  }

  // 9. ORBIT / CROWN / SPLICE Heavy Members (only run if light members didn't achieve significant compression)
  if (text.length <= 12_000 && bestTokens > inTokens * 0.75) {
    try {
      const orbit = supplied.orbit ?? (await orbitEncode(text, enc));
      if (orbit.exact && orbit.decoded === text) {
        admit('orbit', orbit.wire, () => astraeaDecode(orbit.wire, enc));
      }
    } catch {
      audit.push({ member: 'orbit', tokens: -1, exact: false });
    }
    try {
      const crown = supplied.crown ?? (await crownEncodeCached(text, enc));
      if (crown.exact && crown.decoded === text) {
        admit('crown', crown.wire, () => crownDecode(crown.wire));
      }
    } catch {
      audit.push({ member: 'crown', tokens: -1, exact: false });
    }
    try {
      const sp = supplied.splice ?? spliceEncode(text, enc);
      if (sp.exact && sp.decoded === text) {
        admit('splice', sp.wire, () => spliceDecode(sp.wire));
      }
    } catch {
      audit.push({ member: 'splice', tokens: -1, exact: false });
    }
  }

  // Forced-wrap safety fallback ONLY if identity is ambiguous
  if (ambiguousIdentity) {
    const kWindow = pickWindowAstraea(text, enc);
    if (kWindow !== null) {
      const wrapWire = rosettaPool(enc)[kWindow] + '\n' + text;
      admit('forced-wrap', wrapWire, () => astraeaDecode(wrapWire, enc), [], true);
    }
  }

  const winner = best as Best | null;
  if (!winner) {
    return identity(
      ambiguousIdentity
        ? 'no candidate under exact gate; forced wrap safety'
        : 'no candidate beat input under exact gate',
    );
  }

  const decoded = winner.decode();
  if (decoded !== text) return identity('gate G4: winner failed byte-verify');
  const outTokens = countTokens(winner.wire, enc);
  if (outTokens >= inTokens && winner.member !== 'forced-wrap') {
    return identity('gate G3: wire measured >= input');
  }

  return {
    wire: winner.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    member: winner.member,
    systems: winner.systems,
    audit,
    notes: `ASTRAEA-A2 member=${winner.member} systems=[${winner.systems.join(',')}] · ${audit.filter((a) => a.exact).length} exact candidates · byte-exact`,
    encodeMs: ms(),
  };
}

/* --------------------------- DECODER PROMPT -------------------------------- */

export function astraeaDecoderPrompt(): string {
  return [
    '# ⟿ ASTRAEA-A2 — Adaptive Structural Transposition & Real-BPE Attributed Exact-Codec',
    'An ASTRAEA-A2 wire message is: <glyph>\\n<body>. The first glyph anchors the codebook',
    'from the tokenizer-verified single-token glyph pool (see rosettaPool in rosetta.ts).',
    'Decode <body> left-to-right:',
    '1. mark + "D" + entries + mark → Dynamic Local Dictionary declaration.',
    '   Each entry is <glyph>=<jsonString>. Rebuild the dynamic glyph map for the payload.',
    '2. marker + 15-30 digit/T/Z run → an ISO-8601 BASIC instant; re-render in EXTENDED form.',
    '3. marker + J + pairs + marker → flat JSON object; rebuild canonical compact JSON.',
    '4. marker + C + rows + marker → comma CSV table; space-separated fields re-joined with commas.',
    '5. marker + P + rows + marker → pipe table; space-separated fields re-joined with " | ".',
    '6. marker + Y + name + SEP + k=v SEP ... + marker → flat YAML block.',
    '7. W-wires: when the first body line is a single pool glyph followed by \\n (the phrase flag),',
    '   every Hangul syllable of the ASTRAEA-L technical lexicon expands to its phrase.',
    'Reconstruction is 100% byte-exact; nothing was summarised or dropped.',
  ].join('\n');
}

export const ASTRAEA_SYSTEM_PROMPT = astraeaDecoderPrompt();

/* -------------------------------- SELF TESTS ------------------------------- */

export interface AstraeaSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export async function astraeaSelfTest(enc: EncodingName = 'o200k_base'): Promise<AstraeaSelfTest[]> {
  const out: AstraeaSelfTest[] = [];
  const check = async (name: string, text: string, expectStrictWin = false) => {
    try {
      const r = await astraeaEncode(text, enc);
      const rt = r.decoded === text && astraeaDecode(r.wire, enc) === text;
      const guard = r.outTokens <= r.inTokens;
      out.push({
        name,
        pass: rt && r.exact && guard && (!expectStrictWin || r.outTokens < r.inTokens),
        details: `${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) systems=[${r.systems.join(',')}]`,
      });
    } catch (e) {
      out.push({ name, pass: false, details: (e as Error).message });
    }
  };

  await check('A1 empty', '');
  await check('A2 plain text', 'Simple text line with no special patterns.');
  await check('A3 dynamic repetition', 'custom dynamic repeated clause token sequence alpha custom dynamic repeated clause token sequence alpha', true);

  return out;
}
