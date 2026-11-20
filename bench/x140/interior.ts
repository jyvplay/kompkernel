/** Prior-turn next test: interior substring views, SAME parent dictionary.
 * Experimental control, not relabeled as a new codec. JSON framing is fully
 * counted. Source-mined dictionary variants are fed from joint trial wires.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {eikonParent} from '../../src/lib/omega/eikon';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const KEY='JSON [rules,body]: expand keys recursively. A rule value [g,start,length] selects that substring of expanded g, zero-based Unicode characters. Strings concatenate literals and keys. Print only.\n';
type Value=string|[string,number,number];type Rule=[string,Value];
export function decode(message:string){
 assert.ok(message.startsWith(KEY));const [rules,body]=JSON.parse(message.slice(KEY.length))as[Rule[],string];
 assert.ok(rules.length<=128);const map=new Map(rules),memo=new Map<string,string>(),busy=new Set<string>();assert.equal(map.size,rules.length);
 const expand=(g:string):string=>{if(memo.has(g))return memo.get(g)!;assert.ok(map.has(g)&&!busy.has(g));busy.add(g);const raw=map.get(g)!;let out='';
  if(typeof raw==='string')for(const c of raw){out+=map.has(c)?expand(c):c;assert.ok(out.length<=20000);}
  else{const [h,start,len]=raw;assert.ok(Number.isInteger(start)&&Number.isInteger(len)&&start>=0&&len>0);const v=[...expand(h)];assert.ok(start+len<=v.length);out=v.slice(start,start+len).join('');}
  busy.delete(g);memo.set(g,out);return out;};
 for(const [g]of rules)expand(g);let out='';for(const c of body){out+=map.has(c)?expand(c):c;assert.ok(out.length<=100000);}return out;
}
for(const file of ['bench/x139/receipts/frontier.jsonl','bench/x140/receipts/joint.jsonl'])for(const line of fs.readFileSync(file,'utf8').trim().split('\n')){
 const a=JSON.parse(line),message=a.ordinaryMessage??a.message,p=eikonParent(message);if(!p)continue;
 let rules:Rule[]=p.rules.map(r=>[r.g,r.v]),wire=KEY+JSON.stringify([rules,p.body]),tokens=encode(wire).length,probes=0,moves=0;
 for(let pass=0;pass<3;pass++){
  let best:{rs:Rule[];wire:string;tokens:number}|null=null;
  for(let i=0;i<rules.length;i++)for(const [g,v]of p.values){const want=p.values.get(rules[i][0])!;if(g===rules[i][0]||!want||want.length>=v.length)continue;const start=v.indexOf(want);if(start<0)continue;
   const rs=rules.map((r,j)=>j===i?[r[0],[g,start,want.length]]as Rule:r),w=KEY+JSON.stringify([rs,p.body]);probes++;
   try{if(decode(w)!==p.target)continue;}catch{continue;}
   const n=encode(w).length;if(n<(best?.tokens??tokens))best={rs,wire:w,tokens:n};
  }
  if(!best)break;rules=best.rs;wire=best.wire;tokens=best.tokens;moves++;
 }
 assert.equal(steliUndo(decode(wire)),fs.readFileSync(a.path,'utf8'));
 console.log(JSON.stringify({path:a.path,k:a.k??null,A:a.A??a.tokens,B:tokens,probes,moves,sourceExact:true,message:wire}));
}
// Targeted tests, not real-workload gains: genuine interior extraction and cycle.
const sample=KEY+JSON.stringify([[['а','012345'],['б',['а',1,3]]],'б']);assert.equal(decode(sample),'123');
assert.throws(()=>decode(KEY+JSON.stringify([[['а',['б',0,1]],['б',['а',0,1]]],'literal'])));
assert.throws(()=>decode(KEY+JSON.stringify([[['а','abc'],['б',['а',2,2]]],'б']))); // patch attack: end beyond expanded value

