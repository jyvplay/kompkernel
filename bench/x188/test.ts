import fs from 'node:fs';
import assert from 'node:assert/strict';
import {synairesisTrial,synairesisFromFrontier} from '../../src/lib/omega/synairesis';
import {chironDecode} from '../../src/lib/omega/chiron';
const key='¶ k=v. expand repeatedly; print only.\n';
let checks=0;
for(const body of ['αβγ','α α α','γγγ','😀 α\r\nβ','é\tβ','\u0000α'])for(let width=1;width<=3;width++){
 const wire='§αhello βworld γαβ¶'+body;
 const r=synairesisTrial(key+wire,'o200k_base',width)!;
 assert(r);assert.equal(r.target,chironDecode(wire));assert(r.layerExact);assert(r.tokens<=r.baseTokens);checks++;
}
for(const s of ['', '§αx¶α', key+'garbage', 'unrecognized contract\n§αx¶α']){assert.equal(synairesisTrial(s),null);checks++;}
assert.throws(()=>synairesisTrial('', 'o200k_base',4));checks++;
const rows=fs.readFileSync(process.argv[2]||'bench/x187/receipts/frontier.jsonl','utf8').trim().split('\n').map(s=>JSON.parse(s));
const out=rows.map(x=>{
 const t=performance.now(), cpu=process.cpuUsage();
 const variants=[1,2,3].map(w=>{const r=synairesisTrial(x.message,'o200k_base',w);if(r){assert(r.layerExact);assert(r.tokens<=x.tokens);checks++;}return {width:w,...r,sourceExact:r?r.target===x.text:null};});
 const strict=synairesisFromFrontier(x.message,x.text);
 if(strict){assert.equal(strict.target,x.text);assert(strict.tokens<x.tokens);}
 if(variants[2].sourceExact===false)assert.equal(strict,null);
 checks++;
 return {path:x.path,parentTokens:x.tokens,variants,strictAccepted:!!strict,ms:performance.now()-t,cpu:process.cpuUsage(cpu)};
});
fs.writeFileSync('bench/x188/receipts/trials.json',JSON.stringify({checks,input:process.argv[2]||'historical X187 wires',out},null,2));
console.log(JSON.stringify({checks,supported:out.filter(x=>x.variants[2].message).length,wins:out.filter(x=>x.variants[2].tokens<x.parentTokens).map(x=>({path:x.path,before:x.parentTokens,after:x.variants[2].tokens}))}));
