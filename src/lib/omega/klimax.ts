/** X159 KLIMAX (ladder): differential Dewey/outline-label stack.
 * Classical hierarchical counter coding; experimental, not on default TAGSTACK.
 * No native-model decoding claim. No external schema or vocabulary.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const KLIMAX_CAP=50000;
export const KLIMAX_KEY='Decode first. Scan line prefixes after spaces and optional 1-6 hashes plus a space. Number prefixes have 1-12 positive decimal components, each 1-6 digits without leading zeros, dot-separated; they set state (initially empty). @D truncates state to D components and increments the last, or appends .1 if one deeper; emit the resulting number. Prefixes end before optional trailing dot then space/tab/end. Preserve everything else. Print only.\n';
const prefix=/^( *)(?:#{1,6} )?/;
const number=/^([1-9][0-9]{0,5}(?:\.[1-9][0-9]{0,5}){0,11})(?=\.?[ \t]|\.?\r?$)/;
const marker=/^@([1-9]|1[0-2])(?=\.?[ \t]|\.?\r?$)/;
function domain(s:string){if(s.length>KLIMAX_CAP||!isUtf8TransportStable(s))throw Error('KLIMAX domain');}
function next(previous:number[],depth:number):number[]{
 if(depth<1||depth>12||depth>previous.length+1)throw Error('KLIMAX depth');
 if(depth===previous.length+1)return [...previous,1];
 const value=previous.slice(0,depth);if(++value[depth-1]>999999)throw Error('KLIMAX component bound');return value;
}
export function klimaxUndo(folded:string):string{
 domain(folded);let previous:number[]=[];let size=0;
 const lines=folded.split('\n').map(line=>{
  const pre=prefix.exec(line)![0],body=line.slice(pre.length);
  if(body.startsWith('@')){const m=marker.exec(body);if(!m)throw Error('KLIMAX marker');previous=next(previous,Number(m[1]));line=pre+previous.join('.')+body.slice(m[0].length);}
  else {const m=number.exec(body);if(m)previous=m[1].split('.').map(Number);}
  size+=line.length+1;if(size>KLIMAX_CAP+1)throw Error('KLIMAX expansion');return line;
 });const source=lines.join('\n');domain(source);return source;
}
export function klimaxPlan(source:string){try{
 domain(source);let previous:number[]=[],sites=0;
 const folded=source.split('\n').map(line=>{
  const pre=prefix.exec(line)![0],body=line.slice(pre.length);if(body.startsWith('@'))throw Error('KLIMAX collision');
  const m=number.exec(body);if(!m)return line;const value=m[1].split('.').map(Number);let predicted:number[]|null=null;try{predicted=next(previous,value.length);}catch{/* literal reset */}
  previous=value;
  if(predicted?.join('.')===m[1]&&m[1].length>2){sites++;return pre+'@'+value.length+body.slice(m[1].length);}return line;
 }).join('\n');if(!sites||klimaxUndo(folded)!==source)return null;return {folded,sites};
 }catch{return null;}}
export function klimaxRead(message:string,readParent:(s:string)=>string){domain(message);if(!message.startsWith(KLIMAX_KEY))throw Error('KLIMAX envelope');return klimaxUndo(readParent(message.slice(KLIMAX_KEY.length)));}
export function klimaxCandidate(source:string,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 try{domain(source);domain(parent);const message=KLIMAX_KEY+parent;if(klimaxRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc)};}catch{return null;}
}
/** Preserve supplied complete incumbent unless a message-only inverse and full price pass. */
export function klimaxFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(readIncumbent(incumbent)!==source)throw Error('KLIMAX incumbent mismatch');
 const baseTokens=countTokens(incumbent,enc),base={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};const p=klimaxPlan(source);if(!p)return base;
 let parent:string;try{parent=encodeParent(p.folded);}catch{return {...base,parentCalls:1};}const c=klimaxCandidate(source,parent,readParent,enc);
 return c&&c.tokens<baseTokens?{...base,...c,applied:true,parentCalls:1}:{...base,parentCalls:1};
}
