/** X162 AKROSTICHIS: redundant glossary-label projection.
 * The definition's uppercase ASCII letters/digits entail the exact label.
 * Not semantic acronym guessing or an external acronym dictionary. Optional.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const AKROSTICHIS_KEY='Decode first. Replace each line consisting of ^ with the uppercase ASCII letters and digits from the next line, stopping before its first " [" if present. Preserve everything else; print only.\n';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('AKROSTICHIS domain');}
function label(line:string){if(!line.startsWith('    '))throw Error('AKROSTICHIS definition');const at=line.indexOf(' [');const p=at<0?line:line.slice(0,at);const value=(p.match(/[A-Z0-9]/g)??[]).join('');if(!/^[A-Z0-9]{2,16}$/.test(value))throw Error('AKROSTICHIS projection');return value;}
export function akrostichisUndo(folded:string){domain(folded);const a=folded.split('\n');for(let i=0;i<a.length;i++)if(a[i]==='^'){if(i+1>=a.length)throw Error('AKROSTICHIS missing definition');a[i]=label(a[i+1]);}const out=a.join('\n');domain(out);return out;}
export function akrostichisPlan(source:string){try{domain(source);const a=source.split('\n');if(a.includes('^'))return null;let sites=0;for(let i=0;i+1<a.length;i++)if(/^[A-Z0-9]{2,16}$/.test(a[i])){try{if(label(a[i+1])===a[i]){a[i]='^';sites++;}}catch{/* Nonmatching definitions remain literal. */}}if(!sites)return null;const folded=a.join('\n');if(akrostichisUndo(folded)!==source)return null;return {folded,sites};}catch{return null;}}
export function akrostichisRead(message:string,parent:(s:string)=>string){domain(message);if(!message.startsWith(AKROSTICHIS_KEY))throw Error('AKROSTICHIS contract');return akrostichisUndo(parent(message.slice(AKROSTICHIS_KEY.length)));}
export function akrostichisFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(readIncumbent(incumbent)!==source)throw Error('AKROSTICHIS incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const p=akrostichisPlan(source);if(!p)return best;
 const admit=(message:string,reader:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&akrostichisRead(message,reader)===source)best={...best,message,tokens,applied:true};}catch{/* Refuse. */}};
 admit(AKROSTICHIS_KEY+p.folded,s=>s);best.parentCalls=1;try{admit(AKROSTICHIS_KEY+encodeParent(p.folded),readParent);}catch{/* Retain verified incumbent/direct. */}return best;
}
