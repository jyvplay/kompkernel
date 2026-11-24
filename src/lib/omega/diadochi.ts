/** X168 DIADOCHI (succession): predecessor-routed FIFO streams.
 * Experimental, not registered. Classical finite-context/graph ancestry;
 * no claim of a new information-theoretic primitive or native LLM validation.
 * Unlike THESI, no occurrence positions are transmitted; unlike SYMFRAZ,
 * routing depends on already reconstructed output, not a frozen skeleton.
 */
import {countTokens, type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const DIADOCHI_CAP = 50000;
export const DIADOCHI_KEY = 'Decode payload first. JSON [first field,default queue,rows [previous field,queue]]. Queues are null for empty, otherwise strings split on ASCII spaces retaining empty fields. Emit first field; repeatedly consume the next field from its matching row, or default if no row, until all queues empty. Each emitted field selects the next queue. Join output fields with ASCII spaces, preserve all characters; print only.\n';
function domain(s:string) { if(s.length>DIADOCHI_CAP || !isUtf8TransportStable(s)) throw Error('DIADOCHI domain'); }
function field(x:unknown):x is string { return typeof x==='string' && !x.includes(' '); }
/** Reject stranded edges, duplicate contexts, premature queue exhaustion and
 * oversized expansion. The work bound is the number of literal queue entries. */
export function diadochiUndo(folded:string):string {
 domain(folded); const x:unknown=JSON.parse(folded);
 if(!Array.isArray(x)||x.length!==3||!field(x[0])||!Array.isArray(x[2])||x[2].length>1024) throw Error('DIADOCHI frame');
 type Queue={values:string[];at:number};
 let edges=0,units=x[0].length;
 function queue(raw:unknown):Queue { if(raw!==null&&typeof raw!=='string') throw Error('DIADOCHI queue');const a=raw===null?[]:(raw as string).split(' ');edges+=a.length;for(const s of a)units+=1+s.length;if(units>DIADOCHI_CAP||edges>DIADOCHI_CAP)throw Error('DIADOCHI expansion');return {values:a,at:0}; }
 const fallback=queue(x[1]),rows=new Map<string,Queue>();
 for(const r of x[2]) { if(!Array.isArray(r)||r.length!==2||!field(r[0])||rows.has(r[0]))throw Error('DIADOCHI row');rows.set(r[0],queue(r[1])); }
 const out:string[]=[x[0]];let previous=x[0];
 for(let i=0;i<edges;i++){const q=rows.get(previous)??fallback;if(q.at>=q.values.length)throw Error('DIADOCHI stranded transition');previous=q.values[q.at++];out.push(previous);}
 if(fallback.at!==fallback.values.length||[...rows.values()].some(q=>q.at!==q.values.length))throw Error('DIADOCHI unused transition');
 const result=out.join(' ');domain(result);return result;
}
/** At most six deterministic top-frequency context sets; no greedy wire edits.
 * Ties use first occurrence, never locale ordering. Original field order is
 * retained within each FIFO. The final field has no successor. */
export function diadochiPlans(source:string,enc:EncodingName='o200k_base') {
 domain(source);const a=source.split(' ');if(a.length<3)return [];
 const frequency=new Map<string,number>();for(let i=0;i+1<a.length;i++)frequency.set(a[i],(frequency.get(a[i])??0)+1);
 const ranked=[...frequency].filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]);
 const plans:{contexts:number;folded:string;message:string;tokens:number}[]=[];
 for(const cap of [1,2,4,8,16,32]) {
  const rows=new Map(ranked.slice(0,cap).map(([w])=>[w,[] as string[]]));if(!rows.size)continue;
  const fallback:string[]=[];for(let i=1;i<a.length;i++)(rows.get(a[i-1])??fallback).push(a[i]);
  const pack=(q:string[])=>q.length?q.join(' '):null;
  const folded=JSON.stringify([a[0],pack(fallback),[...rows].map(([key,q])=>[key,pack(q)])]);if(folded.length>DIADOCHI_CAP||plans.some(p=>p.folded===folded))continue;
  if(diadochiUndo(folded)!==source)throw Error('DIADOCHI inverse');const message=DIADOCHI_KEY+folded;
  plans.push({contexts:rows.size,folded,message,tokens:countTokens(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.contexts-b.contexts);
}
export function diadochiRead(message:string,parent:(s:string)=>string=s=>s) {
 if(message.length>DIADOCHI_CAP+1000||!isUtf8TransportStable(message)||!message.startsWith(DIADOCHI_KEY))throw Error('DIADOCHI wire');return diadochiUndo(parent(message.slice(DIADOCHI_KEY.length)));
}
export function diadochiFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base') {
 domain(source);if(incumbent.length>DIADOCHI_CAP+1000||!isUtf8TransportStable(incumbent)||incumbent.startsWith(DIADOCHI_KEY)||readIncumbent(incumbent)!==source)throw Error('DIADOCHI incumbent');
 let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const plans=diadochiPlans(source,enc);
 const admit=(message:string,reader:(s:string)=>string)=>{try{if(message.length>DIADOCHI_CAP+1000||!isUtf8TransportStable(message))return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&diadochiRead(message,reader)===source)best={...best,message,tokens,applied:true};}catch{/* Keep verified fallback. */}};
 for(const p of plans)admit(p.message,s=>s);
 if(plans.length){best.parentCalls++;try{admit(DIADOCHI_KEY+encodeParent(plans[0].folded),readParent);}catch{/* Keep verified fallback. */}}
 return best;
}
