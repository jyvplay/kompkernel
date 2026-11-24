/** X166 SYMFRAZ: decoder-visible context collation of numeric side streams.
 * Experimental/unwired. STC (Du et al., 2026) is explicit prior art; this is
 * a textual, variable-width, one-hole-per-run adaptation, not an AI invention.
 * Unlike PSIFIDA, no digit-plane transpose or equal-width selection is used.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const SYMFRAZ_CAP=50000;
export function symfrazKey(k:number){
 if(![1,4,12].includes(k))throw Error('SYMFRAZ context');
 return `Decode payload first. First line: space-separated digit strings. Remaining text: skeleton. Sort its ~ holes by the preceding ${k} Unicode code points, then following ${k}, lexicographically by code-point value (shorter prefixes first); ties stay left-to-right. Assign digit strings in that order, replace holes, preserve everything else; print only.\n`;
}
function domain(s:string){if(s.length>SYMFRAZ_CAP||!isUtf8TransportStable(s))throw Error('SYMFRAZ domain');}
function cmp(a:string[],b:string[]){for(let i=0;i<Math.min(a.length,b.length);i++){const d=a[i].codePointAt(0)!-b[i].codePointAt(0)!;if(d)return d;}return a.length-b.length;}
/** All keys come from the frozen skeleton, never partly restored output. */
function order(s:string,k:number){const a=[...s];return a.flatMap((c,i)=>c==='~'?[{i,left:a.slice(Math.max(0,i-k),i),right:a.slice(i+1,i+1+k)}]:[]).sort((a,b)=>cmp(a.left,b.left)||cmp(a.right,b.right)||a.i-b.i).map(x=>x.i);}
export function symfrazUndo(folded:string,k:number):string{
 domain(folded);symfrazKey(k);const at=folded.indexOf('\n');if(at<0)throw Error('SYMFRAZ frame');
 const head=folded.slice(0,at);if(!/^[0-9]+(?: [0-9]+)*$/.test(head))throw Error('SYMFRAZ digits');
 const values=head.split(' '),skeleton=folded.slice(at+1),indices=order(skeleton,k);
 if(indices.length!==values.length)throw Error('SYMFRAZ arity');
 const a=[...skeleton];for(let j=0;j<indices.length;j++)a[indices[j]]=values[j];
 const result=a.join('');domain(result);return result;
}
export function symfrazPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('~'))return [];
 const plans:{k:number;minDigits:number;sites:number;folded:string;contract:string;message:string;tokens:number}[]=[];
 for(const minDigits of [1,4]){
  const values:string[]=[];const skeleton=source.replace(/[0-9]+/g,v=>{if(v.length<minDigits)return v;values.push(v);return '~';});if(values.length<2)continue;
  const natural=new Map<number,string>();let n=0;[...skeleton].forEach((c,i)=>{if(c==='~')natural.set(i,values[n++]);});
  for(const k of [1,4,12]){
   const folded=order(skeleton,k).map(i=>natural.get(i)!).join(' ')+'\n'+skeleton;if(folded.length>SYMFRAZ_CAP)continue;
   if(symfrazUndo(folded,k)!==source)throw Error('SYMFRAZ inverse');const contract=symfrazKey(k),message=contract+folded;
   if(!plans.some(p=>p.message===message))plans.push({k,minDigits,sites:values.length,folded,contract,message,tokens:countTokens(message,enc)});
  }
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.k-b.k||a.minDigits-b.minDigits);
}
export function symfrazRead(message:string,readParent:(s:string)=>string=s=>s){
 if(message.length>SYMFRAZ_CAP+1000||!isUtf8TransportStable(message))throw Error('SYMFRAZ wire');
 for(const k of [1,4,12]){const key=symfrazKey(k);if(message.startsWith(key))return symfrazUndo(readParent(message.slice(key.length)),k);}throw Error('SYMFRAZ contract');
}
/** A caller supplies its actual complete frontier, not an invented cheaper base.
 * At most one full parent call. This is a finite screen, not greedy parsing. */
export function symfrazFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>SYMFRAZ_CAP+1000||!isUtf8TransportStable(incumbent)||[1,4,12].some(k=>incumbent.startsWith(symfrazKey(k)))||readIncumbent(incumbent)!==source)throw Error('SYMFRAZ incumbent');
 let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const plans=symfrazPlans(source,enc);
 const admit=(message:string,read:(s:string)=>string)=>{try{if(message.length>SYMFRAZ_CAP+1000||!isUtf8TransportStable(message))return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&symfrazRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* exact refusal */}};
 for(const p of plans)admit(p.message,s=>s);
 if(plans.length){best.parentCalls++;try{admit(plans[0].contract+encodeParent(plans[0].folded),readParent);}catch{/* verified fallback */}}
 return best;
}
