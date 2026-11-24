/** X175 STROFOS (turn): lexical conjugacy preconditioning.
 * Each marked ASCII word is replaced by its least cyclic rotation plus a paid
 * orientation. Classical necklace canonicalization, not new mathematics.
 * Unlike KRYPTOLYSIS it permutes positions, not alphabet values; unlike KYKLOS
 * no event counter chooses words. No native-model correctness is asserted.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const STROFOS_CAP=50000;
export const STROFOS_KEY='Decode payload first. Replace each ~N:word (N decimal; word a maximal ASCII-letter run) by word rotated right N letters. Do not rescan replacements. Preserve every other character; print only.\n';
function domain(s:string){if(s.length>STROFOS_CAP||!isUtf8TransportStable(s))throw Error('STROFOS domain');}
export function strofosRotate(word:string,n:number){if(!/^[A-Za-z]{1,48}$/.test(word)||!Number.isInteger(n)||n<0||n>=word.length)throw Error('STROFOS rotation');return n?word.slice(-n)+word.slice(0,-n):word;}
/** Exhaustive bounded orbit minimum, not Booth's linear algorithm. */
export function strofosOrbit(word:string){strofosRotate(word,0);let representative=word,shift=0;for(let i=1;i<word.length;i++){const next=word.slice(i)+word.slice(0,i);if(next<representative){representative=next;shift=i;}}return {representative,shift};}
export function strofosUndo(folded:string){domain(folded);if(folded.replace(/~[1-9][0-9]?:[A-Za-z]+/g,'').includes('~'))throw Error('STROFOS marker');const out=folded.replace(/~([1-9][0-9]?):([A-Za-z]+)/g,(_,n,w)=>strofosRotate(w,+n));domain(out);return out;}
export function strofosPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('~')||source.includes('\ufeff'))return [];const freq=new Map<string,number>();for(const m of source.matchAll(/[A-Za-z]+/g))freq.set(m[0],(freq.get(m[0])??0)+1);
 const orbit=new Map([...freq].filter(([w])=>w.length>=4&&w.length<=48).map(([w])=>[w,strofosOrbit(w)]));const plans:{folded:string;message:string;tokens:number;minLength:number;minFrequency:number;sites:number}[]=[];
 for(const minLength of [4,8])for(const minFrequency of [1,3]){let sites=0;const folded=source.replace(/[A-Za-z]+/g,w=>{const o=orbit.get(w);if(!o||!o.shift||w.length<minLength||freq.get(w)!<minFrequency)return w;sites++;return '~'+o.shift+':'+o.representative;});if(!sites||folded.length>STROFOS_CAP||plans.some(p=>p.folded===folded))continue;if(strofosUndo(folded)!==source)throw Error('STROFOS inverse');const message=STROFOS_KEY+folded;try{plans.push({folded,message,tokens:countTokensExact(message,enc),minLength,minFrequency,sites});}catch(e){if(!String(e).includes('Disallowed special token'))throw e;}}
 return plans.sort((a,b)=>a.tokens-b.tokens||a.sites-b.sites);
}
export function strofosRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>STROFOS_CAP+1000||!isUtf8TransportStable(message)||!message.startsWith(STROFOS_KEY))throw Error('STROFOS wire');return strofosUndo(parent(message.slice(STROFOS_KEY.length)));}
export function strofosFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>STROFOS_CAP+1000||!isUtf8TransportStable(incumbent)||incumbent.startsWith(STROFOS_KEY)||readIncumbent(incumbent)!==source)throw Error('STROFOS incumbent');let best={message:incumbent,tokens:countTokensExact(incumbent,enc),applied:false,parentCalls:0};const plans=strofosPlans(source,enc);
 const admit=(message:string,reader:(s:string)=>string)=>{try{const tokens=countTokensExact(message,enc);if(tokens<best.tokens&&strofosRead(message,reader)===source)best={...best,message,tokens,applied:true};}catch{/* Exact fallback, never normalize. */}};
 for(const p of plans)admit(p.message,s=>s);if(plans.length){best.parentCalls++;try{admit(STROFOS_KEY+encodeParent(plans[0].folded),readParent);}catch{/* Retain incumbent or verified direct plan. */}}return best;
}
