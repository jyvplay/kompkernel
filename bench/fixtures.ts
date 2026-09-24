/** Shared fixtures for the bench scripts (no side effects on import). */
export const CHAOS_900 =
  'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.\n' +
  '- queue depth 14, p99 latency 812ms (spike)\n' +
  '- flaky test `test_retry_backoff` failed twice on shard 7\n' +
  '- cache warmup aborted: TLS handshake timeout\n' +
  'region,dc,hosts,errors\n' +
  'us-east-1,iad-3,42,0\n' +
  'eu-west-1,dub-1,17,2\n' +
  'ap-south-1,bom-2,9,1\n' +
  '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}\n' +
  'def run(ctx):\n' +
  '    for k, v in ctx.items():\n' +
  '        if v is None: raise ValueError(k)\n' +
  '    return sum(ctx.values())\n' +
  '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。\n' +
  '日志：2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s)\n' +
  'kectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts\n' +
  'Next steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.';

export function mosaicFixtures() {
  const jsonLog = Array.from(
    { length: 40 },
    (_, i) =>
      `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
  const csv =
    'id,name,score,region\n' +
    Array.from({ length: 60 }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`).join('\n');
  const chat = Array.from(
    { length: 24 },
    (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`,
  ).join('\n');
  const grid = Array.from({ length: 30 }, () => '|##..##|..##..|').join('\n');
  const rle = 'A'.repeat(800) + 'B'.repeat(600);
  const idrun = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(',');
  const prose =
    'The quick brown fox jumps over the lazy dog while the committee deliberates ' +
    'on whether a second breakfast constitutes an institutional precedent.';
  return { jsonLog, csv, chat, grid, rle, idrun, prose };
}

/** Interleaved near-duplicate records: deliberately outside the existing contiguous families. */
export const BANYAN_INTERLEAVED = Array.from({ length: 96 }, (_, i) => {
  const id = String((i * 7919 + 104729) % 1000000000000).padStart(12, '0');
  const body = `request-${id}-payload-${id}-${id}`;
  const tail = ' accepted after bounded retry; preserve all metadata exactly; retain provenance and audit details without normalization '.repeat(3);
  return `component-${i}-audit record ${body}${tail}`;
}).join('\n');

export const MOSAIC_HANDTRACE_300 =
  'Ship it: retry 3x, never log secrets.\n' +
  '{"id":7,"ok":true}\n{"id":8,"ok":true}\n' +
  'id,ms\na,12\nb,12\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.';

/** A realistic LLM agent final report (900 chars exactly): prose, checklist,
 *  CSV, JSON, code, Chinese — the "prompt output" chaos shape. */
export const CHAOS_F_LLM_REPORT = [
  'Final report: migration finished for 3 services. I verified each step twice; no issues found in the first two, the third needs retries.',
  '- gateway: 14 routes checked, no issues found',
  '- auth: token rotation verified, no issues found',
  '- search: index rebuilt, 2 shards pending, retry scheduled',
  'svc,region,status,notes',
  'gateway,us-east-1,ok,no issues found',
  'auth,eu-west-1,ok,rotated',
  'search,ap-south-1,degraded,2 shards pending',
  '{"svc":"gateway","status":"ok","checks":14,"ms":812}',
  '{"svc":"auth","status":"ok","checks":9,"ms":301}',
  '{"svc":"search","status":"warn","checks":7,"ms":640}',
  'def check(svc):',
  '    if svc.status == "ok": return "no issues found"',
  '    return "retry scheduled"',
  'for r in rows: log(check(r)); log(check(r))',
  '备注：网关和认证迁移已完成，搜索服务还有两个分片待处理，建议明天重试后再确认。',
  'Summary: 2 of 3 migrations verified with no issues found; retry the search shards, then re-run the checks and confirm the counts all match now.',
].join('\n');

/**
 * CHAOS_G — CJK-heavy chaotic heterogeneous fixture (exactly 900 chars, like
 * CHAOS_900): Japanese incident report + Chinese ops notes + CSV + JSON +
 * Python + shell + English follow-up. The lane where the PHRASEBOOK-φ1
 * codebook (standard JP katakana IT loanwords + CN technical terms) has the
 * most headroom — Japanese carries the worst o200k token tax of any major
 * language (1.33–2.17× English, masonailab measurements).
 */
export const CHAOS_G_CJK: string = [
  '報告: 深夜帯にモニタリングがアラートを発報しました。',
  '- 影響範囲: 決済APIのレスポンス遅延 (p99 2.1秒)',
  '- 原因: データベース接続がタイムアウト、レプリカのフェイルオーバーに失敗',
  'service,region,status,p99_ms',
  'payment,ap-northeast-1,degraded,2100',
  'auth,ap-northeast-1,ok,120',
  'cart,ap-southeast-1,ok,95',
  '{"alert":"payment-p99","severity":"P1","ok":false,"pages":["slack"],"ms":2100}',
  'def check(pool):',
  '    if pool.exhausted: raise Alert("db timeout")',
  '    return pool.status',
  '备注：数据库连接池配置偏低，负载均衡未生效，请检查健康检查参数，必要时重启实例。',
  '记录：2026-09-15T14:22:08Z 警告 连接池耗尽 (max=50, wait=3s)',
  '対処: 接続プールの上限を引き上げ、ネットワーク設定を見直します。',
  '状態: 復旧作業は完了、スループットは通常レベルに戻りました。',
  '补充：监控显示错误率已回落，健康检查恢复正常，请确认后关闭告警。',
  'kectl get pods -n payments --watch || aws ec2 describe-instances --region ap-northeast-1',
  'Next: bump the pool limit, verify the health check, then confirm the alert clears. The morning review will cover pool sizing, alert thresholds, replica failover and the retry budget. (deploy 0123456789abcdef0123456789abcdef01234567).',
].join('\n');

/** Pure formal natural prose (exactly 1000 chars). */
export const NATURAL_PROSE_1000: string = [
  'The fundamental challenge of context-window optimization in large language models lies in reconciling token-budget constraints with strict information preservation. As sequence lengths expand, the attention mechanism exhibits quadratic time and memory complexity relative to the prompt dimension, necessitating contractive representations that preserve semantic fidelity without sacrificing deterministic decodability.',
  'Structural redundancy within natural prose operates across multiple syntactic strata: lexical collocations, discourse markers, and recurring sub-grammatical patterns. By mapping high-frequency phrasal motifs into succinct codebook entry identifiers, an entropy-optimal compressor can achieve significant context reduction prior to tokenization.',
  'Furthermore, subword boundary realignment guarantees exact lossless reconstruction while maximizing overall compression throughput across diverse natural language paradigms and highly demanding, advanced technical application domains.'
].join('\n\n');

/** Technical hybrid prose (exactly 1200 chars): narrative, inline table, LaTeX/math, python snippet. */
export const HYBRID_PROSE_1200: string = [
  'Technical Report: Hybrid Grammar & Tensor Factorization in BPE Realignment.',
  'We evaluate structural contractive mappings over heterogeneous token streams, bridging formal prose, mathematical specifications, and executable code modules.',
  '| Module | Compression | Latency | Exact | Status |',
  '| :--- | :---: | :---: | :---: | :---: |',
  '| ROSETTA-R5.6 | 91.2% | 0.8ms | YES | VERIFIED |',
  '| MOSAIC-M1 | 88.4% | 1.1ms | YES | VERIFIED |',
  '| KAPPA-κ1 | 74.5% | 0.4ms | YES | VERIFIED |',
  'Mathematical Formulation: Let $S \\in \\Sigma^*$ be an admissible sequence with empirical entropy $H(S) = -\\sum p_i \\log_2 p_i$. The optimal code length satisfies $|T_{\\text{BPE}}(E(S))| \\le K(S) + O(1)$, where $K(S)$ denotes the Kolmogorov complexity under universal grammar induction. For any partitioned sub-span $A \\subseteq S$, the canonical fiber bundle transform yields \\Phi(A) \\cong \\bigoplus_{k=1}^m \\mathcal{V}_k.',
  '```python',
  'def factorize(span: str) -> dict:',
  '    tokens = encode_bpe(span)',
  '    return {"wire_tokens": len(tokens), "exact": True}',
  '```',
  'Summary: The hybrid architecture achieves strictly superior token density while guaranteeing byte-exact round-trip fidelity across evaluated target benchmark test suites now.'
].join('\n');

/** Output prompt log text (exactly 2000 chars): system prompt, reasoning trace <thought>, tool calls, JSON, code, tables. */
export const OUTPUT_PROMPT_LOG_2000: string = [
  'SYSTEM_PROMPT: You are a high-performance compression research agent. Verify all structural transforms and output exact JSON payloads.',
  '<thought>',
  'The user requested an evaluation of the Pareto frontier across heterogeneous prompt log traces.',
  'I will first inspect the execution graph, identify repeating grammar fragments, and run the benchmark suite.',
  'Step 1: Parse input tokens and verify BPE subword boundaries across o200k_base and cl100k_base vocabularies.',
  'Step 2: Construct directed hypergraph quotient for non-contiguous collocations and token quorums.',
  'Step 3: Execute tournament dispatch across active candidate codecs in the ensemble matrix.',
  'Step 4: Audit deterministic round-trip fidelity, verifying zero bytes dropped.',
  'All safety constraints and runtime invariants satisfied. Proceeding to invoke tool call.',
  '</thought>',
  'call:default_api:run_benchmark{"suite":"full_pareto","encoding":"o200k_base","strict_lossless":true}',
  'RESPONSE: {"status":"success","evaluated_codecs":72,"pareto_leaders":["ROSETTA-R5.6","HARMONIA-H1","AETHER-A1"],"metrics":{"in_tokens":1852,"out_tokens":154,"compression_ratio":12.02,"exact_lossless":true}}',
  '```typescript',
  'export async function verifyLogTrace(wire: string, enc: EncodingName): Promise<boolean> {',
  '  const decoded = rosettaDecode(wire, enc);',
  '  return decoded === getOriginalFixture(wire);',
  '}',
  '```',
  '| Log ID | Service | Level | Latency (ms) | Compression | Status | Notes |',
  '| :--- | :--- | :--- | :---: | :---: | :---: | :--- |',
  '| LOG-101 | gateway | INFO | 14.2 | 91.8% | PASSED | nominal execution path |',
  '| LOG-102 | auth-svc | WARN | 32.1 | 88.4% | PASSED | token cache refreshed |',
  '| LOG-103 | db-proxy | ERROR | 112.5 | 85.2% | RETRIED | connection pool drained |',
  'Final Assessment: The output prompt log trace demonstrates high structural repetition across system prompt headers, inner reasoning blocks, and tool invocation payloads. Context compression reduces prompt cost by 91.8% while preserving 100% byte-perfect exactness across all benchmark suite runs.'
].join('\n');

/** Heterogeneous chaotic payload (exactly 1500 chars): prose, checklist, CSV, JSON, Python, CJK notes, stacktrace, shell, grid. */
export const CHAOS_1500: string = [
  'Status: multi-region cluster migration completed, 3 microservices reported warnings during the canary window; on-call paged twice.',
  '- service gateway: 24 instances online, error_rate=0.01% (nominal baseline)',
  '- service auth: secret key rotation verified on all 12 edge nodes without downtime',
  '- service telemetry: buffer overflow on shard-9, retry storm active under load',
  'service,region,dc,instances,p99_latency_ms,status',
  'gateway,us-east-1,iad-3,24,18.4,HEALTHY',
  'auth-api,eu-west-1,dub-1,12,24.1,HEALTHY',
  'telemetry,ap-south-1,bom-2,8,342.0,DEGRADED',
  '{"job":"flush_buffer","shard":9,"retries":5,"ok":false,"errors":["timeout","connection_reset"],"ms":342}',
  '{"job":"audit_log","shard":12,"retries":0,"ok":true,"errors":[],"ms":14}',
  'def reconcile_nodes(cluster, dry_run=False):',
  '    for node in cluster.active_nodes():',
  '        if not node.is_healthy():',
  '            logger.warning(f"Draining node {node.id}")',
  '            if not dry_run: node.drain()',
  '報告: アラートが発生しました。データベースの接続プールが枯渇し、応答遅延が上昇しています。',
  '备注：网关和认证服务迁移正常，日志缓冲区碎片过多，请检查内存配额并安排重试。',
  '记录：2026-09-15T18:42:01Z 警告 内存耗尽 (max=64GB, wait=5s)',
  'ERROR 2026-09-15T18:42:01Z [pool-worker-7] ConnectionPoolTimeoutException: Timeout waiting for idle connection (wait=5000ms)',
  'kubectl rollout status deployment/telemetry-processor --timeout=120s -n production || kubectl get pods -l app=telemetry',
  '|##..##|..##..|##..##|',
  '|..##..|##..##|..##..|',
  'Summary: 2 of 3 regions healthy; telemetry shard-9 requires memory limit escalation. Monitor queue depth and retry budget closely now.'
].join('\n');
