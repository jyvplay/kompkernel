import { encodeIds, countTokens } from '@/lib/omega/bpe';
import { encode as o } from 'gpt-tokenizer/encoding/o200k_base';
import { encode as c } from 'gpt-tokenizer/encoding/cl100k_base';
const samples = ['hello world', 'function f(x){return x*2}', 'Ünïcödé 日本語 テキスト', '{"a":[1,2,3],"b":null}', 'the quick brown fox '.repeat(50)];
let ok = true;
for (const s of samples) {
  const a = encodeIds(s, 'o200k_base'), b = o(s);
  const a2 = encodeIds(s, 'cl100k_base'), b2 = c(s);
  if (JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(a2) !== JSON.stringify(b2)) ok = false;
  console.log(a.length, a2.length, countTokens(s, 'o200k_base'));
}
console.log('ids identical to library:', ok);
