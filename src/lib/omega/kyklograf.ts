/** X176 KYKLOGRAF: blockwise bijective word-space BWT.
 * Classical Lyndon-factor/BBWT ancestry, not a new mathematical transform.
 * Unlike STROFOS, cycles span fields and source order is recovered from LF
 * cycles, not paid per-word orientations. Unlike ordinary BWT no primary index.
 * Experimental/unwired. Executable inverse is NOT native-model validation.
 */
import {countTokensExact,type EncodingName} from './bpe';
export const KYKLOGRAF_CAP=50000;
export const KYKLOGRAF_WIDTHS=[32,128,512] as const;
function domain(s:string){if(s.length>KYKLOGRAF_CAP||/[^\x00-\x7f]/.test(s))throw Error('KYKLOGRAF ASCII domain');}
function width(n:number){if(!KYKLOGRAF_WIDTHS.includes(n as 32|128|512))throw Error('KYKLOGRAF block width');}
const compare=(a:string[],b:string[])=>{for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])return a[i]<b[i]?-1:1;return a.length-b.length;};
/** Duval factorization in nonincreasing lexicographic order. */
export function kyklografFactors(a:string[]){const out:string[][]=[];let i=0;while(i<a.length){let j=i+1,k=i;while(j<a.length&&a[k]<=a[j]){k=a[k]<a[j]?i:k+1;j++;}while(i<=k){out.push(a.slice(i,i+j-k));i+=j-k;}}return out;}
function block(a:string[]){const rotations:{word:string[];at:number}[]=[];for(const w of kyklografFactors(a))for(let at=0;at<w.length;at++)rotations.push({word:w,at});rotations.sort((a,b)=>{for(let i=0;i<a.word.length+b.word.length;i++){const x=a.word[(a.at+i)%a.word.length],y=b.word[(b.at+i)%b.word.length];if(x!==y)return x<y?-1:1;}return 0;});return rotations.map(r=>r.word[(r.at+r.word.length-1)%r.word.length]);}
export function kyklografBlockUndo(last:string[]){
 if(last.length>512)throw Error('KYKLOGRAF block cap');const order=last.map((_,i)=>i).sort((a,b)=>last[a]<last[b]?-1:last[a]>last[b]?1:a-b),lf=new Array<number>(last.length);order.forEach((j,i)=>lf[j]=i);const seen=new Set<number>(),factors:string[][]=[];
 for(let i=0;i<last.length;i++){if(seen.has(i))continue;const cycle:string[]=[];let j=i;while(!seen.has(j)){seen.add(j);cycle.push(last[j]);j=lf[j];}if(j!==i)throw Error('KYKLOGRAF cycle');cycle.reverse();let best=cycle;for(let k=1;k<cycle.length;k++){const r=cycle.slice(k).concat(cycle.slice(0,k));if(compare(r,best)<0)best=r;}factors.push(best);}
 return factors.sort((a,b)=>-compare(a,b)).flat();
}
export function kyklografTransform(source:string,n:number,inverse=false){domain(source);width(n);const fields=source.split(' '),out:string[]=[];for(let i=0;i<fields.length;i+=n)out.push(...(inverse?kyklografBlockUndo(fields.slice(i,i+n)):block(fields.slice(i,i+n))));const result=out.join(' ');domain(result);return result;}
export function kyklografKey(n:number){width(n);return `Decode payload first. Split on ASCII spaces, retaining empty fields. Partition into consecutive groups of ${n} fields; only the last may be shorter. Compare field sequences lexicographically. For each group L, stably sort its indices by field text in ASCII lexicographic order; LF maps each old index to its sorted position. For each LF cycle collect L values, reverse them, and take the lexicographically least cyclic rotation. Sort these cycles in descending lexicographic order and concatenate. Join all fields with ASCII spaces; print only.\n`;}
export function kyklografPlans(source:string,enc:EncodingName='o200k_base'){domain(source);const plans:{n:number;folded:string;message:string;tokens:number}[]=[];for(const n of KYKLOGRAF_WIDTHS){const folded=kyklografTransform(source,n);if(folded===source||plans.some(p=>p.folded===folded))continue;if(kyklografTransform(folded,n,true)!==source)throw Error('KYKLOGRAF inverse');const message=kyklografKey(n)+folded;plans.push({n,folded,message,tokens:countTokensExact(message,enc)});}return plans.sort((a,b)=>a.tokens-b.tokens||a.n-b.n);}
export function kyklografRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>KYKLOGRAF_CAP+1000)throw Error('KYKLOGRAF wire cap');for(const n of KYKLOGRAF_WIDTHS){const key=kyklografKey(n);if(message.startsWith(key))return kyklografTransform(parent(message.slice(key.length)),n,true);}throw Error('KYKLOGRAF contract');}
export function kyklografFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(readIncumbent(incumbent)!==source)throw Error('KYKLOGRAF incumbent');let best={message:incumbent,tokens:countTokensExact(incumbent,enc),applied:false,parentCalls:0};const plans=kyklografPlans(source,enc);const admit=(message:string,read:(s:string)=>string)=>{try{const tokens=countTokensExact(message,enc);if(tokens<best.tokens&&kyklografRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* verified fallback */}};for(const p of plans)admit(p.message,s=>s);if(plans.length){best.parentCalls++;try{admit(kyklografKey(plans[0].n)+encodeParent(plans[0].folded),readParent);}catch{/* exact fallback */}}return best;
}
