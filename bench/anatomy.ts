/** Token-level anatomy of the CHAOS-900 fixture: where do the 288 tokens go? */
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
import { CHAOS_900 } from './run';

const lines = CHAOS_900.split('\n');
let total = 0;
console.log('line-by-line token cost (o200k):');
for (const l of lines) {
  const ids = encode(l);
  const idsNl = encode(l + '\n');
  total += idsNl.length;
  console.log(
    String(idsNl.length).padStart(4),
    'chars=' + String(l.length).padStart(3),
    JSON.stringify(l.slice(0, 72)),
  );
}
console.log('approx total (sum of line+\\n):', total, 'actual:', encode(CHAOS_900).length);
console.log('\nJSON piece costs:');
for (const p of ['{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}',
  '{"job":', '":"', '","', '":[', '"]', '":3', 'true', 'false']) {
  console.log(String(encode(p).length).padStart(3), JSON.stringify(p));
}
console.log('\nCJK line costs:');
for (const p of ['备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。',
  '日志：2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s)']) {
  console.log(String(encode(p).length).padStart(3), JSON.stringify(p.slice(0, 40)));
}
console.log('\ncandidate transform experiments:');
const exp: Array<[string, string]> = [
  ['orig json', '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}'],
  ['json→csv-ish', 'job=sync retries=3 ok=false warn=timeout|auth ms=812'],
  ['orig csv 4 lines', 'region,dc,hosts,errors\nus-east-1,iad-3,42,0\neu-west-1,dub-1,17,2\nap-south-1,bom-2,9,1'],
  ['csv→;joined', 'region,dc,hosts,errors;us-east-1,iad-3,42,0;eu-west-1,dub-1,17,2;ap-south-1,bom-2,9,1'],
  ['orig py', 'def run(ctx):\n    for k, v in ctx.items():\n        if v is None: raise ValueError(k)\n    return sum(ctx.values())'],
  ['py→indent-digits', 'def run(ctx):\n4 for k, v in ctx.items():\n8 if v is None: raise ValueError(k)\n4 return sum(ctx.values())'],
  ['orig fluff prose', 'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.'],
  ['prose fluff-stripped', 'Status: deploy finished, two pods restart. Queue depth climbed retry storm live; on-call paged twice window.'],
];
for (const [name, s] of exp) {
  console.log(String(encode(s).length).padStart(3), name);
}
