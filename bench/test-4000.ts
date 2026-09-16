/**
 * bench/test-4000.ts — Benchmark existing codecs & ASTRAEA-A2 on a 4000-character
 * chaotic heterogeneous fixture (>50% natural prose + lists + CSV + JSON + code + CJK).
 */
import { countTokens } from '../src/lib/omega/bpe';
import { rosettaEncode, rosettaDecode } from '../src/lib/omega/rosetta';
import { astraeaEncode, astraeaDecode } from '../src/lib/omega/astraea';
import { mosaicEncode } from '../src/lib/omega/mosaic';
import { orbitEncode } from '../src/lib/omega/orbit';
import { crownEncodeCached } from '../src/lib/omega/crown';
import { spliceEncode } from '../src/lib/omega/splice';
import { tauEncode } from '../src/lib/omega/tau';
import { phraseEncode } from '../src/lib/omega/phrase';
import { kappaEncode } from '../src/lib/omega/kappa';
import { omegaXiCompress } from '../src/lib/omega/atom-codec';

export const CHAOS_4000 = [
  // SECTION 1: Natural Prose (>2000 chars, complex technical prose & multi-token English words)
  'The architecture of modern distributed context optimization requires strict invariants across heterogeneous prompt distributions. ' +
  'When evaluating large language model latency and token billing overhead, traditional redundancy-based codecs frequently experience degradation on non-repetitive prompt payloads. ' +
  'The fundamental bottleneck stems from the sub-word tokenization algorithms used by byte-pair encoding schemes, where technical vocabulary, morphological suffixes, and domain-specific identifier stems fragment into multiple token IDs. ' +
  'For example, words such as "infrastructure", "configuration", "rebalancing", "responsiveness", and "deliberates" consistently incur significant token expansion penalties despite representing single semantic concepts.',

  'To mitigate this inefficiency, we investigate exact notational transposition combined with adaptive structural dictionary substitution. ' +
  'By identifying high-frequency sub-word fragments, structural delimiter patterns, and standardized schema encodings at runtime, an optimal representation can be synthesized without discarding a single byte of underlying content. ' +
  'Furthermore, cross-model compatibility dictates that the resulting wire format must decode deterministically across diverse tokenizer implementations without requiring out-of-band state or specialized local execution environments.',

  'In enterprise production environments, log aggregation streams and microservice traces exhibit mixed structural entropy. ' +
  'A single agent interaction turn routinely contains conversational natural prose, structured JSON metadata payloads, tabular CSV metrics, shell invocation commands, and localized multilingual status annotations. ' +
  'Achieving Pareto superiority over all existing baseline codecs under these conditions necessitates a multi-stage structural decomposition capable of dynamically selecting the minimal token representation for each sub-regime.',

  // SECTION 2: Markdown Lists & Empty Spaces
  'Key Optimization Objectives:',
  '  - Reduce total BPE wire token count strictly below input token count.',
  '  - Guarantee 100% byte-exact round-trip reconstruction across all supported encodings.',
  '  - Minimize total delivery overhead including header declarations and window anchors.',
  '  - Preserve cross-compatibility for zero-middleware direct reasoning contexts.',
  '  ',
  '  - Eliminate token fragmentation in dates, timestamps, cloud regions, and numeric ranges.',
  '  ',

  // SECTION 3: CSV Metrics Table
  'region,datacenter,instances,p99_latency_ms,error_count,cpu_utilization',
  'us-east-1,iad-3,142,812,0,0.74',
  'us-west-2,pdx-1,88,415,1,0.68',
  'eu-west-1,dub-1,94,512,2,0.81',
  'ap-northeast-1,nrt-2,65,920,5,0.89',
  'ap-south-1,bom-2,42,1105,3,0.92',
  'sa-east-1,gru-1,28,1450,8,0.95',

  // SECTION 4: JSON Payloads & Structured Event Logs
  '{"event":"health_check","service":"payment_gateway","status":"degraded","region":"ap-northeast-1","retry_count":3,"ok":false,"latency_ms":920,"timestamp":"2026-09-15T08:22:41.123Z"}',
  '{"event":"cache_warmup","service":"search_index","status":"aborted","reason":"TLS handshake timeout","host":"iad-3","retries":2,"timestamp":"2026-09-15T08:25:00.000Z"}',
  '{"event":"failover_completed","primary":"us-east-1","secondary":"us-west-2","duration_sec":42,"timestamp":"2026-09-15T08:30:12.456Z"}',

  // SECTION 5: Code Snippets (Python / TypeScript / Shell)
  'def evaluate_cluster_health(cluster_ctx, threshold_ms=800):',
  '    degraded_nodes = []',
  '    for node, metrics in cluster_ctx.items():',
  '        if metrics.get("p99_latency", 0) > threshold_ms or not metrics.get("ok", True):',
  '            degraded_nodes.append((node, metrics.get("p99_latency")))',
  '    if len(degraded_nodes) > 0:',
  '        raise ClusterHealthException(f"Cluster degraded: {degraded_nodes}")',
  '    return sum(m.get("hosts", 1) for m in cluster_ctx.values())',
  '',
  'kubectl rollout status deployment/payment-api --namespace=production --timeout=120s || kubectl get events --sort-by=.metadata.creationTimestamp',
  'aws ec2 describe-instances --region ap-northeast-1 --filter "Name=tag:Environment,Values=production" --query "Reservations[*].Instances[*].InstanceId"',

  // SECTION 6: Multilingual CJK & Operational Notes
  '障害報告: 深夜帯のバッチ処理中にデータベース接続プールが枯渇し、決済APIの応答遅延が発生しました。',
  '原因分析: レプリカのフェイルオーバー処理に失敗し、コネクション再試行ストームがトリガーされました。',
  '备注：数据库迁移已完成，但缓存预热失敗，请检查连接池配置和超时参数，必要时重启实例后再观察。',
  '记录：2026-09-15T08:35:10Z 警告 连接池耗尽 (max=50, wait=5s, active=50, idle=0)',
  'Summary: All secondary migrations verified; monitor pod memory, bump connection pool limits to 100, and re-run synthetic load tests before closing the incident.',
].join('\n');

async function main() {
  const enc = 'o200k_base';
  console.log(`CHAOS_4000 length = ${CHAOS_4000.length} chars`);
  const inTok = countTokens(CHAOS_4000, enc);
  console.log(`CHAOS_4000 inTokens = ${inTok}`);

  const rAstraea = await astraeaEncode(CHAOS_4000, enc);
  const rRosetta = await rosettaEncode(CHAOS_4000, enc);
  const rMosaic = mosaicEncode(CHAOS_4000, enc);
  const rOrbit = await orbitEncode(CHAOS_4000, enc);
  const rCrown = await crownEncodeCached(CHAOS_4000, enc);
  const rSplice = spliceEncode(CHAOS_4000, enc);
  const rTau = tauEncode(CHAOS_4000, enc);
  const rPhrase = phraseEncode(CHAOS_4000, enc);
  const rKappa = kappaEncode(CHAOS_4000, enc);
  const rXi = await omegaXiCompress(CHAOS_4000, enc);

  const astraeaExact = rAstraea.exact && astraeaDecode(rAstraea.wire, enc) === CHAOS_4000;

  console.log('\n--- CODEC RESULTS ON CHAOS_4000 ---');
  console.log(`Input Tokens: ${inTok}`);
  console.log(`ASTRAEA-A2: ${rAstraea.outTokens} (member=${rAstraea.member}, systems=[${rAstraea.systems.join(',')}], exact=${astraeaExact})`);
  console.log(`ROSETTA: ${rRosetta.outTokens} (member=${rRosetta.member}, exact=${rRosetta.exact && rosettaDecode(rRosetta.wire, enc) === CHAOS_4000})`);
  console.log(`MOSAIC: ${rMosaic.outTokens} (exact=${rMosaic.exact})`);
  console.log(`ORBIT: ${rOrbit.outTokens} (exact=${rOrbit.exact})`);
  console.log(`CROWN: ${rCrown.outTokens} (exact=${rCrown.exact})`);
  console.log(`SPLICE: ${rSplice.outTokens} (exact=${rSplice.exact})`);
  console.log(`TAU: ${rTau.outTokens} (exact=${rTau.exact})`);
  console.log(`PHRASE: ${rPhrase.outTokens} (exact=${rPhrase.exact})`);
  console.log(`KAPPA: ${rKappa.outTokens} (exact=${rKappa.exact})`);
  console.log(`OMEGA-XI: ${rXi.outTokens} (binary transport)`);
}

main().catch(console.error);
