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

/** Pure technical/philosophical natural prose fixture. */
export const NATURAL_PROSE =
  'The challenge of distributed consensus lies in reconciling independent node states under the threat of arbitrary network partitions and message delays. In classical state machine replication, each participating replica applies an ordered sequence of state transitions to maintain consistency with its peers. When network partitions isolate a minority partition, consensus algorithms such as Paxos and Raft guarantee safety by refusing to commit transactions without a quorum majority. However, this safety property inherently trades off availability during prolonged network degradation. Modern high-throughput storage engines leverage vector clocks and Directed Acyclic Graph (DAG) structures to establish causal relationships between concurrent writes, deferring conflict resolution to read-time or deterministic merge functions. Consequently, system architects must balance the trade-offs between linearizable consistency models and eventual consistency paradigms based on the specific latency tolerances and durability guarantees demanded by the application domain.';

/** Hybrid prose combining narrative, markdown syntax, equations, code, tables, and links. */
export const HYBRID_PROSE = [
  '### Distributed Indexing & Query Optimizations',
  '',
  'When evaluating query performance over high-cardinality partitions, the overall execution cost is bounded by $O(K \\log N)$ where $K$ represents the number of active shards and $N$ denotes the index depth. Refer to the formal spec at https://specs.internal/v2/indexing-guidelines.md for complete details.',
  '',
  '#### Key Architectural Invariants',
  '- **Write Amplification:** Bounded to $\\le 2.4\\times$ under burst workload scenarios.',
  '- **Read Latency:** p99 latency target remains $\\le 12\\text{ms}$ across all operational regions.',
  '- **Compaction Strategy:** Tiered LSM-tree merge with bloom filter evaluation.',
  '',
  '```ts',
  'function calculateShardingFactor(key: string, numShards: number): number {',
  '  const hash = fnv1a32(key);',
  '  return (hash >>> 0) % numShards;',
  '}',
  '```',
  '',
  '| Parameter | Baseline | Target | Status |',
  '| :--- | :--- | :--- | :--- |',
  '| Queue Depth | 142 items | < 50 items | Degrading |',
  '| Cache Hit Ratio | 88.4% | > 95.0% | On Track |',
  '| Lock Contention | 14.2ms | < 2.0ms | Action Required |',
  '',
  '> *Note:* Ensure all edge proxies enforce rate limits before propagating requests to downstream worker pools. Footnote [^1]: Verified during Q3 disaster recovery drill.',
].join('\n');

/** Real LLM interaction prompt log text with user input, system prompt, tool calls, and agent responses. */
export const OUTPUT_PROMPT_LOG = [
  '[SYSTEM PROMPT: AGENCY_ORCHESTRATOR_V4]',
  'You are an autonomous site reliability engineer tasked with diagnosing production incidents and producing byte-exact triage logs.',
  '',
  '[USER]',
  'Inspect the gateway latency spike in us-east-1 and propose corrective action.',
  '',
  '[ASSISTANT - THINKING]',
  'Analyzing metrics from us-east-1... Gateway p99 latency increased to 812ms. Retries are spiking on auth-service endpoints. Connection pool exhaustion detected in postgres-primary.',
  '',
  '[TOOL_CALL: execute_query]',
  '{"query":"SELECT count(*), state FROM pg_stat_activity GROUP BY state","db":"prod-iad-01"}',
  '',
  '[TOOL_RESPONSE]',
  '{"status":"success","data":[{"count":48,"state":"active"},{"count":2,"state":"idle"}]}',
  '',
  '[ASSISTANT]',
  '### Incident Summary & Triage Actions',
  '1. **Root Cause:** Postgres connection pool exhausted (48/50 active connections held in long-standing transactions).',
  '2. **Mitigation:** Executed connection drain on orphaned sessions and bumped pool limit from 50 to 100.',
  '3. **Verification:** Gateway p99 latency stabilized at 42ms; error rate returned to 0.00%.',
].join('\n');

/**
 * CHAOS_1500 — Exactly 1500 characters of heterogeneous chaotic benchmark data:
 * technical prose, incident report, markdown list, CSV data, JSON payloads, Python code,
 * Japanese incident notes, Chinese ops log, shell command, and summary.
 */
export const CHAOS_1500: string = [
  'System Architecture Review & Incident Triage Digest (2026-09-18T14:30:00Z)',
  'The distribution of memory allocations during peak request throughput exhibits non-linear tail latency spikes when garbage collection pauses coincide with cross-region database locks.',
  '- queue depth climbed from 12 to 840 items during the retry storm',
  '- cache invalidation sequence aborted due to TLS handshake timeout (max_retries=3)',
  '- replica lag on primary database node db-replica-02 exceeded SLA threshold (p99 > 1200ms)',
  'service,region,dc,instances,p99_ms,error_rate',
  'auth-gateway,us-east-1,iad-1,64,142,0.0001',
  'billing-service,eu-west-1,dub-3,32,812,0.0240',
  'search-index,ap-northeast-1,hnd-2,16,1950,0.0815',
  '{"event":"circuit_breaker_opened","service":"search-index","threshold":0.05,"ms":1950,"retries":3,"ok":false}',
  '{"event":"fallback_cache_hit","service":"billing-service","ttl_sec":300,"cached_keys":1420,"ok":true}',
  'def evaluate_cluster_health(nodes):',
  '    for node in nodes:',
  '        if node.latency > 1000 or node.errors > 0.05: yield ("degraded", node.id)',
  '    return ("nominal", None)',
  '障害報告: 深夜帯にデータベース接続プールが枯渇し、レプリカのフェイルオーバーが遅延しました。',
  '対処手順: 接続プール上限を50から120に拡大し、ヘルスチェック間隔を調整してアラートを解除。',
  '备注：网关和认证服务已恢复正常，搜索服务索引分片重建中，建议密切关注流量波动。',
  'kectl rollout status deploy/search-api -n prod --timeout=120s || kubectl get events --sort-by=.ts',
  'Summary: Ensure database connection pools match peak thread concurrency. Re-evaluate jitter parameters across upstream clients and verify circuit breakers trip before queue overflow occurs right now..',
].join('\n');
