/** X140 highest-information next test: long transformed phrases, not more
 * short-rule EIKON rewrites. Proxy estimates are not compression bounds.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {eikonParent,eikonImage,EIKON_OPS,eikonTrial,eikonDecode} from '../../src/lib/omega/eikon';
import {synapheTrial} from '../../src/lib/omega/synaphe';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const ct=(s:string)=>encode(s).length;
for(const line of fs.readFileSync(process.argv[2]??'bench/x141/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),p=eikonParent(a.message),source=fs.readFileSync(a.path,'utf8'),text=p?.target??source;
 const words=[...text.matchAll(/[A-Za-z0-9_./-]+/g)],counts=new Map<string,number>();
 for(let i=0;i<words.length;i++)for(let n=3;n<=16&&i+n<=words.length;n++){
  const last=words[i+n-1],v=text.slice(words[i].index!,last.index!+last[0].length);
  if(v.length<24||v.length>400||/[\r\n]/.test(v))continue;counts.set(v,(counts.get(v)??0)+1);
 }
 const pairs:{v:string;w:string;op:string;uses:number;proxy:number}[]=[];
 for(const [v,n]of counts)for(const op of EIKON_OPS){const w=eikonImage(v,op),m=counts.get(w)??0;if(w===v||!m)continue;pairs.push({v,w,op,uses:n+m,proxy:(n-1)*ct(v)+m*ct(w)-8});}
 pairs.sort((a,b)=>b.proxy-a.proxy||a.v.localeCompare(b.v)||a.op.localeCompare(b.op));
 const row:any={path:a.path,parentEligible:!!p,phrases:counts.size,pairs:pairs.length,top:pairs.slice(0,12),A:a.tokens};
 if(p&&pairs.length&&p.rules.length<=126){
  const pair=pairs[0],pool:string[]=[];for(let cp=p.script.lo;cp<p.script.hi;cp++){const c=String.fromCharCode(cp);if(!a.message.includes(c)&&!text.includes(c))pool.push(c);}
  pool.sort((a,b)=>ct(a)-ct(b)||a.charCodeAt(0)-b.charCodeAt(0));
  if(pool.length>=2){const seed=p.pre+'§'+p.tape+pool[0]+pair.v+pool[1]+pair.w+'¶'+p.body;
   const ordinary=synapheTrial(seed,'o200k_base',false);assert.ok(ordinary);
   const image=eikonTrial(ordinary.message);assert.ok(image);assert.equal(steliUndo(eikonDecode(image.message)),source);
   Object.assign(row,{ordinaryTokens:ordinary.tokens,imageTokens:image.tokens,images:image.images,sourceExact:true,ordinaryMessage:ordinary.message,imageMessage:image.message});
  }
 }
 console.log(JSON.stringify(row));
}
