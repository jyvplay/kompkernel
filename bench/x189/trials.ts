import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {anaplasisTrial,ANAPLASIS_FAMILIES} from '../../src/lib/omega/anaplasis';
const rows=fs.readFileSync(process.argv[2]||'bench/x188/receipts/frontier.jsonl','utf8').trim().split('\n').map(s=>JSON.parse(s));
const families=process.argv[3]?[process.argv[3]]:ANAPLASIS_FAMILIES;
const wanted=process.argv[4];
for(const x of rows){if(wanted&&!x.path.includes(wanted))continue;
 for(const family of families){const t=performance.now(),cpu=process.cpuUsage();const r=anaplasisTrial(x.message,x.text,'o200k_base',family as any,(process.argv[5]||'tokens') as any);
 if(r){assert(r.sourceExact);assert.equal(encode(r.message).length,r.tokens);assert(r.tokens<=x.tokens);}
 console.log(JSON.stringify({path:x.path,family,parentTokens:x.tokens,ms:performance.now()-t,cpu:process.cpuUsage(cpu),status:r?'exact':'unsupported',...r}));
 }
}
