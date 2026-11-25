import fs from 'node:fs';import assert from 'node:assert/strict';import {akribosParentRead} from '../../src/lib/omega/akribos-parent';import {antikleisParentRead} from '../../src/lib/omega/antikleis-parent';
const rows=fs.readFileSync('bench/x180/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));const result=[];
for(const [name,read] of [['prior',antikleisParentRead],['strict',akribosParentRead]] as const){const out=[];for(const r of rows){let text:string;try{text=read(r.message)}catch(e){out.push({path:r.path,status:'unsupported',error:String(e)});continue;}out.push({path:r.path,status:Buffer.from(text).equals(fs.readFileSync(r.path))?'exact':'mismatch'});}result.push({name,rows:out});}
assert.equal(result[1].rows.filter(r=>r.status==='mismatch').length,0);
for(const key of ['Body first. unknown','spec: unsupported','Decode unknown','¶bad','Before unknown'])assert.throws(()=>akribosParentRead(key));
assert.equal(akribosParentRead('ordinary prose\n'), 'ordinary prose\n');
const key='¶k=v expand repeatedly After ~, a number has . before its last 2 digits. print only.\n';
assert.throws(()=>akribosParentRead(key+'literal-without-dictionary'));
assert.throws(()=>akribosParentRead(key+'§а~¶а'));assert.throws(()=>akribosParentRead(key+'§а~1¶а'));
assert.throws(()=>akribosParentRead('x'.repeat(50001)));assert.throws(()=>akribosParentRead('\ud800'));
fs.writeFileSync('bench/x181/receipts/readers.json',JSON.stringify({result,attacks:11,scope:'Prior pinned frontier wires; fresh replay must independently match. Not native verification.'},null,2));console.log(result.map(r=>({name:r.name,exact:r.rows.filter(x=>x.status==='exact').length,unsupported:r.rows.filter(x=>x.status==='unsupported').length,mismatches:r.rows.filter(x=>x.status==='mismatch').length})));
