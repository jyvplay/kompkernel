import fs from 'node:fs';import {homosemaPlans} from '../../src/lib/omega/homosema';import {countTokens} from '../../src/lib/omega/bpe';
const rows=fs.readFileSync('bench/x151/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const path of ['bench/holdout/gh-api.json.txt','bench/holdout-ops/package-lock-head.json'])rows.push({path,text:fs.readFileSync(path,'utf8'),tokens:null});
const out=rows.map(r=>({path:r.path,raw:countTokens(r.text,'o200k_base'),incumbent:r.tokens,plans:homosemaPlans(r.text).map(p=>({mode:p.mode,changed:p.changed,folded:countTokens(p.folded,'o200k_base'),completeRaw:p.tokens}))}));fs.writeFileSync('bench/x152/receipts/screen.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out.filter(r=>r.plans.length),null,2));
