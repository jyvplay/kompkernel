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

/**
 * CHAOS_1500 — 1500-character heterogeneous chaotic fixture:
 * Combines incident executive summary, markdown checklist, CSV, JSON, code,
 * CJK notes (Japanese + Chinese), stack traces, and CLI commands.
 */
export const CHAOS_1500 = [
  'Incident Brief: P0 database connection pool degradation impacted payment gateway during flash traffic peak.',
  'Root cause analysis indicated thread starvation on worker pool iad-42, triggering retry cascade across regional endpoints.',
  '- queue depth peak: 4,210 messages (threshold 500)',
  '- p99 latency spike: 2,840ms on /v2/checkout/charge',
  '- circuit breaker state: OPEN for 142s on us-east-1',
  'region,dc,total_pods,healthy,error_rate,p99_ms',
  'us-east-1,iad-3,64,48,0.142,2840',
  'eu-west-1,dub-1,32,32,0.001,118',
  'ap-northeast-1,nrt-2,24,20,0.038,640',
  '{"event":"pool_exhausted","svc":"checkout","max_conn":100,"active":100,"wait_ms":5000,"ts":"2026-09-15T14:30:00Z"}',
  '{"event":"circuit_open","svc":"payment","threshold":0.05,"measured":0.142,"ts":"2026-09-15T14:30:12Z"}',
  'def handle_failover(ctx, max_retries=3):',
  '    for attempt in range(max_retries):',
  '        try: return ctx.execute_transaction(timeout=2.5)',
  '        except PoolExhaustedError as err:',
  '            log.warning("retry attempt %d failed: %s", attempt, err)',
  '            time.sleep(2 ** attempt)',
  '    raise EscalationRequired("all retries exhausted")',
  '障害報告: データベースの接続プール上限到達に伴い、決済APIでレスポンス遅延およびエラーが発生しました。',
  '备注：已临时将连接池上限由100提升至250，负载均衡与健康检查恢复正常，待明天晨会评估长远扩容方案。',
  'kubectl logs -n prod deploy/payment-gateway --tail=100 | grep -E "ERROR|WARN|PoolExhausted"',
  'Action required: Verify retry budget allocation, drain degraded pods in iad-3, then confirm alert auto-resolution before sign-off.',
].join('\n');

/** Natural prose benchmarks across literary, technical, and analytical essay domains. */
export const NATURAL_PROSE_SUITE = {
  literary: [
    'The evening sun cast long, amber shadows across the cobblestone courtyard as quiet whispers of autumn air rustled through the canopy of ancient oaks.',
    'For decades, the solitary library on the hill had preserved manuscripts whose parchment smelled faintly of cedar and dry tea leaves.',
    'Scholars travelled from distant valleys not merely to consult the ancient maps, but to experience the profound stillness that inhabited every corridor.',
    'Here, time seemed to slow down, measured not by the ticking of pendulum clocks, but by the gradual shifting of sunlight across worn wooden oak tables.',
  ].join(' '),

  technical: [
    'The consensus engine implements a multi-version concurrency control mechanism to ensure strict serializability across distributed state machines.',
    'When a leader replica receives a write proposal, it appends the transaction record to its local write-ahead log before broadcasting append entries to quorum peers.',
    'Each peer validates the term index and commit sequence prior to issuing an acknowledgment message over the secure TLS socket layer.',
    'Once a majority quorum confirms persistence, the state machine applies the log entry deterministically and returns the executed result to the client.',
  ].join(' '),

  essay: [
    'Information density in natural language compression depends fundamentally upon the structural invariants embedded within BPE vocabulary spaces.',
    'Standard byte-pair encoding schemes assign short integer tokens to high-frequency character substrings, thereby creating localized non-uniformity in token entropy.',
    'By exploiting higher-order syntactic patterns and context-free grammar factorizations, specialized neuralese codecs achieve compression ratios far surpassing raw string representations.',
    'This dual perspective bridges discrete algorithmic formalisms with empirical statistical language modeling.',
  ].join(' '),
};

/** Hybrid prose benchmarks interleaving natural language prose with code, tables, and structured data. */
export const HYBRID_PROSE_SUITE = {
  markdownDoc: [
    '# Architecture Specification: Distributed Event Router',
    'The distributed event router manages high-throughput asynchronous message delivery with bounded memory overhead.',
    '## System Metrics',
    '| Component | Throughput (msg/s) | p99 Latency (ms) | Target Availability |',
    '| Ingress Gateway | 125,000 | 4.2 | 99.99% |',
    '| Stream Parser | 98,000 | 1.8 | 99.95% |',
    '| Persistence Store | 45,000 | 12.5 | 99.99% |',
    '## Configuration Example',
    '```json',
    '{"router_id":"r-7814","max_buffer_mb":512,"flush_interval_ms":50,"enable_metrics":true}',
    '```',
    'Ensure that the `max_buffer_mb` setting does not exceed 75% of available container cgroup RAM limits.',
  ].join('\n'),

  apiSpec: [
    'API Specification for `/v1/telemetry/ingest` Endpoint.',
    'Accepts batch telemetry events submitted via HTTPS POST using application/json payload encoding.',
    'Request Payload:',
    '```ts',
    'interface TelemetryPayload {',
    '  tenant_id: string;',
    '  batch_size: number;',
    '  events: Array<{ id: string; timestamp: string; level: "INFO" | "WARN" | "ERROR"; msg: string }>;',
    '}',
    '```',
    'Example Curl Request:',
    'curl -X POST https://api.internal/v1/telemetry/ingest -H "Content-Type: application/json" -d \'{"tenant_id":"t-42","batch_size":1,"events":[{"id":"e-1","timestamp":"2026-09-15T12:00:00Z","level":"INFO","msg":"heartbeat ok"}]}\'',
    'Response Status Codes:',
    '200 OK: Batch accepted and queued for asynchronous ingestion.',
    '429 Too Many Requests: Rate limit exceeded; apply exponential backoff before retrying.',
  ].join('\n'),
};

/** Output prompt log text benchmarks representing real LLM trajectories and reasoning traces. */
export const PROMPT_LOG_OUTPUT_SUITE = {
  agentTrajectory: [
    'Thought: The user requested a database connection pool audit and error analysis for service checkout-api.',
    'Action: execute_shell',
    'Action Input: kubectl logs -n prod deploy/checkout-api --tail=50 --selector=app=checkout',
    'Observation:',
    '2026-09-15T14:22:01Z ERROR [pool] timeout waiting for connection from pool (max=50, active=50, waiting=12)',
    '2026-09-15T14:22:05Z WARN [http] POST /v2/charge status=504 latency=5002ms client_ip=10.240.12.8',
    'Thought: The logs confirm connection pool exhaustion causing downstream HTTP 504 gateway timeouts.',
    'Action: update_config',
    'Action Input: {"service":"checkout-api","config":{"max_connections":100,"idle_timeout_s":30}}',
    'Observation: Config updated successfully. Rollout restart triggered for deploy/checkout-api.',
    'Final Answer: Connection pool limit increased from 50 to 100. All 4 pods completed rolling update and health checks passed.',
  ].join('\n'),

  reasoningTrace: [
    'Reasoning Step 1: Evaluating memory footprint and BPE token bounds for payload size = 12,480 bytes.',
    'Step 2: Checking candidate grammar induction rules using straight-line grammar factorization.',
    'Step 3: Found 14 repeated structural patterns across JSON log records.',
    'Code execution trace:',
    '```py',
    'def evaluate_gain(raw_tokens, compressed_tokens):',
    '    savings = (raw_tokens - compressed_tokens) / raw_tokens',
    '    return {"savings_pct": savings * 100, "optimal": savings >= 0.85}',
    '```',
    'Execution Result: {"savings_pct": 88.4, "optimal": true}',
    'Conclusion: BPE boundary realignment achieved 88.4% token compression while maintaining 100% losslessness.',
  ].join('\n'),
};
