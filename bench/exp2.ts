/**
 * Hand-simulation of the proposed ROSETTA wire on CHAOS-900 + fresh chaos
 * samples. Measures the EXACT wire (header + spans + glyphs) under the real
 * tokenizer, before any codec code is written.
 */
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
import { CHAOS_900 } from './run';

const tok = (s: string) => encode(s).length;

// ---- glyph pool: 1-token chars OUTSIDE quasar/strata's 0x4E00.. pool ----
// Try CJK Compatibility Ideographs, Kangxi radicals are risky; test a few blocks.
function scanPool(cpStart: number, cpEnd: number, need: number): string[] {
  const out: string[] = [];
  for (let cp = cpStart; cp <= cpEnd && out.length < need; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encode(ch).length === 1) out.push(ch);
    } catch {}
  }
  return out;
}
const pools: Array<[string, string[]]> = [
  ['CJK ext beyond 0x4E00+2000', scanPool(0x4e00 + 2000, 0x9fa5, 20)],
  ['Hiragana 0x3041', scanPool(0x3041, 0x3096, 20)],
  ['Katakana 0x30A1', scanPool(0x30a1, 0x30f6, 20)],
  ['Circled 0x3280', scanPool(0x3280, 0x32b0, 20)],
  ['0x3358+', scanPool(0x3358, 0x3370, 20)],
];
for (const [name, p] of pools) {
  console.log(`pool ${name}: ${p.length} found: ${p.slice(0, 12).join('')} `);
}

// pick marks
const G = '㊀'; // candidate span mark
const RGL = ['㊁', '㊂', '㊃', '㊄']; // region glyphs
console.log('mark tokens:', tok(G), 'region glyphs:', RGL.map(tok));

// ---- hand-build the chaos-900 wire ----
// Systems: T (timestamp basic), J (json kv), C (csv space-table), R (region glyphs)
// Header: 'R1:G\n' style — test variants
const headerVariants = ['⟦R1·㊀⟧\n', 'R1:㊀\n', '⌗R1㊀\n'];
for (const h of headerVariants) console.log('header', tok(h), JSON.stringify(h));

const H = '⟦R1·㊀⟧\n';

// T span on the timestamp line
const tsOrig = '日志：2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s)';
const tsNew = '日志：㊀T20260915T060211Z WARN pool exhausted (max=20, wait=5s)';
console.log('timestamp line:', tok(tsOrig), '->', tok(tsNew));

// J span on the JSON line
const jOrig = '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}';
const jNew = '㊀Jjob=sync retries=3 ok=false warn=timeout|auth ms=812㊀';
console.log('json line:', tok(jOrig), '->', tok(jNew));

// C span on the CSV block (fields space-joined, rows newline-kept)
const cOrig = 'region,dc,hosts,errors\nus-east-1,iad-3,42,0\neu-west-1,dub-1,17,2\nap-south-1,bom-2,9,1';
const cNew = '㊀Cregion dc hosts errors\n㊁ iad-3 42 0\n㊂ dub-1 17 2\n㊃ bom-2 9 1㊀';
console.log('csv block:', tok(cOrig), '->', tok(cNew));
const cNewNoR = '㊀Cregion dc hosts errors\nus-east-1 iad-3 42 0\neu-west-1 dub-1 17 2\nap-south-1 bom-2 9 1㊀';
console.log('csv block (no R):', tok(cOrig), '->', tok(cNewNoR));

// Full wire assembly
const wire =
  H +
  'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.\n' +
  '- queue depth 14, p99 latency 812ms (spike)\n' +
  '- flaky test `test_retry_backoff` failed twice on shard 7\n' +
  '- cache warmup aborted: TLS handshake timeout\n' +
  cNew + '\n' +
  jNew + '\n' +
  'def run(ctx):\n' +
  '    for k, v in ctx.items():\n' +
  '        if v is None: raise ValueError(k)\n' +
  '    return sum(ctx.values())\n' +
  '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。\n' +
  '日志：㊀T20260915T060211Z WARN pool exhausted (max=20, wait=5s)\n' +
  'kectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts\n' +
  'Next steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.';
console.log('\nFULL WIRE:', tok(wire), 'tokens  (input:', tok(CHAOS_900), ', eidolon: 277)');
console.log('wire chars:', wire.length);

// ---- second chaos sample to test consistency ----
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
console.log('\nCHAOS_B length:', CHAOS_B.length, 'tokens:', tok(CHAOS_B));
// hand-transpose B: T on timestamp, J on json, C on csv, R on none (no regions)
const wireB =
  H +
  CHAOS_B.split('\n').map((l) => {
    if (l.startsWith('audit: 2026-09-15T06:14:52Z')) return l.replace('2026-09-15T06:14:52Z', '㊀T20260915T061452Z');
    if (l.startsWith('{"event"')) return '㊀Jevent=restart count=2 ok=true tags=oom|deploy pid=4127㊀';
    if (/^[a-z]+,(prod|staging),\d+,\d+$/.test(l) || l === 'service,env,replicas,cpu_pct') {
      return l.includes(',') && !l.includes(' ') ? null : l; // handled below
    }
    return l;
  }).join('\n');
// csv block transposition for B
const csvB = 'service,env,replicas,cpu_pct\ningest,prod,6,71\nquery,prod,4,88\nauth,staging,2,34';
const csvBNew = '㊀Cservice env replicas cpu_pct\ningest prod 6 71\nquery prod 4 88\nauth staging 2 34㊀';
console.log('CHAOS_B csv block:', tok(csvB), '->', tok(csvBNew));
const wireB2 = wireB
  .replace('service,env,replicas,cpu_pct\ningest,prod,6,71\nquery,prod,4,88\nauth,staging,2,34', csvBNew)
  .replace('null\n', '');
console.log('CHAOS_B wire (hand):', tok(wireB2), ' (also verify no stray null:', wireB2.includes('null,') ? 'CHECK' : 'ok', ')');
