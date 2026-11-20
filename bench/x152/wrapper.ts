// Replay the newly added tournament over ACTUAL parent results, not simulated
// encodes. Missing folded parents throw; any cache hit must match exact text.
import fs from 'node:fs';import assert from 'node:assert/strict';import {homosemaFromFrontier} from '../../src/lib/omega/homosema-frontier';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {homosemaFusedRead} from '../../src/lib/omega/homosema';
const baseline=fs.readFileSync('bench/x152/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));const result=[];let checks=0;
for(const file of ['parent','chalk','vscode']){
 const rows=fs.readFileSync(`bench/x152/receipts/${file}.jsonl`,'utf8').trim().split('\n').map(l=>JSON.parse(l)),path=rows[0].path,source=fs.readFileSync(path,'utf8');
 const base=file==='parent'?baseline.find(r=>r.path===path):JSON.parse(fs.readFileSync(`bench/x152/receipts/${file}.jsonl.baseline.json`,'utf8'));
 const actualParents=new Map(rows.map(r=>[r.folded,r.parentMessage]));const encode=(s:string)=>{const p=actualParents.get(s);if(!p)throw Error('unmeasured parent');return p;};
 const selected=homosemaFromFrontier(source,base.message,encode,readPlainParent);
 assert.equal(selected.tokens,Math.min(base.tokens,...rows.filter(r=>r.mode.separator===null).map(r=>r.child+9)));checks++;
 assert.equal(selected.applied?homosemaFusedRead(selected.message,readPlainParent):readPlainParent(selected.message),source);checks++;
 assert.equal(homosemaFromFrontier(source+' ',base.message,encode,readPlainParent).applied,false);checks++;
 assert.equal(homosemaFromFrontier(source,base.message,()=>{throw Error('encoder failure')},readPlainParent).message,base.message);checks++;
 result.push({path,...selected});
}
// Unsupported baseline never authorizes a candidate or claims a verified decode.
assert.equal(homosemaFromFrontier('{}','unsupported',()=>{throw Error('must not run')},s=>s).reason,'baseline reader unsupported or mismatched');checks++;
fs.writeFileSync('bench/x152/receipts/wrapper.json',JSON.stringify({checks,passed:true,scope:'selector replay over actual source-matched emitted parents; not fresh encoder timings',rows:result},null,2));console.log(JSON.stringify({checks,rows:result.map(({message,...r})=>r)}));
