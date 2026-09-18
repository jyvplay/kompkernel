/** Micro-experiments: find real token slack in CHAOS-900 under o200k_base. */
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';
import { CHAOS_900 } from './run';

const tok = (s: string) => encode(s).length;

console.log('--- E1 JSON fold ---');
console.log(tok('{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}'), 'orig json');
console.log(tok('job=sync retries=3 ok=false warn=timeout|auth ms=812'), 'kv form');

console.log('\n--- E2 region/DC aliases (is the source itself multi-token?) ---');
for (const s of ['us-east-1', 'eu-west-1', 'ap-south-1', 'iad-3', 'dub-1', 'bom-2', 'iad', 'dub', 'bom']) {
  console.log(tok(s), JSON.stringify(s), '->', JSON.stringify(decode(encode(s))));
}
console.log(tok('us-east-1,iad-3,42,0'), 'csv row1');
console.log(tok('\nus-east-1,iad-3,42,0'), 'csv row1 with \\n prefix');

console.log('\n--- E3 ISO 8601 extended vs basic ---');
console.log(tok('2026-09-15T06:02:11Z'), 'extended');
console.log(tok('20260915T060211Z'), 'basic');
console.log(tok('日志：20260915T060211Z WARN'), 'basic in CJK line');

console.log('\n--- E4 anchoring: line cost with/without leading space ---');
const lines = CHAOS_900.split('\n');
let bare = 0, spaced = 0;
for (const l of lines) {
  const b = tok(l), s = tok(' ' + l);
  bare += b; spaced += s;
  if (s < b) console.log('SPACE WINS', b, '->', s, JSON.stringify(l.slice(0, 50)));
}
console.log('bare total', bare, 'spaced total', spaced);

console.log('\n--- E5 which CJK chars in the fixture cost 2+ tokens ---');
const cjkLine = '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。';
for (const ch of cjkLine) {
  const t = tok(ch);
  if (t > 1) console.log(t, ch, ch.codePointAt(0)!.toString(16));
}
console.log('cjk line total', tok(cjkLine), 'per char', (tok(cjkLine) / cjkLine.length).toFixed(2));
// cheapest CJK? sample: common hanzi are 1 token. Which are 2?
let twoTok = 0, oneTok = 0;
for (let cp = 0x4e00; cp < 0x4e00 + 2000; cp++) {
  const ch = String.fromCodePoint(cp);
  const t = tok(ch);
  if (t === 1) oneTok++; else if (t >= 2) twoTok++;
}
console.log('of first 2000 hanzi: 1-token =', oneTok, '2+-token =', twoTok);

console.log('\n--- E6 punctuation shells ---');
for (const [a, b] of [
  ['region,dc,hosts,errors', 'region，dc，hosts，errors'],
  ['{"job":"sync"', '｛＂job＂:＂sync＂'],
  ['(max=20, wait=5s)', '（max=20，wait=5s）'],
] as [string, string][]) {
  console.log(tok(a), 'vs', tok(b), JSON.stringify(a.slice(0, 24)));
}

console.log('\n--- E7 vocab coverage: do multi-token runs exist as single vocab entries? ---');
// Build reverse vocab: token text -> id, look for entries containing '-' etc.
// gpt-tokenizer exposes decodeByMap? We brute force: common substrings of the fixture.
const subs = [
  'us-east', 'eu-west', 'ap-south', 'east-1', '-east-', 'rollout status', 'sort-by',
  'deploy/api', '--timeout', 'retry storm', 'test_retry', 'test_retry_backoff',
  'cache warmup', 'on-call', 'p99', 'WARN pool', 'pool exhausted', 'sum(ctx.values())',
  'ctx.items()', 'raise ValueError', 'us-east-1,iad-3', 'kubectl', 'kectl',
];
for (const s of subs) console.log(tok(s), JSON.stringify(s));

console.log('\n--- E8 digit run costs ---');
for (const s of ['42,0', '17,2', '9,1', '812', '2026', '06:02:11', '90s', '20,5', '14', '7']) {
  console.log(tok(s), JSON.stringify(s));
}

console.log('\n--- E9 whole-line minimal forms (hand-optimized chaos lines) ---');
const variants: Array<[string, string]> = [
  ['csv header', 'region,dc,hosts,errors'],
  ['csv header alt', 'region dc hosts errors'],
  ['row1', 'us-east-1,iad-3,42,0'],
  ['row1 alt', 'us-east-1 iad-3 42 0'],
  ['row1 alt2', '美东 iad 42 0'],
  ['py if', '        if v is None: raise ValueError(k)'],
  ['py if alt', '8 if v is None: raise ValueError(k)'],
  ['py if alt2', '8if v is None: raise ValueError(k)'],
];
for (const [n, s] of variants) console.log(tok(s), n, JSON.stringify(s.slice(0, 40)));

console.log('\n--- E10 backtick span ---');
console.log(tok('- flaky test `test_retry_backoff` failed twice on shard 7'), 'orig');
console.log(tok('- flaky test test_retry_backoff failed twice on shard 7'), 'no backticks');

console.log('\n--- E11 sub-word splitting of the worst runs ---');
console.log(tok('iad-3'), 'iad-3');
console.log(tok('iad3'), 'iad3');
console.log(tok('IAD3'), 'IAD3');
console.log(tok('us-east-1'), 'us-east-1');
console.log(tok('useast1'), 'useast1');
console.log(tok('USE1'), 'USE1');
