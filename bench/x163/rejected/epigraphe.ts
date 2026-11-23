// REJECTED: duplicates ENTHYMEME/EPAGOGE; retained only as failed research artifact.
/** X163 EPIGRAPHE: derive exact Markdown fragment destinations from retained labels.
 * Textual syntax, not a Markdown renderer or a universal GitHub slug algorithm.
 * Optional; complete-message selector pays for its instructions and parent.
 */
import {countTokens,type EncodingName} from '../../../src/lib/omega/bpe';
import {isUtf8TransportStable} from '../../../src/lib/omega/utf8-wire';
export const EPIGRAPHE_KEY='Decode first. In [label](^) links, replace ^ with # followed by label lowercased, deleting all characters except a-z, 0-9, spaces, _ and -, then replacing each space with -. Preserve everything else; print only.\n';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('EPIGRAPHE domain');}
function slug(s:string){return s.toLowerCase().replace(/[^a-z0-9 _-]/g,'').replace(/ /g,'-');}
const links=()=>/\[([^\[\]\r\n]{1,500})\]\(#([a-z0-9_-]+)\)/g;
const markers=()=>/\[([^\[\]\r\n]{1,500})\]\(\^\)/g;
function ascii(s:string){return /^[\x20-\x7e]+$/.test(s);}
export function epigrapheUndo(folded:string){
 domain(folded);const result=folded.replace(markers(),(_whole,label:string)=>{
  if(!ascii(label)||!slug(label))throw Error('EPIGRAPHE label');return `[${label}](#${slug(label)})`;
 });domain(result);return result;
}
export function epigraphePlan(source:string){try{
 domain(source);if(source.includes('](^)'))return null;let sites=0;
 const folded=source.replace(links(),(whole,label:string,target:string)=>{
  if(!ascii(label)||slug(label)!==target)return whole;sites++;return `[${label}](^)`;
 });if(!sites||epigrapheUndo(folded)!==source)return null;return {folded,sites};
 }catch{return null;}}
export function epigrapheRead(message:string,parent:(s:string)=>string){domain(message);if(!message.startsWith(EPIGRAPHE_KEY))throw Error('EPIGRAPHE contract');return epigrapheUndo(parent(message.slice(EPIGRAPHE_KEY.length)));}
export function epigrapheFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(readIncumbent(incumbent)!==source)throw Error('EPIGRAPHE incumbent');
 let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const p=epigraphePlan(source);if(!p)return best;
 const admit=(message:string,reader:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&epigrapheRead(message,reader)===source)best={...best,message,tokens,applied:true};}catch{/* Refuse invalid candidate. */}};
 admit(EPIGRAPHE_KEY+p.folded,s=>s);best.parentCalls=1;try{admit(EPIGRAPHE_KEY+encodeParent(p.folded),readParent);}catch{/* Retain verified incumbent/direct. */}return best;
}
