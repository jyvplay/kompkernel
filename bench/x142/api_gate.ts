import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {eutaxiaEncode} from '../../src/lib/omega/eutaxia';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const path='bench/holdout-tbl/df-h.txt',text=fs.readFileSync(path,'utf8');
const base=fs.readFileSync('bench/x142/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)).find(a=>a.path===path);
const t=performance.now(),r=eutaxiaEncode(text),ms=performance.now()-t;
assert.equal(r.message,base.message);assert.equal(r.decoded,text);assert.equal(r.eutaxia,false);assert.equal(r.candidateTokens,238);
console.log(JSON.stringify({path,ms,fallbackMessageIdentical:true,sourceExact:true,candidateTokens:r.candidateTokens,nativeVerified:false}));
