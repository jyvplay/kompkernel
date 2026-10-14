// bench/fixtures.ts
var CHAOS_900 = 'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.\n- queue depth 14, p99 latency 812ms (spike)\n- flaky test `test_retry_backoff` failed twice on shard 7\n- cache warmup aborted: TLS handshake timeout\nregion,dc,hosts,errors\nus-east-1,iad-3,42,0\neu-west-1,dub-1,17,2\nap-south-1,bom-2,9,1\n{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}\ndef run(ctx):\n    for k, v in ctx.items():\n        if v is None: raise ValueError(k)\n    return sum(ctx.values())\n\u5907\u6CE8\uFF1A\u6570\u636E\u5E93\u8FC1\u79FB\u5DF2\u5B8C\u6210\uFF0C\u4F46\u7F13\u5B58\u9884\u70ED\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u6C60\u914D\u7F6E\u548C\u8D85\u65F6\u53C2\u6570\uFF0C\u5FC5\u8981\u65F6\u91CD\u542F\u5B9E\u4F8B\u540E\u518D\u89C2\u5BDF\u3002\n\u65E5\u5FD7\uFF1A2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s)\nkectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts\nNext steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.';
function mosaicFixtures() {
  const jsonLog = Array.from(
    { length: 40 },
    (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`
  ).join("\n");
  const csv = "id,name,score,region\n" + Array.from({ length: 60 }, (_, i) => `${i},user_${i % 7},${i * 3 % 100},us-east-1`).join("\n");
  const chat = Array.from(
    { length: 24 },
    (_, i) => `user: run step ${i}
assistant: step ${i} completed with status ok and no warnings.`
  ).join("\n");
  const grid = Array.from({ length: 30 }, () => "|##..##|..##..|").join("\n");
  const rle = "A".repeat(800) + "B".repeat(600);
  const idrun = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(",");
  const prose = "The quick brown fox jumps over the lazy dog while the committee deliberates on whether a second breakfast constitutes an institutional precedent.";
  return { jsonLog, csv, chat, grid, rle, idrun, prose };
}
var BANYAN_INTERLEAVED = Array.from({ length: 96 }, (_, i) => {
  const id = String((i * 7919 + 104729) % 1e12).padStart(12, "0");
  const body = `request-${id}-payload-${id}-${id}`;
  const tail = " accepted after bounded retry; preserve all metadata exactly; retain provenance and audit details without normalization ".repeat(3);
  return `component-${i}-audit record ${body}${tail}`;
}).join("\n");
var MOSAIC_HANDTRACE_300 = 'Ship it: retry 3x, never log secrets.\n{"id":7,"ok":true}\n{"id":8,"ok":true}\nid,ms\na,12\nb,12\n##..##\n##..##\nfor(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}\nuser: fix the flaky test\nassistant: I will inspect the suite and patch the race.\nuser: fix the flaky test\nassistant: I will inspect the suite and patch the race.';
var CHAOS_F_LLM_REPORT = [
  "Final report: migration finished for 3 services. I verified each step twice; no issues found in the first two, the third needs retries.",
  "- gateway: 14 routes checked, no issues found",
  "- auth: token rotation verified, no issues found",
  "- search: index rebuilt, 2 shards pending, retry scheduled",
  "svc,region,status,notes",
  "gateway,us-east-1,ok,no issues found",
  "auth,eu-west-1,ok,rotated",
  "search,ap-south-1,degraded,2 shards pending",
  '{"svc":"gateway","status":"ok","checks":14,"ms":812}',
  '{"svc":"auth","status":"ok","checks":9,"ms":301}',
  '{"svc":"search","status":"warn","checks":7,"ms":640}',
  "def check(svc):",
  '    if svc.status == "ok": return "no issues found"',
  '    return "retry scheduled"',
  "for r in rows: log(check(r)); log(check(r))",
  "\u5907\u6CE8\uFF1A\u7F51\u5173\u548C\u8BA4\u8BC1\u8FC1\u79FB\u5DF2\u5B8C\u6210\uFF0C\u641C\u7D22\u670D\u52A1\u8FD8\u6709\u4E24\u4E2A\u5206\u7247\u5F85\u5904\u7406\uFF0C\u5EFA\u8BAE\u660E\u5929\u91CD\u8BD5\u540E\u518D\u786E\u8BA4\u3002",
  "Summary: 2 of 3 migrations verified with no issues found; retry the search shards, then re-run the checks and confirm the counts all match now."
].join("\n");
var CHAOS_G_CJK = [
  "\u5831\u544A: \u6DF1\u591C\u5E2F\u306B\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0\u304C\u30A2\u30E9\u30FC\u30C8\u3092\u767A\u5831\u3057\u307E\u3057\u305F\u3002",
  "- \u5F71\u97FF\u7BC4\u56F2: \u6C7A\u6E08API\u306E\u30EC\u30B9\u30DD\u30F3\u30B9\u9045\u5EF6 (p99 2.1\u79D2)",
  "- \u539F\u56E0: \u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3001\u30EC\u30D7\u30EA\u30AB\u306E\u30D5\u30A7\u30A4\u30EB\u30AA\u30FC\u30D0\u30FC\u306B\u5931\u6557",
  "service,region,status,p99_ms",
  "payment,ap-northeast-1,degraded,2100",
  "auth,ap-northeast-1,ok,120",
  "cart,ap-southeast-1,ok,95",
  '{"alert":"payment-p99","severity":"P1","ok":false,"pages":["slack"],"ms":2100}',
  "def check(pool):",
  '    if pool.exhausted: raise Alert("db timeout")',
  "    return pool.status",
  "\u5907\u6CE8\uFF1A\u6570\u636E\u5E93\u8FDE\u63A5\u6C60\u914D\u7F6E\u504F\u4F4E\uFF0C\u8D1F\u8F7D\u5747\u8861\u672A\u751F\u6548\uFF0C\u8BF7\u68C0\u67E5\u5065\u5EB7\u68C0\u67E5\u53C2\u6570\uFF0C\u5FC5\u8981\u65F6\u91CD\u542F\u5B9E\u4F8B\u3002",
  "\u8BB0\u5F55\uFF1A2026-09-15T14:22:08Z \u8B66\u544A \u8FDE\u63A5\u6C60\u8017\u5C3D (max=50, wait=3s)",
  "\u5BFE\u51E6: \u63A5\u7D9A\u30D7\u30FC\u30EB\u306E\u4E0A\u9650\u3092\u5F15\u304D\u4E0A\u3052\u3001\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u8A2D\u5B9A\u3092\u898B\u76F4\u3057\u307E\u3059\u3002",
  "\u72B6\u614B: \u5FA9\u65E7\u4F5C\u696D\u306F\u5B8C\u4E86\u3001\u30B9\u30EB\u30FC\u30D7\u30C3\u30C8\u306F\u901A\u5E38\u30EC\u30D9\u30EB\u306B\u623B\u308A\u307E\u3057\u305F\u3002",
  "\u8865\u5145\uFF1A\u76D1\u63A7\u663E\u793A\u9519\u8BEF\u7387\u5DF2\u56DE\u843D\uFF0C\u5065\u5EB7\u68C0\u67E5\u6062\u590D\u6B63\u5E38\uFF0C\u8BF7\u786E\u8BA4\u540E\u5173\u95ED\u544A\u8B66\u3002",
  "kectl get pods -n payments --watch || aws ec2 describe-instances --region ap-northeast-1",
  "Next: bump the pool limit, verify the health check, then confirm the alert clears. The morning review will cover pool sizing, alert thresholds, replica failover and the retry budget. (deploy 0123456789abcdef0123456789abcdef01234567)."
].join("\n");
var NATURAL_PROSE = "The challenge of distributed consensus lies in reconciling independent node states under the threat of arbitrary network partitions and message delays. In classical state machine replication, each participating replica applies an ordered sequence of state transitions to maintain consistency with its peers. When network partitions isolate a minority partition, consensus algorithms such as Paxos and Raft guarantee safety by refusing to commit transactions without a quorum majority. However, this safety property inherently trades off availability during prolonged network degradation. Modern high-throughput storage engines leverage vector clocks and Directed Acyclic Graph (DAG) structures to establish causal relationships between concurrent writes, deferring conflict resolution to read-time or deterministic merge functions. Consequently, system architects must balance the trade-offs between linearizable consistency models and eventual consistency paradigms based on the specific latency tolerances and durability guarantees demanded by the application domain.";
var HYBRID_PROSE = [
  "### Distributed Indexing & Query Optimizations",
  "",
  "When evaluating query performance over high-cardinality partitions, the overall execution cost is bounded by $O(K \\log N)$ where $K$ represents the number of active shards and $N$ denotes the index depth. Refer to the formal spec at https://specs.internal/v2/indexing-guidelines.md for complete details.",
  "",
  "#### Key Architectural Invariants",
  "- **Write Amplification:** Bounded to $\\le 2.4\\times$ under burst workload scenarios.",
  "- **Read Latency:** p99 latency target remains $\\le 12\\text{ms}$ across all operational regions.",
  "- **Compaction Strategy:** Tiered LSM-tree merge with bloom filter evaluation.",
  "",
  "```ts",
  "function calculateShardingFactor(key: string, numShards: number): number {",
  "  const hash = fnv1a32(key);",
  "  return (hash >>> 0) % numShards;",
  "}",
  "```",
  "",
  "| Parameter | Baseline | Target | Status |",
  "| :--- | :--- | :--- | :--- |",
  "| Queue Depth | 142 items | < 50 items | Degrading |",
  "| Cache Hit Ratio | 88.4% | > 95.0% | On Track |",
  "| Lock Contention | 14.2ms | < 2.0ms | Action Required |",
  "",
  "> *Note:* Ensure all edge proxies enforce rate limits before propagating requests to downstream worker pools. Footnote [^1]: Verified during Q3 disaster recovery drill."
].join("\n");
var OUTPUT_PROMPT_LOG = [
  "[SYSTEM PROMPT: AGENCY_ORCHESTRATOR_V4]",
  "You are an autonomous site reliability engineer tasked with diagnosing production incidents and producing byte-exact triage logs.",
  "",
  "[USER]",
  "Inspect the gateway latency spike in us-east-1 and propose corrective action.",
  "",
  "[ASSISTANT - THINKING]",
  "Analyzing metrics from us-east-1... Gateway p99 latency increased to 812ms. Retries are spiking on auth-service endpoints. Connection pool exhaustion detected in postgres-primary.",
  "",
  "[TOOL_CALL: execute_query]",
  '{"query":"SELECT count(*), state FROM pg_stat_activity GROUP BY state","db":"prod-iad-01"}',
  "",
  "[TOOL_RESPONSE]",
  '{"status":"success","data":[{"count":48,"state":"active"},{"count":2,"state":"idle"}]}',
  "",
  "[ASSISTANT]",
  "### Incident Summary & Triage Actions",
  "1. **Root Cause:** Postgres connection pool exhausted (48/50 active connections held in long-standing transactions).",
  "2. **Mitigation:** Executed connection drain on orphaned sessions and bumped pool limit from 50 to 100.",
  "3. **Verification:** Gateway p99 latency stabilized at 42ms; error rate returned to 0.00%."
].join("\n");
var CHAOS_1500 = [
  "System Architecture Review & Incident Triage Digest (2026-09-18T14:30:00Z)",
  "The distribution of memory allocations during peak request throughput exhibits non-linear tail latency spikes when garbage collection pauses coincide with cross-region database locks.",
  "- queue depth climbed from 12 to 840 items during the retry storm",
  "- cache invalidation sequence aborted due to TLS handshake timeout (max_retries=3)",
  "- replica lag on primary database node db-replica-02 exceeded SLA threshold (p99 > 1200ms)",
  "service,region,dc,instances,p99_ms,error_rate",
  "auth-gateway,us-east-1,iad-1,64,142,0.0001",
  "billing-service,eu-west-1,dub-3,32,812,0.0240",
  "search-index,ap-northeast-1,hnd-2,16,1950,0.0815",
  '{"event":"circuit_breaker_opened","service":"search-index","threshold":0.05,"ms":1950,"retries":3,"ok":false}',
  '{"event":"fallback_cache_hit","service":"billing-service","ttl_sec":300,"cached_keys":1420,"ok":true}',
  "def evaluate_cluster_health(nodes):",
  "    for node in nodes:",
  '        if node.latency > 1000 or node.errors > 0.05: yield ("degraded", node.id)',
  '    return ("nominal", None)',
  "\u969C\u5BB3\u5831\u544A: \u6DF1\u591C\u5E2F\u306B\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u30D7\u30FC\u30EB\u304C\u67AF\u6E07\u3057\u3001\u30EC\u30D7\u30EA\u30AB\u306E\u30D5\u30A7\u30A4\u30EB\u30AA\u30FC\u30D0\u30FC\u304C\u9045\u5EF6\u3057\u307E\u3057\u305F\u3002",
  "\u5BFE\u51E6\u624B\u9806: \u63A5\u7D9A\u30D7\u30FC\u30EB\u4E0A\u9650\u309250\u304B\u3089120\u306B\u62E1\u5927\u3057\u3001\u30D8\u30EB\u30B9\u30C1\u30A7\u30C3\u30AF\u9593\u9694\u3092\u8ABF\u6574\u3057\u3066\u30A2\u30E9\u30FC\u30C8\u3092\u89E3\u9664\u3002",
  "\u5907\u6CE8\uFF1A\u7F51\u5173\u548C\u8BA4\u8BC1\u670D\u52A1\u5DF2\u6062\u590D\u6B63\u5E38\uFF0C\u641C\u7D22\u670D\u52A1\u7D22\u5F15\u5206\u7247\u91CD\u5EFA\u4E2D\uFF0C\u5EFA\u8BAE\u5BC6\u5207\u5173\u6CE8\u6D41\u91CF\u6CE2\u52A8\u3002",
  "kectl rollout status deploy/search-api -n prod --timeout=120s || kubectl get events --sort-by=.ts",
  "Summary: Ensure database connection pools match peak thread concurrency. Re-evaluate jitter parameters across upstream clients and verify circuit breakers trip before queue overflow occurs right now.."
].join("\n");
export {
  BANYAN_INTERLEAVED,
  CHAOS_1500,
  CHAOS_900,
  CHAOS_F_LLM_REPORT,
  CHAOS_G_CJK,
  HYBRID_PROSE,
  MOSAIC_HANDTRACE_300,
  NATURAL_PROSE,
  OUTPUT_PROMPT_LOG,
  mosaicFixtures
};
