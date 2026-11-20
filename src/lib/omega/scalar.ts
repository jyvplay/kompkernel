/** X145 SCALAR — state-specialized grammar compilation for UTF-8 transport.
 * Product of a straight-line macro grammar and a UTF-16 scalar transducer.
 * A rule is specialized by its incoming pending-high-surrogate state. Completed
 * scalars are emitted; a trailing high half is returned as state, never wire.
 * Unlike greedy edge shrinking, one source rule can acquire several context
 * variants and several rule boundaries can be crossed before a scalar completes.
 * Classical grammar/transducer composition ancestry. Experimental; TAGSTACK opt-in only.
 */
import {CHIRON_SCRIPTS,chironInScript,chironParseTape,chironDecode,chironOpsUsed} from './chiron';
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const SCALAR_HEADERS=['Before ¶ k=v. expand; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v. expand repeatedly; print only.\n','¶ k=v; expand recursively. Print only.\n'];
type Rule={g:string;v:string};type Result={wire:string;state:string};
const CAP=100000,MAX_RULES=128,MAX_VARIANTS=256;
export function scalarCompile(message:string,source?:string,enc:EncodingName='o200k_base'){
 if(message.length>CAP||isUtf8TransportStable(message))return null;
 const header=SCALAR_HEADERS.find(h=>message.startsWith(h+'§'));if(!header)return null;
 const wire=message.slice(header.length),end=wire.indexOf('¶');if(end<2)return null;
 const tape=wire.slice(1,end),body=wire.slice(end+1),script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)));if(!script)return null;
 const parsed=chironParseTape(tape,script),ops=chironOpsUsed(wire);
 if(!parsed||!parsed.length||parsed.length>MAX_RULES||ops.rep||ops.fill||ops.range||ops.split)return null;
 const rules=parsed.map(r=>({g:r.glyph,v:r.raw})),map=new Map(rules.map(r=>[r.g,r.v]));
 // All script characters must be actual nonterminals, and references precede uses.
 const seen=new Set<string>();for(const r of rules){for(const c of r.v){if(chironInScript(script,c.codePointAt(0)!)&&!seen.has(c))return null;}seen.add(r.g);}
 for(const c of body)if(chironInScript(script,c.codePointAt(0)!)&&!map.has(c))return null;
 // Bound every expanded rule before calling the inherited reader: an acyclic
 // grammar can still expand exponentially, including unreachable definitions.
 const expanded=new Map<string,string>();
 const bounded=(s:string)=>{let out='';for(const c of s){const v=expanded.get(c)??c;if(out.length+v.length>CAP)throw Error('SCALAR expansion cap');out+=v;}return out;};
 let target:string;try{for(const r of rules)expanded.set(r.g,bounded(r.v));target=bounded(body);if(chironDecode(wire)!==target)return null;}catch{return null;}
 if(target.length>CAP||!isUtf8TransportStable(target)||source!==undefined&&target!==source)return null;
 const output:Rule[]=[],used=new Set<string>(),memo=new Map<string,Result>();let scanned=0,variants=0;
 const ranges=script.ranges??[[script.lo,script.hi]];
 const sourceChars=new Set([...target]),pool:string[]=[];let poolAt=0;
 for(const [lo,hi]of ranges)for(let cp=lo;cp<hi;cp++){const c=String.fromCodePoint(cp);if(c.length===1&&!sourceChars.has(c)&&c!=='§'&&c!=='¶')pool.push(c);}
 const fresh=(preferred:string)=>{if(!used.has(preferred)&&!sourceChars.has(preferred)){used.add(preferred);return preferred;}while(poolAt<pool.length){const c=pool[poolAt++];if(!used.has(c)){used.add(c);return c;}}throw Error('SCALAR glyph capacity');};
 const walk=(text:string,incoming:string):Result=>{
  let state=incoming,out='';for(let i=0;i<text.length;i++){
   if(++scanned>2000000)throw Error('SCALAR work cap');const c=text[i],cp=text.charCodeAt(i);
   if(map.has(c)){const v=compile(c,state);out+=v.wire;state=v.state;}
   else if(cp>=0xd800&&cp<=0xdbff){if(state)throw Error('SCALAR consecutive high halves');state=c;}
   else if(cp>=0xdc00&&cp<=0xdfff){if(!state)throw Error('SCALAR missing high half');out+=state+c;state='';}
   else {if(state)throw Error('SCALAR interrupted scalar');out+=c;}
   if(out.length>CAP)throw Error('SCALAR wire cap');
  }return {wire:out,state};
 };
 const compile=(g:string,state:string):Result=>{
  const key=g+state,hit=memo.get(key);if(hit)return hit;
  if(++variants>MAX_VARIANTS)throw Error('SCALAR variants cap');
  const v=walk(map.get(g)!,state);let result=v;
  if(v.wire){if(output.length>=MAX_VARIANTS)throw Error('SCALAR variants cap');const symbol=fresh(g);output.push({g:symbol,v:v.wire});result={wire:symbol,state:v.state};}
  memo.set(key,result);return result;
 };
 try{
  const b=walk(body,'');if(b.state)throw Error('SCALAR unfinished scalar');
  // Rules emitting nothing become state transitions, so no empty tape entries.
  if(!output.length&&SCALAR_HEADERS.some(h=>target.startsWith(h+'§')))return null;
  const repaired=output.length?header+'§'+output.map(r=>r.g+r.v).join('')+'¶'+b.wire:target;
  if(repaired.length>CAP||!isUtf8TransportStable(repaired))return null;
  const decoded=output.length?chironDecode(repaired.slice(header.length)):repaired;
  if(decoded!==target)return null;
  return {message:repaired,tokens:countTokens(repaired,enc),decoded,variants:memo.size,rules:output.length,scanned,sourceExact:source!==undefined};
 }catch{return null;}
}

/** Deferred collection: preserve the existing search, then price valid repairs.
 * Context belongs to one synchronous top-level call; no cross-message state.
 */
type Frame={source:string;enc:EncodingName;messages:Set<string>};
let frame:Frame|null=null;
export function scalarCollecting():boolean{return frame!==null;}
export function scalarOffer(message:string,source:string,enc:EncodingName):void{
 if(frame&&frame.source===source&&frame.enc===enc&&frame.messages.size<32&&message.length<=CAP)frame.messages.add(message);
}
export function scalarCollect<T>(source:string,enc:EncodingName,run:()=>T){
 if(frame)throw Error('SCALAR nested collection');
 const current:Frame={source,enc,messages:new Set()};frame=current;let base:T;
 try{base=run();}finally{frame=null;}
 let best:ReturnType<typeof scalarCompile>=null;let compiled=0;
 for(const message of current.messages){const p=scalarCompile(message,source,enc);if(p){compiled++;if(!best||p.tokens<best.tokens)best=p;}}
 return {base,repair:best,offered:current.messages.size,compiled};
}
