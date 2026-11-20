/** X138 SYNAPHE (junction): maximal suffix-prefix overlap at macro use sites.
 * Experimental, unwired. Dictionary expansion is ordinary acyclic CHIRON;
 * only body concatenation is changed. Distinct from overlapping candidate
 * mining (which still emits disjoint substitutions) and from CTXCOPY's
 * external context. No claim of native-model verification or global novelty.
 * Bounded one-state-per-position heuristic; full-message price admission.
 */
import {chironDecode,chironParseTape,CHIRON_SCRIPTS,chironInScript,chironOpsUsed} from './chiron';
import {countTokens,type EncodingName} from './bpe';
export const SYNAPHE_KEY='¶ k=v; expand rule definitions recursively. Scan body left to right: append literals; for each rule append its expansion minus its longest prefix equal to a suffix of output so far. Print only.\n';
export const SYNAPHE_CONTROL_KEY='¶ k=v; expand recursively. Print only.\n';
export function synapheOverlap(left:string,right:string):number{
 for(let k=Math.min(left.length,right.length);k>0;k--)if(left.endsWith(right.slice(0,k)))return k;
 return 0;
}
function grammar(message:string){
 if(message.length>100000)return null;
 const at=message.indexOf('§'),end=message.indexOf('¶',at+1);
 if(at<0||end<0)return null;
 const tape=message.slice(at+1,end),script=CHIRON_SCRIPTS.find(s=>tape&&chironInScript(s,tape.codePointAt(0)!));
 if(!script)return null;
 const rules=chironParseTape(tape,script);if(!rules||!rules.length||rules.length>128)return null;
 const wire='§'+tape+'¶',ops=chironOpsUsed(wire+message.slice(end+1));
 if(ops.rep||ops.fill||ops.range||ops.split)return null;
 const values=new Map<string,string>();
 for(const r of rules){const v=chironDecode(wire+r.glyph);if(!v||v.length>2000||v.startsWith('§'))return null;values.set(r.glyph,v);}
 return {wire,values,body:message.slice(end+1)};
}
export function synapheDecode(message:string):string{
 if(!message.startsWith(SYNAPHE_KEY))throw Error('SYNAPHE contract');
 const g=grammar(message.slice(SYNAPHE_KEY.length));if(!g)throw Error('SYNAPHE grammar');
 let out='';
 for(const c of g.body){const v=g.values.get(c);out+=v===undefined?c:v.slice(synapheOverlap(out,v));if(out.length>100000)throw Error('SYNAPHE output cap');}
 return out;
}
/** The source is never a reader input. target here is the parent's intermediate
 * decoded layer; callers must separately verify any composed source inverse.
 * Control differs only in macro-use overlap, not dictionary/search budget.
 */
export function synapheTrial(message:string,enc:EncodingName='o200k_base',overlap=true){
 // Do not discard an unknown parent contract merely because it contains a tape.
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>message.startsWith(p+'§'));
 if(!pre)return null;
 const g=grammar(message);if(!g)return null;
 const target=chironDecode(g.wire+g.body);
 if(target.length>20000||/[\uD800-\uDFFF]/.test(target))return null;
 if([...g.values.keys()].some(c=>target.includes(c)))return null;
 const n=target.length,paths:(string|undefined)[]=Array(n+1),cost=new Float64Array(n+1).fill(Infinity);
 paths[0]='';cost[0]=0;let probes=0,edges=0;
 // Full-prefix pricing, one retained path. BPE continuation context means this
 // is NOT Bellman-optimal: a discarded path could have a cheaper continuation.
 const relax=(from:number,to:number,emit:string)=>{
  const p=paths[from]!+emit;const t=countTokens(p,enc);probes++;
  if(t<cost[to]){cost[to]=t;paths[to]=p;}
 };
 for(let i=0;i<n;i++){
  if(paths[i]===undefined)continue;
  // Single character guarantees reachability; a literal token/run edge reduces
  // the character-by-character pricing bias without changing reader semantics.
  relax(i,i+1,target[i]);
  const run=/^(?:\s+|[^\s]+)/.exec(target.slice(i))?.[0];if(run&&run.length>1)relax(i,i+run.length,run);
  const prefix=overlap?target.slice(Math.max(0,i-2000),i):'';
  for(const [glyph,v]of g.values){const k=overlap?synapheOverlap(prefix,v):0,rest=v.slice(k);
   if(rest.length&&target.startsWith(rest,i)){relax(i,i+rest.length,glyph);edges++;}
  }
 }
 const body=paths[n]!,key=overlap?SYNAPHE_KEY:pre,candidate=key+g.wire+body;
 const restored=overlap?synapheDecode(candidate):chironDecode(g.wire+body);
 if(restored!==target)throw Error('SYNAPHE internal mismatch');
 return {message:candidate,tokens:countTokens(candidate,enc),baseTokens:countTokens(message,enc),probes,edges,layerExact:true,target,overlap};
}
export function synapheFromFrontier(message:string,enc:EncodingName='o200k_base'){
 const r=synapheTrial(message,enc,true);return r&&r.tokens<r.baseTokens?r:null;
}
