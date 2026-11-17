import * as fs from 'node:fs';
import { encode as EN, decode as DE } from 'gpt-tokenizer/encoding/o200k_base';
const p = process.env.LANE ?? 'bench/holdout/code-ts.txt';
const src = fs.readFileSync(p,'utf8');
const toks = EN(src).map(i=>DE([i]));
const body = toks.join('');
console.log(`lane=${p} toks=${toks.length}`);
console.log(`roundtrip IDENTICAL        : ${body === src}`);
if (body !== src) {
  let i=0; while(i<Math.min(body.length,src.length) && body[i]===src[i]) i++;
  console.log(`first diff at char ${i}`);
  console.log(`  src : ${JSON.stringify(src.slice(Math.max(0,i-30), i+30))}`);
  console.log(`  body: ${JSON.stringify(body.slice(Math.max(0,i-30), i+30))}`);
}
