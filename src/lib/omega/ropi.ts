/** X182 ROPI: content-weighted deque bijection, experimental/unwired.
 * Sparre-Andersen rearrangement ancestry, not new mathematics. Unlike FOTIA,
 * no comparison-delimited block rotations: prefix-weight sign chooses an end.
 */
import {countTokensExact,type EncodingName} from './bpe';import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('ROPI domain');}
function params(n:number,k:number){if(![32,128,512].includes(n)||![2,5,10].includes(k))throw Error('ROPI parameters');}
function weight(s:string,k:number){return Array.from(s).length-k;}
export function ropiBlock(a:string[],k:number,inverse=false):string[]{if(![2,5,10].includes(k)||a.length>512||a.some(s=>typeof s!=='string'||s.includes(' ')||!isUtf8TransportStable(s))||a.reduce((n,s)=>n+s.length,Math.max(0,a.length-1))>CAP)throw Error('ROPI block');
 const weights=a.map(s=>weight(s,k));if(inverse){let sum=weights.reduce((x,y)=>x+y,0),lo=0,hi=a.length-1;const out=new Array<string>(a.length);for(let i=a.length-1;i>=0;i--){const j=sum>0?lo++:hi--;out[i]=a[j];sum-=weights[j];}return out;}
 const q=new Array<string>(2*a.length+1);let lo=a.length,hi=lo,sum=0;for(let i=0;i<a.length;i++){sum+=weights[i];if(sum>0)q[--lo]=a[i];else q[hi++]=a[i];}return q.slice(lo,hi);
}
export function ropiTransform(s:string,n:number,k:number,inverse=false){domain(s);params(n,k);const a=s.split(' '),out:string[]=[];for(let i=0;i<a.length;i+=n)out.push(...ropiBlock(a.slice(i,i+n),k,inverse));return out.join(' ');}
export function ropiKey(n:number,k:number){params(n,k);return `Decode payload first. Split on ASCII spaces retaining empty fields; use consecutive groups of ${n} fields, last shorter if needed. A field's weight is its Unicode code-point length minus ${k}. For each group sum its weights. Repeatedly remove the LEFT field if sum>0, otherwise the RIGHT field, subtract its weight, and save it. Reverse the saved fields. Join all groups with ASCII spaces, preserve every other character; print only.\n`;}
export function ropiPlans(source:string,enc:EncodingName='o200k_base'){domain(source);const plans:{n:number;k:number;folded:string;message:string;tokens:number}[]=[];for(const n of [32,128,512])for(const k of [2,5,10]){const folded=ropiTransform(source,n,k);if(folded===source||plans.some(p=>p.folded===folded))continue;const message=ropiKey(n,k)+folded;plans.push({n,k,folded,message,tokens:countTokensExact(message,enc)});}return plans.sort((a,b)=>a.tokens-b.tokens||a.n-b.n||a.k-b.k);}
export function ropiRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>52000||!isUtf8TransportStable(message))throw Error('ROPI wire');for(const n of [32,128,512])for(const k of [2,5,10]){const key=ropiKey(n,k);if(message.startsWith(key))return ropiTransform(parent(message.slice(key.length)),n,k,true);}throw Error('ROPI key');}
