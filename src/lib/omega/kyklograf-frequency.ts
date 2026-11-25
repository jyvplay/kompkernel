/** X177 follow-up: histogram-derived alphabet BBWT codec.
 * New experimental codec entry, explicitly a KYKLOGRAF variant, NOT a claim of
 * a mechanism distinct from BBWT. Every block's histogram survives the transform;
 * both sides derive the same total order, so no rank dictionary is transmitted.
 * Classical alphabet-order optimization ancestry; native decoding unverified.
 */
import {kyklografTransform,kyklografKey,KYKLOGRAF_WIDTHS,KYKLOGRAF_CAP} from './kyklograf';
import {countTokensExact,type EncodingName} from './bpe';
export type FrequencyOrder='increasing'|'decreasing';
function domain(s:string){if(s.length>KYKLOGRAF_CAP||/[^\x00-\x7f]/.test(s))throw Error('frequency BBWT domain');}
function valid(n:number,order:FrequencyOrder){if(!KYKLOGRAF_WIDTHS.includes(n as 32|128|512)||!['increasing','decreasing'].includes(order))throw Error('frequency BBWT spec');}
export function frequencyTransform(s:string,n:number,order:FrequencyOrder,inverse=false){domain(s);valid(n,order);const fields=s.split(' '),out:string[]=[];
 for(let i=0;i<fields.length;i+=n){const block=fields.slice(i,i+n),counts=new Map<string,number>();for(const f of block)counts.set(f,(counts.get(f)??0)+1);
  const alphabet=[...counts.keys()].sort((a,b)=>(order==='increasing'?1:-1)*(counts.get(a)!-counts.get(b)!)||(a<b?-1:a>b?1:0));const ids=new Map(alphabet.map((f,j)=>[f,j.toString(16).padStart(4,'0')]));
  const transformed=kyklografTransform(block.map(f=>ids.get(f)!).join(' '),n,inverse).split(' ');
  out.push(...transformed.map(id=>{const f=alphabet[parseInt(id,16)];if(f===undefined)throw Error('frequency BBWT rank');return f;}));
 }const result=out.join(' ');domain(result);return result;
}
export function frequencyKey(n:number,order:FrequencyOrder){valid(n,order);return kyklografKey(n).replace('Compare field sequences lexicographically.',`Within each group, order distinct fields by ${order} occurrence count, breaking ties by ASCII text order. Use this field order in all lexicographic comparisons.`).replace('by field text in ASCII lexicographic order','by that field order');}
export function frequencyPlans(s:string,enc:EncodingName='o200k_base'){domain(s);const plans:{n:number;order:FrequencyOrder;folded:string;message:string;tokens:number}[]=[];for(const n of KYKLOGRAF_WIDTHS)for(const order of ['increasing','decreasing'] as const){const folded=frequencyTransform(s,n,order);if(folded===s)continue;if(frequencyTransform(folded,n,order,true)!==s)throw Error('frequency BBWT inverse');const message=frequencyKey(n,order)+folded;plans.push({n,order,folded,message,tokens:countTokensExact(message,enc)});}return plans.sort((a,b)=>a.tokens-b.tokens||a.n-b.n||a.order.localeCompare(b.order));}
export function frequencyRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>KYKLOGRAF_CAP+1500)throw Error('frequency BBWT wire cap');for(const n of KYKLOGRAF_WIDTHS)for(const order of ['increasing','decreasing'] as const){const key=frequencyKey(n,order);if(message.startsWith(key))return frequencyTransform(parent(message.slice(key.length)),n,order,true);}throw Error('frequency BBWT contract');}
/** Tournament over all emitted plans; parent calls count even when candidates lose.
 * Parent output cached only within this call by exact transformed string. */
export function frequencyFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(readIncumbent(incumbent)!==source)throw Error('frequency BBWT incumbent');let best={message:incumbent,tokens:countTokensExact(incumbent,enc),applied:false,parentCalls:0};const parents=new Map<string,string>();
 const admit=(message:string,read:(s:string)=>string)=>{try{const tokens=countTokensExact(message,enc);if(tokens<best.tokens&&frequencyRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* exact refusal */}};
 for(const p of frequencyPlans(source,enc)){admit(p.message,s=>s);try{let parent=parents.get(p.folded);if(parent===undefined){best.parentCalls++;parent=encodeParent(p.folded);parents.set(p.folded,parent);}admit(frequencyKey(p.n,p.order)+parent,readParent);}catch{/* complete incumbent retained */}}return best;
}
