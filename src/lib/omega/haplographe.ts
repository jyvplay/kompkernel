/** X160 HAPLOGRAPHE (single writing): Git envelope recordization.
 * One path serves four syntactic roles in a canonical modified-file header.
 * Classical format entailment/template coding; optional, not a new theorem.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const HAPLOGRAPHE_CAP=50000;
export const HAPLOGRAPHE_KEY='Decode first. Expand !diff P H M lines to:\ndiff --git a/P b/P\nindex H M\n--- a/P\n+++ b/P\nSubstitute literally; otherwise preserve; print only.\n';
const path='[A-Za-z0-9_./@+,-]+';
const record=new RegExp('^!diff ('+path+') ([0-9a-f]{4,64}\\.\\.[0-9a-f]{4,64}) ([0-7]{6})$');
const header=new RegExp('^diff --git a/('+path+') b/('+path+')$');
const index=/^index ([0-9a-f]{4,64}\.\.[0-9a-f]{4,64}) ([0-7]{6})$/;
function domain(s:string){if(s.length>HAPLOGRAPHE_CAP||!isUtf8TransportStable(s))throw Error('HAPLOGRAPHE domain');}
export function haplographeUndo(folded:string):string{
 domain(folded);let size=0;const out=folded.split('\n').map(line=>{
  if(line.startsWith('!diff')){const m=record.exec(line);if(!m)throw Error('HAPLOGRAPHE record');line=`diff --git a/${m[1]} b/${m[1]}\nindex ${m[2]} ${m[3]}\n--- a/${m[1]}\n+++ b/${m[1]}`;}
  size+=line.length+1;if(size>HAPLOGRAPHE_CAP+1)throw Error('HAPLOGRAPHE expansion');return line;
 }).join('\n');domain(out);return out;
}
export function haplographePlan(source:string){try{
 domain(source);const lines=source.split('\n'),out:string[]=[];let records=0;
 if(lines.some(l=>l.startsWith('!diff')))return null;
 for(let i=0;i<lines.length;i++){
  const m=header.exec(lines[i]),h=index.exec(lines[i+1]??'');
  if(m&&m[1]===m[2]&&h&&lines[i+2]===`--- a/${m[1]}`&&lines[i+3]===`+++ b/${m[1]}`){out.push(`!diff ${m[1]} ${h[1]} ${h[2]}`);records++;i+=3;}
  else out.push(lines[i]);
 }
 if(!records)return null;const folded=out.join('\n');if(haplographeUndo(folded)!==source)return null;return {folded,records};
 }catch{return null;}}
export function haplographeRead(message:string,readParent:(s:string)=>string){domain(message);if(!message.startsWith(HAPLOGRAPHE_KEY))throw Error('HAPLOGRAPHE key');return haplographeUndo(readParent(message.slice(HAPLOGRAPHE_KEY.length)));}
export function haplographeCandidate(source:string,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 try{domain(source);domain(parent);const message=HAPLOGRAPHE_KEY+parent;if(haplographeRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc)};}catch{return null;}
}
export function haplographeFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(readIncumbent(incumbent)!==source)throw Error('HAPLOGRAPHE incumbent mismatch');
 const baseTokens=countTokens(incumbent,enc),base={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};const p=haplographePlan(source);if(!p)return base;
 let parent:string;try{parent=encodeParent(p.folded);}catch{return {...base,parentCalls:1};}const c=haplographeCandidate(source,parent,readParent,enc);
 return c&&c.tokens<baseTokens?{...base,...c,applied:true,parentCalls:1}:{...base,parentCalls:1};
}
