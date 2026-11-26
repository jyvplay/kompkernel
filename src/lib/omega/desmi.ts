/** X186 DESMI: shared overlap reservoir with interval-addressed dictionary.
 * Experimental/unwired. Classical shortest-superstring packing, not a new
 * information-theoretic primitive or a proved native-chat decoder.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const DESMI_KEY='Decode payload first. JSON [pool,ranges,body]. Each [start,length] range names a substring of the ASCII pool, using zero-based character positions; ranges are numbered from 1. Replace each ~N; in body once with range N, without rescanning. Preserve everything else; print only.\n';
export const DESMI_OUTER_KEY='JSON [pool,ranges,body]. Each [start,length] range names a substring of the ASCII pool, using zero-based character positions; ranges are numbered from 1. Replace each ~N; in body once with range N, without rescanning. Then decode the restored message by its instructions; print only its result.\n';
const CAP=50000,FRAME=220000,MAX=96,WORD=/[A-Za-z][A-Za-z0-9_/-]{3,127}/g;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('DESMI domain');}
export function desmiPool(words:string[]){
 if(words.length>MAX||words.some(w=>!w.length||w.length>128||!/^[\x20-\x7e]+$/.test(w)))throw Error('DESMI words');
 let parts=[...new Set(words)].filter((w,_,a)=>!a.some(v=>v!==w&&v.includes(w)));
 while(parts.length>1){let bi=0,bj=1,bn=0;for(let i=0;i<parts.length;i++)for(let j=0;j<parts.length;j++)if(i!==j){for(let n=Math.min(128,parts[i].length,parts[j].length);n>bn;n--)if(parts[i].endsWith(parts[j].slice(0,n))){bi=i;bj=j;bn=n;break;}}
  const joined=parts[bi]+parts[bj].slice(bn);parts=parts.filter((_,i)=>i!==bi&&i!==bj);parts.push(joined);
 }return parts[0]??'';
}
export function desmiUndo(folded:string){
 if(folded.length>FRAME||!isUtf8TransportStable(folded))throw Error('DESMI frame');const x:unknown=JSON.parse(folded);
 if(!Array.isArray(x)||x.length!==3)throw Error('DESMI tuple');const [pool,ranges,body]=x;
 if(typeof pool!=='string'||pool.length>MAX*128||!/^[\x20-\x7e]*$/.test(pool)||!Array.isArray(ranges)||ranges.length>MAX||typeof body!=='string'||body.length>CAP)throw Error('DESMI fields');
 const dict:string[]=ranges.map((r:unknown)=>{if(!Array.isArray(r)||r.length!==2||!r.every(Number.isSafeInteger)||r[0]<0||r[1]<1||r[1]>128||r[0]+r[1]>pool.length)throw Error('DESMI range');return pool.slice(r[0],r[0]+r[1]);});
 let size=0,last=0,out='';const re=/~([1-9][0-9]?);/g;for(const m of body.matchAll(re)){const literal=body.slice(last,m.index);if(literal.includes('~')||+m[1]>dict.length)throw Error('DESMI reference');const next=literal+dict[+m[1]-1];size+=next.length;if(size>CAP)throw Error('DESMI expansion');out+=next;last=m.index!+m[0].length;}
 const tail=body.slice(last);if(tail.includes('~'))throw Error('DESMI syntax');out+=tail;domain(out);return out;
}
export function desmiPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('~'))return [];const counts=new Map<string,number>();for(const m of source.matchAll(WORD))counts.set(m[0],(counts.get(m[0])??0)+1);
 const plans:{minLength:number;frequency:number;folded:string;message:string;tokens:number}[]=[];
 for(const minLength of [8,12,20])for(const frequency of [2,3]){const words=[...counts].filter(([w,n])=>w.length>=minLength&&n>=frequency).sort((a,b)=>(b[0].length*(b[1]-1))-(a[0].length*(a[1]-1))||a[0].localeCompare(b[0])).slice(0,MAX).map(x=>x[0]);if(!words.length)continue;
 const pool=desmiPool(words),ids=new Map(words.map((w,i)=>[w,i+1])),ranges=words.map(w=>[pool.indexOf(w),w.length]);const body=source.replace(WORD,w=>ids.has(w)?`~${ids.get(w)};`:w);const folded=JSON.stringify([pool,ranges,body]);if(plans.some(p=>p.folded===folded))continue;if(desmiUndo(folded)!==source)throw Error('DESMI inverse');const message=DESMI_KEY+folded;plans.push({minLength,frequency,folded,message,tokens:countTokensExact(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens);
}
export function desmiRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>FRAME+2000)throw Error('DESMI wire');if(message.startsWith(DESMI_KEY))return desmiUndo(parent(message.slice(DESMI_KEY.length)));if(message.startsWith(DESMI_OUTER_KEY))return parent(desmiUndo(message.slice(DESMI_OUTER_KEY.length)));throw Error('DESMI key');}
