/** KENOMA (X153): implicit close events in empty JSON lines.
 * Experimental, unwired. Unlike HOMOSEMA's explicit generic closer, remove
 * standalone closers completely: the resulting whitespace/comma-only line is
 * the event, while the live JSON stack supplies the missing terminal type.
 * Not a new pushdown/erasure principle; narrow repository application.
 * Collision-free restricted domain; no whitespace normalization or reprinting.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const KENOMA_CAP=50000;
export const KENOMA_KEY='After decoding, on whitespace-only or comma-only lines insert the matching JSON closer after indentation. Ignore the empty segment after a final newline; preserve everything else. Print only.\n';
export const KENOMA_FUSED_KEY='¶ k=v; expand repeatedly. On whitespace-only or comma-only lines insert the matching JSON closer after indentation, excluding the empty segment after a final newline. Print only.\n';
const PARENT_KEY='¶ k=v. expand repeatedly; print only.\n';
const hole=/^[ \t]*,?$/;
function domain(s:string){if(s.length>KENOMA_CAP||!isUtf8TransportStable(s)||s.replace(/\r\n/g,'').includes('\r'))throw Error('KENOMA domain');}
function walk(line:string,stack:string[]){
 let quoted=false,escaped=false;
 for(const c of line){
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}
  if(c==='{'||c==='['){stack.push(c==='{'?'}':']');if(stack.length>128)throw Error('KENOMA depth');}
  else if(c==='}'||c===']'){if(stack.pop()!==c)throw Error('KENOMA mismatched closer');}
 }
 if(quoted)throw Error('KENOMA unterminated string line');
}
export function kenomaUndo(folded:string):string{
 domain(folded);const parts=folded.split(/(\r\n|\n)/),stack:string[]=[];let size=0;
 for(let i=0;i<parts.length;i+=2){let line=parts[i]!;
  if(i===parts.length-1&&line===''&&i>0)continue;
  if(hole.test(line)){const closer=stack[stack.length-1];if(!closer)throw Error('KENOMA empty-stack hole');const at=/^[ \t]*/.exec(line)![0].length;line=line.slice(0,at)+closer+line.slice(at);parts[i]=line;}
  walk(line,stack);size+=line.length+(parts[i+1]?.length??0);if(size>KENOMA_CAP)throw Error('KENOMA expansion cap');
 }
 if(stack.length)throw Error('KENOMA unclosed');const source=parts.join('');JSON.parse(source);return source;
}
export function kenomaPlan(source:string){
 try{domain(source);JSON.parse(source);}catch{return null;}
 const parts=source.split(/(\r\n|\n)/),stack:string[]=[];let sites=0;
 try{for(let i=0;i<parts.length;i+=2){const line=parts[i]!;
  if(i===parts.length-1&&line===''&&i>0)continue;
  if(hole.test(line))return null; // original empty/comma-only lines are ambiguous
  walk(line,stack);
  // Preserve a final unterminated line: otherwise erasure aliases EOF.
  if(i+1<parts.length&&/^[ \t]*[}\]],?$/.test(line)){parts[i]=line.replace(/[}\]]/,'');sites++;}
 }}catch{return null;}
 if(!sites||stack.length)return null;const folded=parts.join('');
 try{if(kenomaUndo(folded)!==source)return null;}catch{return null;}
 return {folded,sites};
}
export function kenomaRead(message:string,readParent:(s:string)=>string=(s=>s)):string{
 if(message.startsWith(KENOMA_FUSED_KEY))return kenomaUndo(readParent(PARENT_KEY+message.slice(KENOMA_FUSED_KEY.length)));
 if(message.startsWith(KENOMA_KEY))return kenomaUndo(readParent(message.slice(KENOMA_KEY.length)));
 throw Error('KENOMA envelope');
}
export function kenomaCandidate(source:string,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 const plan=kenomaPlan(source);if(!plan)return null;
 try{if(readParent(parent)!==plan.folded)return null;}catch{return null;}
 const message=parent.startsWith(PARENT_KEY+'§')?KENOMA_FUSED_KEY+parent.slice(PARENT_KEY.length):KENOMA_KEY+parent;
 try{if(kenomaRead(message,readParent)!==source)return null;}catch{return null;}
 return {message,tokens:countTokens(message,enc),sites:plan.sites};
}
/** Incumbent may be any already-verified same-source codec, including HOMOSEMA. */
export function kenomaSelect(source:string,parent:string,incumbent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 const p=kenomaCandidate(source,parent,readParent,enc);
 return p&&p.tokens<countTokens(incumbent,enc)?p:null;
}

/** Indentation arm: line positions themselves need not be transmitted when
 * dedents reveal them. Only canonical close-line whitespace/comma placement
 * is generated; lexical value text is untouched. LF-terminated inputs only.
 */
export function kenomaIndentKey(width:number){
 if(![1,2,4].includes(width))throw Error('KENOMA width');
 return `¶ k=v; expand repeatedly. Restore missing JSON closing lines at dedents and EOF using ${width}-space indentation; add a comma only before a sibling. Preserve other text. Print only.\n`;
}
export function kenomaIndentUndo(folded:string,width:number):string{
 kenomaIndentKey(width);domain(folded);if(!folded.endsWith('\n')||folded.includes('\r'))throw Error('KENOMA LF layout');
 const lines=folded.slice(0,-1).split('\n'),stack:string[]=[],out:string[]=[];let size=0;
 const emit=(s:string)=>{size+=s.length+1;if(size>KENOMA_CAP)throw Error('KENOMA output cap');out.push(s);};
 for(const line of lines){if(!line||line.includes('\t'))throw Error('KENOMA indent line');const indent=/^ */.exec(line)![0].length;if(indent%width)throw Error('KENOMA indent quantum');const level=indent/width;
  while(stack.length>level){const closer=stack.pop()!;emit(' '.repeat(stack.length*width)+closer+(stack.length===level&&level>0?',':''));}
  if(level!==stack.length)throw Error('KENOMA indentation depth');emit(line);walk(line,stack);
 }
 while(stack.length){const c=stack.pop()!;emit(' '.repeat(stack.length*width)+c);}
 const source=out.join('\n')+'\n';JSON.parse(source);return source;
}
export function kenomaIndentPlans(source:string){
 try{domain(source);JSON.parse(source);}catch{return [];}
 if(!source.endsWith('\n')||source.includes('\r')||source.includes('\t'))return [];
 const lines=source.slice(0,-1).split('\n');if(lines.some(l=>!l))return [];
 const kept=lines.filter(l=>!/^ *[}\]],?$/.test(l)),sites=lines.length-kept.length;if(!sites)return [];
 const folded=kept.join('\n')+'\n',plans=[];
 for(const width of [1,2,4])try{if(kenomaIndentUndo(folded,width)===source)plans.push({folded,sites,width});}catch{/* not representable */}
 return plans;
}
export function kenomaIndentRead(message:string,readParent:(s:string)=>string):string{
 for(const width of [1,2,4]){const key=kenomaIndentKey(width);if(message.startsWith(key))return kenomaIndentUndo(readParent(PARENT_KEY+message.slice(key.length)),width);}
 throw Error('KENOMA indent envelope');
}
export function kenomaIndentCandidate(source:string,width:number,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!parent.startsWith(PARENT_KEY+'§'))return null;
 const p=kenomaIndentPlans(source).find(p=>p.width===width);if(!p)return null;
 try{if(readParent(parent)!==p.folded)return null;}catch{return null;}
 const message=kenomaIndentKey(width)+parent.slice(PARENT_KEY.length);
 try{if(kenomaIndentRead(message,readParent)!==source)return null;}catch{return null;}
 return {message,tokens:countTokens(message,enc),sites:p.sites,width};
}
/** Strict full-message comparison against an already verified same-source
 * incumbent (including HOMOSEMA), never a raw-input or payload-only baseline. */
export function kenomaIndentSelect(source:string,width:number,parent:string,incumbent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 const p=kenomaIndentCandidate(source,width,parent,readParent,enc);
 return p&&p.tokens<countTokens(incumbent,enc)?p:null;
}
