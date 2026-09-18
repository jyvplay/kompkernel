/** Final design constants for ROSETTA: header, KV forms, region table, mark costs. */
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
import { CHAOS_900 } from './run';
const tok = (s: string) => encode(s).length;

// verified 1-token pool beyond 0x4E00+2000
function pool(cpStart: number, cpEnd: number, need: number): string[] {
  const out: string[] = [];
  for (let cp = cpStart; cp <= cpEnd && out.length < need; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encode(ch).length === 1) out.push(ch);
  }
  return out;
}
const P = pool(0x4e00 + 2048, 0x9fa5, 200);
console.log('pool size', P.length, 'first:', P.slice(0, 8).join(' '), 'last:', P.slice(-4).join(''));

console.log('\nheader variants (mark=pool[0]):');
for (const h of [P[0] + '\n', P[0] + ' ', 'R1' + P[0] + '\n', P[0] + '​\n']) {
  console.log(tok(h), JSON.stringify(h));
}
console.log('mark in context:', tok(P[0] + '\nStatus: deploy'), '(glyph + \\n + text)');

console.log('\nKV spelling variants for the JSON line:');
const orig = '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}';
console.log(tok(orig), 'orig');
console.log(tok('job=sync retries=3 ok=false warn=timeout|auth ms=812'), 'kv bare');
console.log(tok('job="sync" retries=3 ok=false warn="timeout|auth" ms=812'), 'kv quoted');
console.log(tok('job=sync,retries=3,ok=false,warn=timeout|auth,ms=812'), 'kv comma');

console.log('\nTS span forms:');
console.log(tok('日志：' + P[0] + '20260915T060211Z WARN'), 'marked basic (no id)');
console.log(tok('日志：20260915T060211Z WARN'), 'unmarked basic');
console.log(tok('日志：2026-09-15T06:02:11Z WARN'), 'orig');

console.log('\nCSV block with region glyphs from pool:');
const csvOrig = 'region,dc,hosts,errors\nus-east-1,iad-3,42,0\neu-west-1,dub-1,17,2\nap-south-1,bom-2,9,1';
const csvG = P[0] + 'Cregion dc hosts errors\n' + P[1] + ' iad-3 42 0\n' + P[2] + ' dub-1 17 2\n' + P[3] + ' bom-2 9 1' + P[0];
console.log(tok(csvOrig), '->', tok(csvG), 'with C span + region glyphs');

console.log('\nregion token costs (o200k):');
const regions = ['us-east-1','us-east-2','us-west-1','us-west-2','af-south-1','ap-east-1','ap-south-1','ap-south-2','ap-northeast-1','ap-northeast-2','ap-northeast-3','ap-southeast-1','ap-southeast-2','ap-southeast-3','ap-southeast-4','ca-central-1','ca-west-1','eu-central-1','eu-central-2','eu-west-1','eu-west-2','eu-west-3','eu-north-1','eu-south-1','eu-south-2','il-central-1','me-central-1','me-south-1','sa-east-1','eastus','eastus2','westus','westus2','westus3','centralus','northcentralus','southcentralus','westcentralus','northeurope','westeurope','francecentral','francesouth','germanywestcentral','germanynorth','ukwest','uksouth','switzerlandnorth','switzerlandwest','norwayeast','norwaywest','swedencentral','swedenwest','polandcentral','qatarcentral','uaenorth','uaecentral','centralindia','southindia','westindia','japaneast','japanwest','koreacentral','koreasouth','southeastasia','eastasia','australiaeast','australiacentral','australiacentral2','australiasoutheast','brazilsouth','brazilsoutheast','canadacentral','canadaeast','us-central1','us-east1','us-east4','us-east5','us-west1','us-west2','us-west3','us-west4','northamerica-northeast1','northamerica-northeast2','southamerica-east1','southamerica-west1','europe-west1','europe-west2','europe-west3','europe-west4','europe-west6','europe-west8','europe-west9','europe-north1','europe-central2','asia-east1','asia-east2','asia-south1','asia-south2','asia-southeast1','asia-southeast2','asia-northeast1','asia-northeast2','asia-northeast3','australia-southeast1','australia-southeast2','me-west1'];
const multi = regions.filter((r) => tok(r) >= 2);
console.log('total', regions.length, 'multi-token', multi.length);
console.log('1-token (skip):', regions.filter((r) => tok(r) < 2).join(' '));

console.log('\nfull chaos wire, final form:');
const H = P[0] + '\n';
const wire =
  H +
  'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.\n' +
  '- queue depth 14, p99 latency 812ms (spike)\n' +
  '- flaky test `test_retry_backoff` failed twice on shard 7\n' +
  '- cache warmup aborted: TLS handshake timeout\n' +
  P[0] + 'Cregion dc hosts errors\n' + P[1] + ' iad-3 42 0\n' + P[2] + ' dub-1 17 2\n' + P[3] + ' bom-2 9 1' + P[0] + '\n' +
  P[0] + 'Jjob=sync retries=3 ok=false warn=timeout|auth ms=812' + P[0] + '\n' +
  'def run(ctx):\n    for k, v in ctx.items():\n        if v is None: raise ValueError(k)\n    return sum(ctx.values())\n' +
  '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。\n' +
  '日志：' + P[0] + '20260915T060211Z WARN pool exhausted (max=20, wait=5s)\n' +
  'kectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts\n' +
  'Next steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.';
console.log(tok(wire), 'tokens vs input', tok(CHAOS_900), '(eidolon 277)');
