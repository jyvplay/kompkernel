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
