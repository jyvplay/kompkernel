/** Freeze source-mined image pairs, add identical value dictionaries to both
 * arms; ordinary concatenation body search is shared, not credited as novelty.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {eikonParent,eikonImage,EIKON_OPS,eikonTrial,eikonDecode} from '../../src/lib/omega/eikon';
import {synapheTrial} from '../../src/lib/omega/synaphe';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const ct=(s:string)=>encode(s).length;
const rows=fs.readFileSync(process.argv[2]??'bench/x139/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const a of rows){
 const p=eikonParent(a.message);if(!p)continue;
 const counts=new Map<string,number>();
 const chunks=[...p.target.matchAll(/[A-Za-z0-9_./-]+/g)];
 for(let i=0;i<chunks.length;i++)for(let n=1;n<=4&&i+n<=chunks.length;n++){
  const last=chunks[i+n-1],v=p.target.slice(chunks[i].index!,last.index!+last[0].length);
  if(v.length<6||v.length>120||/[\n\r]/.test(v))continue;
  counts.set(v,(counts.get(v)??0)+1);
 }
 const pool:string[]=[];for(let cp=p.script.lo;cp<p.script.hi;cp++){const g=String.fromCharCode(cp);if(!a.message.includes(g)&&!p.target.includes(g))pool.push(g);}
 pool.sort((a,b)=>ct(a)-ct(b)||a.charCodeAt(0)-b.charCodeAt(0));
 const pairs:{v:string;w:string;op:string;score:number}[]=[];
 for(const [v,n]of counts)for(const op of EIKON_OPS){const w=eikonImage(v,op),m=counts.get(w)??0;if(v===w||!m)continue;pairs.push({v,w,op,score:(n-1)*ct(v)+m*ct(w)-8});}
 pairs.sort((a,b)=>b.score-a.score||a.v.localeCompare(b.v)||a.op.localeCompare(b.op));
 const fresh:string[]=[],seen=new Set(p.values.values());
 for(const pair of pairs){for(const v of [pair.v,pair.w])if(!seen.has(v)){seen.add(v);fresh.push(v);}if(fresh.length>=16)break;}
 const available=Math.min(fresh.length,pool.length,128-p.rules.length);
 for(const k of [...new Set([0,Math.min(4,available),Math.min(8,available),Math.min(16,available)])]){
  const seed=p.pre+'§'+p.tape+fresh.slice(0,k).map((v,i)=>pool[i]+v).join('')+'¶'+p.body;
  const t=performance.now(),ordinary=synapheTrial(seed,'o200k_base',false);if(!ordinary)continue;
  const ordinaryMs=performance.now()-t,q=performance.now(),image=eikonTrial(ordinary.message),imageMs=performance.now()-q;
  assert.ok(image);assert.equal(steliUndo(eikonDecode(image.message)),fs.readFileSync(a.path,'utf8'));assert.equal(ct(image.message),image.tokens);
  console.log(JSON.stringify({path:a.path,k,pairCandidates:pairs.length,topPairs:pairs.slice(0,8),A:a.tokens,ordinaryTokens:ordinary.tokens,imageTokens:image.tokens,images:image.images,moves:image.moves,ordinaryMs,imageMs,sourceExact:true,ordinaryMessage:ordinary.message,imageMessage:image.message}));
 }
}
