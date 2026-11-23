/** X164 KRYPTOLYSIS: cyclic ASCII-alphabet preconditioning of the parent.
 * Classical Caesar substitution, not an AI invention. No cipher operation was
 * found in the prior 405-module inventory. In-band inverse, no secret key,
 * training, or external dictionary. Experimental optional selector only.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('KRYPTOLYSIS domain');}
function valid(k:number){if(!Number.isInteger(k)||k<1||k>25)throw Error('KRYPTOLYSIS rotation');}
export function kryptolysisKey(k:number){valid(k);return `Decode first, then rotate ASCII letters forward ${k} places in their A-Z or a-z alphabet, wrapping around. Preserve everything else; print only.\n`;}
export function kryptolysisRotate(s:string,k:number){domain(s);valid(k);return s.replace(/[A-Za-z]/g,c=>{const n=c.charCodeAt(0),base=n<91?65:97;return String.fromCharCode(base+(n-base+k)%26);});}
export function kryptolysisPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(!/[A-Za-z]/.test(source))return [];
 return Array.from({length:25},(_,i)=>{const inverse=i+1,folded=kryptolysisRotate(source,26-inverse),contract=kryptolysisKey(inverse);return {inverse,folded,contract,rawTokens:countTokens(contract+folded,enc)};}).sort((a,b)=>a.rawTokens-b.rawTokens||a.inverse-b.inverse);
}
export function kryptolysisRead(message:string,parent:(s:string)=>string){domain(message);const m=/^Decode first, then rotate ASCII letters forward ([1-9]|1[0-9]|2[0-5]) places in their A-Z or a-z alphabet, wrapping around\. Preserve everything else; print only\.\n/.exec(message);if(!m)throw Error('KRYPTOLYSIS contract');return kryptolysisRotate(parent(message.slice(m[0].length)),Number(m[1]));}
export function kryptolysisFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(Array.from({length:25},(_,i)=>kryptolysisKey(i+1)).some(h=>incumbent.startsWith(h))||readIncumbent(incumbent)!==source)throw Error('KRYPTOLYSIS incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0,inverse:0};
 // All 25 direct prices; only the two best raw-ranked representations reach
 // the expensive parent. This bound is deterministic, not global optimality.
 const plans=kryptolysisPlans(source,enc);
 const admit=(message:string,inverse:number,read:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&kryptolysisRead(message,read)===source)best={...best,message,tokens,applied:true,inverse};}catch{/* exact refusal */}};
 for(const p of plans)admit(p.contract+p.folded,p.inverse,s=>s);
 for(const p of plans.slice(0,2)){best.parentCalls++;try{admit(p.contract+encodeParent(p.folded),p.inverse,readParent);}catch{/* retain verified incumbent/direct */}}
 return best;
}
