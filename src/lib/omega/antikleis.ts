/** X164 compact TAGSTACK dialect refinement (initial novelty claim rejected).
 * The existing tagstack.ts already uses closing-name stack references.
 * This narrower grammar/marker/contract variant has measured token gains,
 * but is NOT a new mechanism. Retained separately as an optional refinement.
 * Native-model reliability remains unmeasured.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const ANTIKLEIS_SLASH_KEY='Decode first. In the markup, </> closes the latest unclosed tag: insert its exact name. Self-closing tags do not enter the stack. Ignore tags inside comments, CDATA and processing instructions. Preserve everything else; print only.\n';
export const ANTIKLEIS_KEY='Decode first; replace <> with the matching XML end tag. Preserve everything else; print only.\n';
export type AntikleisMode='empty'|'slash';
export function antikleisKey(mode:AntikleisMode){if(mode!=='empty'&&mode!=='slash')throw Error('ANTIKLEIS mode');return mode==='empty'?ANTIKLEIS_KEY:ANTIKLEIS_SLASH_KEY;}
const CAP=50000,DEPTH=128;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('ANTIKLEIS domain');}
/** Lexical balanced-markup subset, not an XML validity/entity interpreter. */
function scan(text:string,fold:boolean,mode:AntikleisMode){
 antikleisKey(mode);const marker=mode==='empty'?'<>':'</>';
 domain(text);const stack:string[]=[];let out='',sites=0,i=0;
 const put=(s:string)=>{if(out.length+s.length>CAP)throw Error('ANTIKLEIS expansion');out+=s;};
 while(i<text.length){
  if(text[i]!=='<'){const end=text.indexOf('<',i);const j=end<0?text.length:end;put(text.slice(i,j));i=j;continue;}
  let end=-1;
  for(const [open,close] of [['<!--','-->'],['<![CDATA[',']]>'],['<?','?>']])if(text.startsWith(open,i)){
   const k=text.indexOf(close,i+open.length);if(k<0)throw Error('ANTIKLEIS unclosed opaque region');end=k+close.length;break;
  }
  if(end>=0){put(text.slice(i,end));i=end;continue;}
  let quote='';let j=i+1;
  for(;j<text.length;j++){const c=text[j];if(quote){if(c===quote)quote='';else if(c==='<')throw Error('ANTIKLEIS attribute less-than');}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;else if(c==='<')throw Error('ANTIKLEIS nested token');}
  if(j===text.length||quote)throw Error('ANTIKLEIS unclosed tag');
  const token=text.slice(i,j+1);i=j+1;
  if(token===marker){
   if(fold||!stack.length)throw Error('ANTIKLEIS marker');put('</'+stack.pop()!+'>');sites++;continue;
  }
  const closing=/^<\/([A-Za-z_][A-Za-z0-9_.:-]*)([\t\r\n ]*)>$/.exec(token);
  if(closing){if(stack.pop()!==closing[1])throw Error('ANTIKLEIS mismatched close');if(fold&&closing[2]===''){put(marker);sites++;}else put(token);continue;}
  // Attribute syntax is retained verbatim but lexically checked; no DTDs,
  // entity expansion, HTML void-element rules, or case folding are implicit.
  const opening=/^<([A-Za-z_][A-Za-z0-9_.:-]*)((?:[\t\r\n ]+[A-Za-z_][A-Za-z0-9_.:-]*[\t\r\n ]*=[\t\r\n ]*(?:"[^"<]*"|'[^'<]*'))*[\t\r\n ]*)(\/?)>$/.exec(token);
  if(!opening)throw Error('ANTIKLEIS unsupported tag');
  if(!opening[3]){if(stack.length>=DEPTH)throw Error('ANTIKLEIS depth');stack.push(opening[1]);}put(token);
 }
 if(stack.length)throw Error('ANTIKLEIS missing closes');return {text:out,sites};
}
export function antikleisUndo(folded:string,mode:AntikleisMode='empty'){return scan(folded,false,mode).text;}
export function antikleisPlan(source:string,mode:AntikleisMode='empty'){try{domain(source);if(source.includes('</>')||source.includes('<>'))return null;const p=scan(source,true,mode);if(!p.sites||antikleisUndo(p.text,mode)!==source)return null;return {folded:p.text,sites:p.sites,mode};}catch{return null;}}
export function antikleisRead(message:string,parent:(s:string)=>string){domain(message);const mode=message.startsWith(ANTIKLEIS_KEY)?'empty':message.startsWith(ANTIKLEIS_SLASH_KEY)?'slash':null;if(mode===null)throw Error('ANTIKLEIS contract');const folded=parent(message.slice(antikleisKey(mode).length));return antikleisUndo(folded,mode);}
export function antikleisFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if((incumbent.startsWith(ANTIKLEIS_KEY)||incumbent.startsWith(ANTIKLEIS_SLASH_KEY))||readIncumbent(incumbent)!==source)throw Error('ANTIKLEIS incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const p=antikleisPlan(source);if(!p)return best;
 const admit=(message:string,reader:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&antikleisRead(message,reader)===source)best={...best,message,tokens,applied:true};}catch{/* Refuse unsupported/ambiguous parent. */}};
 admit(ANTIKLEIS_KEY+p.folded,s=>s);best.parentCalls=1;try{admit(ANTIKLEIS_KEY+encodeParent(p.folded),readParent);}catch{/* Retain verified incumbent/direct. */}return best;
}
