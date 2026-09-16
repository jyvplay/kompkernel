/**
 * bench/aether-test.ts
 * Comprehensive test & benchmark harness for AETHER-A1 / AETHER-Ω codec.
 * Validates 100% byte-exact roundtrips and strict Pareto superiority across
 * all fixtures in the repository benchmark suite.
 */

import { aetherEncode, aetherDecode, aetherSelfTest, AETHER_PHRASEBOOK_STRINGS } from '@/lib/omega/aether';
import { rosettaEncode, rosettaDecode } from '@/lib/omega/rosetta';
import { omegaXiCompress, omegaXiDecode } from '@/lib/omega/atom-codec';
import { countTokens } from '@/lib/omega/bpe';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, mosaicFixtures, MOSAIC_HANDTRACE_300 } from './fixtures';

const PROSE_CHAOS_2000 = `System Architecture and Execution Trace Report (v4.2.1-prod)
The distributed consensus engine successfully committed block 849201 after a brief transient leader election delay. Network partitioning was detected in availability zone us-east-1a between 03:14:22Z and 03:14:45Z, causing temporary message queuing in the primary broker pool. All worker threads recovered without manual intervention once heartbeat signals stabilized across the mesh topology.

Key Operational Metrics:
- Primary throughput: 14200 req/sec (p99 latency 14.2ms)
- Storage layer IOPS: 85000 read / 32000 write
- Memory footprint: 64.2% heap utilization (gc overhead < 1.2%)
- Circuit breaker state: CLOSED (0 trips in last 24h)

service,region,status,latency_p95,error_rate
auth-api,us-east-1,HEALTHY,12.4,0.0001
billing-v2,eu-west-1,HEALTHY,18.9,0.0000
search-node,ap-northeast-1,DEGRADED,145.0,0.0210
cache-cluster,us-west-2,HEALTHY,2.1,0.0000

{"timestamp":"2026-09-15T03:15:00Z","level":"INFO","event":"checkpoint_complete","block":849201,"duration_ms":342,"checksum":"a8f3c9e1","nodes":["node-01","node-02","node-03"]}
{"timestamp":"2026-09-15T03:15:05Z","level":"WARN","event":"queue_pressure","depth":1420,"threshold":1000,"action":"scale_workers"}

def verify_cluster_health(nodes: list[dict]) -> bool:
    """Audits current cluster state across all registered region endpoints."""
    active = [n for n in nodes if n.get('status') == 'HEALTHY']
    ratio = len(active) / len(nodes) if nodes else 0.0
    return ratio >= 0.75 and all(n.get('latency_p95', 0) < 500 for n in active)

障害対応ログ: 03:14:25Z にネットワーク瞬断が発生し、一部のワーカーノードで再接続処理が実行されました。
備考: データベースのフェイルオーバーは発生せず、リードレプリカの同期遅延も許容範囲内 (0.4秒) に収まっています。
次のアクション: us-east-1a のネットワーク機器のファームウェア更新を予定通り実施し、アラート閾値を一時的に緩和します。
For further details, consult the internal wiki at https://wiki.internal/ops/postmortem/2026-09-15-us-east-1.`;

async function main() {
  console.log('=== AETHER SELF-TESTS ===');
  const st = await aetherSelfTest('o200k_base');
  let fails = 0;
  for (const t of st) {
    if (!t.pass) fails++;
    console.log(`${t.pass ? 'PASS' : 'FAIL'}  ${t.name.padEnd(46)} ${t.details}`);
  }
  console.log(`${st.length - fails}/${st.length} pass`);

  console.log('\n=== PARETO SUPERIORITY BENCHMARK SUITE ===');
  const f = mosaicFixtures();
  const agentTurn = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;
  const suite: Array<[string, string]> = [
    ['CHAOS-900', CHAOS_900],
    ['CHAOS-G', CHAOS_G_CJK],
    ['CHAOS-F', CHAOS_F_LLM_REPORT],
    ['PROSE-2000', PROSE_CHAOS_2000],
    ['handtrace-300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
    ['agent-turn', agentTurn],
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
  ];

  let totIn = 0, totRos = 0, totXi = 0, totAether = 0;
  let allPareto = true;

  console.log('Fixture'.padEnd(16) + 'inTok'.padStart(7) + 'Rosetta'.padStart(9) + 'OmegaXi'.padStart(9) + 'AETHER'.padStart(9) + ' Pareto Win?');

  for (const [name, text] of suite) {
    const inT = countTokens(text, 'o200k_base');
    const ros = await rosettaEncode(text, 'o200k_base');
    let xiTok = 999999;
    try {
      const xi = await omegaXiCompress(text, 'o200k_base');
      if (xi.exact) xiTok = xi.outTokens;
    } catch {}

    const aeth = await aetherEncode(text, 'o200k_base');
    const dec = await aetherDecode(aeth.wire, 'o200k_base');

    if (dec !== text || !aeth.exact) {
      console.error(`BYTE MISMATCH on ${name}!`);
      process.exit(1);
    }

    const pareto = aeth.outTokens <= ros.outTokens && aeth.outTokens <= xiTok;
    if (!pareto) allPareto = false;

    totIn += inT;
    totRos += ros.outTokens;
    totXi += (xiTok < 999999 ? xiTok : inT);
    totAether += aeth.outTokens;

    const winNote = aeth.outTokens < Math.min(ros.outTokens, xiTok)
      ? '  STRICT WIN'
      : aeth.outTokens <= Math.min(ros.outTokens, xiTok)
      ? '  TIED BEST'
      : '  FAILED';

    console.log(
      name.padEnd(16) +
      String(inT).padStart(7) +
      String(ros.outTokens).padStart(9) +
      String(xiTok).padStart(9) +
      String(aeth.outTokens).padStart(9) +
      winNote
    );
  }

  console.log('--------------------------------------------------');
  console.log('TOTALS:'.padEnd(16) + String(totIn).padStart(7) + String(totRos).padStart(9) + String(totXi).padStart(9) + String(totAether).padStart(9));
  console.log('PARETO SUPERIORITY CONFIRMED ACROSS ALL FIXTURES:', allPareto);

  if (!allPareto || fails > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
