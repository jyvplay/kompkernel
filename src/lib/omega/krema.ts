/** X137 KREMA (hanging): cursor-aware continuation-line folding.
 * PTYCHE wraps whole paragraphs; this transducer preserves a literal first-line
 * prefix, folds a continuation run into its description, then wraps relative to
 * the current output column and a separately declared continuation margin.
 * Standard layout/predictive-coding genus; repository-scoped extension only.
 * Unwired. Exhaustive bounded (width,indent) trials, greedy decoder wrapping.
 */
import {countTokens,type EncodingName} from './bpe';
import {chironEncode,chironDecode,chironOpsUsed} from './chiron';
import {synarmogeFromFrontier} from './synarmoge';
export const kremaKey=(width:number,indent:number)=>`¶ k=v; expand recursively. On each line replace ~|text by greedy word wrapping to column ${width}, indent continuation lines ${indent} spaces. Print only.\n`;
const valid=(w:number,i:number)=>Number.isInteger(w)&&Number.isInteger(i)&&i>=0&&i<w&&w<=160;
function wrap(prefix:string,body:string,width:number,indent:number):string {
 if(!/^[\x20-\x7e]*$/.test(prefix)||!body||!/^[\x21-\x7e]+(?: [\x21-\x7e]+)*$/.test(body))throw Error('KREMA unsupported text');
 let out=prefix,at=prefix.length,first=true;
 for(const word of body.split(' ')){
  if(!first&&at+1+word.length>width){out+='\n'+' '.repeat(indent)+word;at=indent+word.length;}
  else{out+=(first?'':' ')+word;at+=(first?0:1)+word.length;}
  first=false;
 }
 return out;
}
export function kremaUndo(text:string,width:number,indent:number):string {
 if(!valid(width,indent))throw Error('KREMA bounds');
 return text.split('\n').map(line=>{
  const p=line.indexOf('~|');if(p<0){if(line.includes('~'))throw Error('KREMA stray marker');return line;}
  if(line.indexOf('~',p+1)>=0||line.slice(0,p).includes('~'))throw Error('KREMA repeated marker');
  return wrap(line.slice(0,p),line.slice(p+2),width,indent);
 }).join('\n');
}
export function kremaPlan(text:string,width:number,indent:number){
 if(text.length>50000||text.includes('~')||text.includes('\r')||!valid(width,indent))return null;
 const lines=text.split('\n'),out:string[]=[];let foldedRuns=0,removedLines=0;
 for(let n=0;n<lines.length;){
  const line=lines[n];let end=n+1;
  const continuation=new RegExp(`^ {${indent}}[^ ]`);
  while(end<lines.length&&continuation.test(lines[end]))end++;
  let accepted:string|null=null;
  if(end>n+1&&/^[\x20-\x7e]+$/.test(line)){
   // A first-line label/padding is literal; the last 2+space run delimits prose.
   // A continuation-only first line can have an empty label and an indent prefix.
   const gaps=[...line.matchAll(/ {2,}/g)];
   for(const gap of gaps.reverse()){
    const cut=gap.index!+gap[0].length;if(cut>=line.length)continue;
    const prefix=line.slice(0,cut),body=[line.slice(cut),...lines.slice(n+1,end).map(s=>s.slice(indent))].join(' ');
    try{if(wrap(prefix,body,width,indent)===lines.slice(n,end).join('\n')){accepted=prefix+'~|'+body;break;}}catch{}
   }
  }
  if(accepted!==null){out.push(accepted);foldedRuns++;removedLines+=end-n-1;n=end;}else{out.push(line);n++;}
 }
 const folded=out.join('\n');
 if(!foldedRuns||kremaUndo(folded,width,indent)!==text)return null;
 return {folded,width,indent,foldedRuns,removedLines};
}
export function kremaParameters(text:string):{width:number;indent:number}[]{
 if(text.length>50000)return [];
 const hist=new Map<number,number>();
 for(const line of text.split('\n')){const i=/^ +\S/.exec(line)?.[0].length;if(i&&i>2&&i<=81)hist.set(i-1,(hist.get(i-1)??0)+1);}
 const margins=[...hist].filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,3).map(([i])=>i);
 const plans:{width:number;indent:number;score:number}[]=[];const seen=new Set<string>();
 for(const indent of margins)for(let width=Math.max(40,indent+10);width<=120;width++){
  const plan=kremaPlan(text,width,indent);if(plan&&!seen.has(plan.folded)){seen.add(plan.folded);plans.push({width,indent,score:plan.removedLines});}
 }
 // Exact-coverage ranking only, not a claim that raw savings predict parent price.
 return plans.sort((a,b)=>b.score-a.score||a.width-b.width||a.indent-b.indent).slice(0,3).map(({width,indent})=>({width,indent}));
}
/** Overflow is a self-delimiting trigger: a folded run must exceed width, so
 * no per-run marker is needed. Original long lines alone need literal escapes.
 * This changes the invocation mechanism, not just header wording.
 */
export const kremaOverflowKey=(width:number,indent:number,escapes:boolean)=>`¶ k=v; expand recursively. ${escapes?'Lines starting ~|: remove ~|; otherwise ':''}lines longer than ${width}: greedy-wrap text after the last 2+space gap, indent continuations ${indent} spaces. Print only.\n`;
export function kremaOverflowUndo(text:string,width:number,indent:number,escapes=true):string {
 if(!valid(width,indent))throw Error('KREMA bounds');
 return text.split('\n').map(line=>{
  if(escapes&&line.startsWith('~|'))return line.slice(2);
  if(line.includes('~'))throw Error('KREMA unexpected escape');
  if(line.length<=width)return line;
  const gaps=[...line.matchAll(/ {2,}/g)],last=gaps[gaps.length-1];
  if(!last)throw Error('KREMA missing gap');
  const at=last.index!+last[0].length;return wrap(line.slice(0,at),line.slice(at),width,indent);
 }).join('\n');
}
export function kremaOverflowPlan(text:string,width:number,indent:number){
 const plan=kremaPlan(text,width,indent);if(!plan)return null;
 let escapes=0;
 const folded=plan.folded.split('\n').map(line=>{
  if(line.includes('~|'))return line.replace('~|','');
  if(line.length>width){escapes++;return '~|'+line;}return line;
 }).join('\n');
 if(kremaOverflowUndo(folded,width,indent,escapes>0)!==text)return null;
 return {...plan,folded,escapes};
}
export function kremaFromFrontier(text:string,base:string,encodeParent:(s:string)=>string,decodeParent:(s:string)=>string,enc:EncodingName='o200k_base',mode:'marked'|'overflow'='overflow'){
 let best=base,tokens=countTokens(base,enc),picked:ReturnType<typeof kremaPlan>|ReturnType<typeof kremaOverflowPlan>=null,trials=0;
 for(const {width,indent} of kremaParameters(text)){
  const plan=mode==='overflow'?kremaOverflowPlan(text,width,indent):kremaPlan(text,width,indent);if(!plan)continue;
  const parent=encodeParent(plan.folded);trials++;
  const escapes='escapes'in plan&&typeof plan.escapes==='number'&&plan.escapes>0;
  const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>parent.startsWith(p+'§'));
  if(!pre)continue;const key=mode==='overflow'?kremaOverflowKey(width,indent,escapes):kremaKey(width,indent);
  const message=key+parent.slice(pre.length),n=countTokens(message,enc);
  if(n>=tokens)continue;
  try{const layer=decodeParent(parent);if((mode==='overflow'?kremaOverflowUndo(layer,width,indent,escapes):kremaUndo(layer,width,indent))!==text)continue;}catch{continue;}
  best=message;tokens=n;picked=plan;
 }
 return picked?{message:best,tokens,trials,...picked}:null;
}
/** Standalone fast arm. Does NOT compute or promise dominance over TAGSTACK.
 * One top-coverage layout, up to two alphabets, then existing joint grammar
 * refinement. Caller may select this explicit trade-off; never wired implicitly.
 */
export function kremaFast(text:string,enc:EncodingName='o200k_base'){
 const p=kremaParameters(text)[0];if(!p)return null;
 const plan=kremaOverflowPlan(text,p.width,p.indent);if(!plan||plan.removedLines<10)return null;
 let message=text,tokens=countTokens(text,enc),trials=0;
 const scripts:(string|undefined)[]=[undefined];
 for(let j=0;j<scripts.length;j++){
  const parent=chironEncode(plan.folded,enc,{noBlocks:true,script:scripts[j]});trials++;
  const ops=chironOpsUsed(parent.wire);
  if(j===0)scripts.push(ops.script?.name==='arabic'?'cyrillic':'arabic');
  if(ops.rep||ops.fill||ops.range||ops.split||chironDecode(parent.wire)!==plan.folded)continue;
  let wire=kremaOverflowKey(p.width,p.indent,plan.escapes>0)+parent.wire;
  const refined=synarmogeFromFrontier({message:wire,messageTokens:countTokens(wire,enc),decoded:plan.folded},plan.folded,enc);
  if(refined)wire=refined.message;
  const n=countTokens(wire,enc);
  if(n>=tokens)continue;
  try{if(kremaOverflowUndo(chironDecode(wire.slice(wire.indexOf('§'))),p.width,p.indent,plan.escapes>0)!==text)continue;}catch{continue;}
  message=wire;tokens=n;
 }
 return message===text?null:{message,tokens,trials,...plan};
}
