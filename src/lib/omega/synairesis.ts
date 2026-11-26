/** X188 SYNAIRESIS: bounded simultaneous macro elimination.
 * Experimental, unwired. Same CHIRON reader, no new mathematical primitive.
 * Exhaustive subsets of size 1..3 among at most 12 rules; one best move.
 * Whole-envelope pricing, exact inverse gate. No native-chat claim.
 */
import {countTokens,type EncodingName} from './bpe';
import {chironDecode,chironOpsUsed,chironParseTape} from './chiron';
export function synairesisTrial(message:string,enc:EncodingName='o200k_base',width=3){
 if(!Number.isInteger(width)||width<1||width>3)throw Error('subset width');
 const key=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(k=>message.startsWith(k+'§'));
 // Conservative pricing domain: do not admit reserved-token spellings.
 if(!key||message.length>100000||message.includes('<|'))return null;
 const wire=message.slice(key.length),ops=chironOpsUsed(wire),cut=wire.indexOf('¶');
 if(!ops.script||ops.rep||ops.fill||ops.range||ops.split||cut<2)return null;
 const rules=chironParseTape(wire.slice(1,cut),ops.script);
 if(!rules||!rules.length||rules.length>128)return null;
 // Bound expansion before invoking the parent reader (including unused rules).
 const expanded=new Map<string,string>();
 for(const r of rules){
  let v='';for(const c of r.raw){v+=expanded.get(c)??c;if(v.length>100000)return null;}
  expanded.set(r.glyph,v);
 }
 let size=0;for(const c of wire.slice(cut+1)){size+=(expanded.get(c)??c).length;if(size>100000)return null;}
 const target=chironDecode(wire);if(target.length>100000)return null;
 const baseTokens=countTokens(message,enc);let best=message,tokens=baseTokens,probes=0,rejected=0;
 // Stable reverse-order pool, not an asserted optimal ranking.
 const pool=rules.map((_,i)=>i).reverse().slice(0,12);
 function trial(indices:number[]){
  let rs=rules!.map(r=>({g:r.glyph,v:r.raw})),body=wire.slice(cut+1);
  // Later-first elimination preserves dependencies on surviving earlier rules.
  for(const i of [...indices].sort((a,b)=>b-a)){
   const g=rules![i].glyph,r=rs.find(r=>r.g===g)!;
   body=body.split(g).join(r.v);
   rs=rs.filter(x=>x.g!==g).map(x=>({g:x.g,v:x.v.split(g).join(r.v)}));
   if(body.length+rs.reduce((n,r)=>n+r.v.length,0)>100000){rejected++;return;}
  }
  if(!rs.length){rejected++;return;}
  const w='§'+rs.map(r=>r.g+r.v).join('')+'¶'+body;probes++;
  if(chironDecode(w)!==target){rejected++;return;}
  const m=key+w,n=countTokens(m,enc);if(n<tokens){best=m;tokens=n;}
 }
 function subsets(start:number,chosen:number[]){
  if(chosen.length)trial(chosen);
  if(chosen.length===width)return;
  for(let j=start;j<pool.length;j++)subsets(j+1,[...chosen,pool[j]]);
 }
 subsets(0,[]);
 return {message:best,tokens,baseTokens,probes,rejected,target,layerExact:chironDecode(best.slice(key.length))===target};
}
/** Strict source gate: layout-bearing parent layers are not silently accepted. */
export function synairesisFromFrontier(message:string,source:string,enc:EncodingName='o200k_base'){
 const result=synairesisTrial(message,enc);
 return result&&result.target===source&&result.tokens<result.baseTokens?result:null;
}
