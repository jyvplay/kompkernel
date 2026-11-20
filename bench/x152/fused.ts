import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {homosemaFusedCandidate,homosemaFusedRead,homosemaFusedKey,homosemaPlans} from '../../src/lib/omega/homosema';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const out=[];
for(const file of process.argv.slice(2))for(const row of fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l))){const source=fs.readFileSync(row.path),p=homosemaFusedCandidate(source.toString('utf8'),row.mode,row.parentMessage,readPlainParent);if(!p)continue;assert.ok(Buffer.from(homosemaFusedRead(p.message,readPlainParent)).equals(source));assert.equal(encode(p.message).length,p.tokens);out.push({path:row.path,mode:row.mode,incumbent:row.incumbent,child:row.child,candidate:p.tokens,gain:row.incumbent-p.tokens,sourceRead:true,message:p.message,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')});}
// Patch-targeted unit attacks: strings containing closers/escaped quotes stay literal.
let checks=0;for(const source of ['{"x":["]}","\\\"",1],"y":{}}','{\r\n "x": 1e+300,"x":-0\r\n}'])for(const p of homosemaPlans(source).filter(p=>p.mode.separator===null)){
 const parent='¶ k=v. expand repeatedly; print only.\n§аunused¶'+p.folded;
 const candidate=homosemaFusedCandidate(source,p.mode,parent,readPlainParent);assert.ok(candidate);assert.equal(homosemaFusedRead(candidate.message,readPlainParent),source);checks+=2;
 assert.equal(homosemaFusedCandidate(source+' ',p.mode,parent,readPlainParent),null);checks++;
 assert.equal(homosemaFusedCandidate(source,p.mode,parent.replace('expand repeatedly','expand'),readPlainParent),null);checks++;
}
fs.writeFileSync('bench/x152/receipts/fused.jsonl',out.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync('bench/x152/receipts/fused-unit.json',JSON.stringify({checks,passed:true}));console.log(JSON.stringify(out.map(({message,...r})=>r),null,2));
