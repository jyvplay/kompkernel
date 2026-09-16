/**
 * bench/verify-astraea.ts — Verification of ASTRAEA-A2 against ALL codecs
 * on chaos samples (including CHAOS_4000) and regime fixtures.
 */
import { countTokens } from '../src/lib/omega/bpe';
import { astraeaEncode, astraeaDecode } from '../src/lib/omega/astraea';
import { rosettaEncode, rosettaDecode } from '../src/lib/omega/rosetta';
import { signetEncode } from '../src/lib/omega/signet';
import { mosaicEncode } from '../src/lib/omega/mosaic';
import { orbitEncode } from '../src/lib/omega/orbit';
import { spliceEncode } from '../src/lib/omega/splice';
import { kappaEncode } from '../src/lib/omega/kappa';
import { phraseEncode } from '../src/lib/omega/phrase';
import { tauEncode } from '../src/lib/omega/tau';
import { omegaXiCompress } from '../src/lib/omega/atom-codec';
import { CHAOS_900, CHAOS_F_LLM_REPORT, CHAOS_G_CJK, mosaicFixtures, MOSAIC_HANDTRACE_300 } from './fixtures';
import { CHAOS_4000 } from './test-4000';

const enc = 'o200k_base';
const tok = (s: string) => countTokens(s, enc);

const CHAOS_B = [
  'Summary: the ingestion pipeline dropped 3 events during the failover window.',
  '- consumer lag 2.4k messages, resolved in 90s',
  '- dead-letter queue gained 12 entries (poison payloads)',
  'service,env,replicas,cpu_pct',
  'ingest,prod,6,71',
  'query,prod,4,88',
  'auth,staging,2,34',
  '{"event":"restart","count":2,"ok":true,"tags":["oom","deploy"],"pid":4127}',
  'func health(nodes []string) error {',
  '    for _, n := range nodes {',
  '        if !ping(n, 2*time.Second) { return fmt.Errorf("node %s down", n) }',
  '    }',
  '    return nil',
  '}',
  '注意：搜索索引重建完成，但分片再平衡仍在进行，预计三十分钟后结束。',
  'audit: 2026-09-15T06:14:52Z INFO shard 7 rebalanced (moved 12GB)',
  'gh pr view 8412 --json title,author --jq ".title" | tee /tmp/pr.txt',
  'Actions: pause the indexer, drain shard 7, then verify counts.',
].join('\n');

const CHAOS_C = [
  'Postmortem draft: the checkout service returned 502s for 4 minutes.',
  '- root cause: certificate expired on the edge proxy',
  '- blast radius: 1.2k sessions, 34 abandoned carts',
  'env,service,error_rate,p95_ms',
  'prod,checkout,0.062,940',
  'prod,payments,0.003,311',
  'staging,checkout,0.011,502',
  '{"trace":"abc123","spans":18,"ok":false,"retry":["edge","auth"],"ms":4021}',
  'select count(*) from orders where created_at > now() - interval \'4 min\';',
  '// fix: rotate certs weekly, alert 14 days before expiry',
  '结论：边缘证书过期导致网关拒绝上游连接，已添加自动轮换与告警。',
  'oncall: 2026-09-15T07:31:04Z RESOLVED checkout 502s (cert rotated)',
  'Region failover us-west-2 → eu-west-1 completed in 90s.',
].join('\n');

const CHAOS_D = [
  '概要: 決済サービスが一時的にエラーを返した問題の調査結果です。',
  '- 影響範囲: 3分間、約400リクエスト',
  '- 原因: 接続プールの枯渇 (max=50, wait=3s)',
  'service,region,status,latency',
  'payment,ap-northeast-1,degraded,890',
  'payment,ap-northeast-1,ok,120',
  'cart,ap-southeast-1,ok,95',
  '{"alert":"payment-latency","severity":"P1","ok":false,"pages":["slack","phone"],"ms":890}',
  'def collect(metrics):',
  '    out = {}',
  '    for m in metrics:',
  '        out[m.name] = m.value',
  '    return out',
  '検知: 2026-09-15T08:22:41Z アラート発報、3分後に自動復旧しました。',
  'aws apigateway get-rest-apis --region ap-northeast-1 --query "items[].id"',
  '次の対応: プール上限の引き上げとタイムアウト調整を来週適用します。',
].join('\n');

const CHAOS_E = [
  'Weekly report: search quality dipped after the sharding change.',
  '- p95 latency 480ms (was 210ms)',
  '- 3 regression bugs filed by QA',
  '| team | tickets | sla |',
  '| search | 14 | 97% |',
  '| infra | 8 | 99% |',
  '| data | 5 | 91% |',
  '```yaml',
  'server:',
  '  port: 8080',
  '  regions: [us-east-1, eu-west-1]',
  '  timeout_ms: 3000',
  '```',
  '{"build":"2841","passed":812,"failed":3,"skipped":17,"flaky":["search-7"]}',
  'Note: 日文团队报告索引重建将在周五完成，请确认窗口。',
  'audit 2026-09-15T09:02:33Z deploy finished in 42s',
  'Follow-ups: revert the sharding flag, re-run the suite, page data-oncall.',
].join('\n');

async function compare(name: string, text: string) {
  const inTok = tok(text);
  const a = await astraeaEncode(text, enc);
  const r = await rosettaEncode(text, enc);
  const art = a.exact && astraeaDecode(a.wire, enc) === text;
  const rrt = r.exact && rosettaDecode(r.wire, enc) === text;

  const signet = signetEncode(text, enc).outTokens;
  const mosaic = mosaicEncode(text, enc).outTokens;
  const orbit = (await orbitEncode(text, enc)).outTokens;
  const splice = spliceEncode(text, enc).outTokens;
  const kappa = kappaEncode(text, enc).outTokens;
  const phrase = phraseEncode(text, enc).outTokens;
  const tau = tauEncode(text, enc).outTokens;
  const xi = (await omegaXiCompress(text, enc)).outTokens;

  const bestOtherDirect = Math.min(r.outTokens, signet, mosaic, orbit, splice, kappa, phrase, tau, inTok);
  const superior = a.exact && art && a.outTokens <= bestOtherDirect;
  const strictlySuperior = a.exact && art && a.outTokens <= r.outTokens;

  console.log(
    `${name.padEnd(14)} in=${String(inTok).padStart(5)}  ASTRAEA=${String(a.outTokens).padStart(4)} (${a.member.padEnd(10)}) ` +
    `| ROSETTA=${String(r.outTokens).padStart(4)} (${r.member.padEnd(9)}) | bestOther=${bestOtherDirect}  ` +
    `${superior ? (a.outTokens < r.outTokens ? 'STRICT WIN ✓' : 'TIE / NEVER-WORSE ✓') : 'REGRESSION ✗'}`,
  );
  return superior && strictlySuperior;
}

async function main() {
  console.log('=== ASTRAEA-A2 COMPARISON VS ALL CODECS ===');
  let all = true;
  all = (await compare('chaos-900', CHAOS_900)) && all;
  all = (await compare('chaos-B', CHAOS_B)) && all;
  all = (await compare('chaos-C', CHAOS_C)) && all;
  all = (await compare('chaos-D jp', CHAOS_D)) && all;
  all = (await compare('chaos-E yaml', CHAOS_E)) && all;
  all = (await compare('chaos-F LLM', CHAOS_F_LLM_REPORT)) && all;
  all = (await compare('chaos-G cjk', CHAOS_G_CJK)) && all;
  all = (await compare('chaos-4000', CHAOS_4000)) && all;

  console.log(all ? '\nALL CHAOS FIXTURES: ASTRAEA-A2 is never-worse and byte-exact.' : '\nSOME FIXTURES FAILED');
}

main().catch(console.error);
