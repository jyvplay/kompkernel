/** HOMOSEMA (X152): parser-state terminal coalescing for JSON.
 * Experimental/unwired. Merge comma/colon terminal spellings and/or object/array
 * closing spellings; the JSON parser state recovers their types. Preserve every
 * other byte, including whitespace, duplicate keys, escapes and numeric lexemes.
 * This is grammar-conditioned alphabet reduction, not new information theory.
 * Unlike JSON reprinting, no value is parsed into a JS number/object and reprinted.
 * Finite dialect enumeration, no greedy optimization. Native chat NOT verified.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const HOMOSEMA_CAP=50000;
export type HomosemaMode={separator:','|':'|';'|null;close:']'|')'|null};
export const HOMOSEMA_MODES:HomosemaMode[]=[null,',',':',';'].flatMap(separator=>[null,']',')'].map(close=>({separator,close} as HomosemaMode))).filter(m=>m.separator!==null||m.close!==null);
function valid(m:HomosemaMode){return HOMOSEMA_MODES.some(x=>x.separator===m.separator&&x.close===m.close);}
export function homosemaKey(m:HomosemaMode):string{
 if(!valid(m))throw Error('HOMOSEMA mode');
 return 'After decoding, restore JSON punctuation outside strings: '+(m.separator?`${m.separator} means colon after an object key, comma otherwise. `:'')+(m.close?`${m.close} closes the innermost open object or array. `:'')+'Preserve all other characters; print only.\n';
}
/** Same bounded grammar in either direction; exact terminals selected by state. */
function transduce(text:string,m:HomosemaMode,undo:boolean):{text:string;changed:number}{
 if(!valid(m)||text.length>HOMOSEMA_CAP||!isUtf8TransportStable(text))throw Error('HOMOSEMA domain');
 let at=0,changed=0;const out:string[]=[];
 function ws(){const start=at;while(at<text.length&&/[ \t\r\n]/.test(text[at]!))at++;out.push(text.slice(start,at));}
 function terminal(t:string){
  const folded=(t===','||t===':')?(m.separator??t):(t===']'||t==='}')?(m.close??t):t;
  const expected=undo?folded:t,emitted=undo?t:folded;
  if(text[at]!==expected)throw Error(`HOMOSEMA expected ${expected} at ${at}`);
  at++;out.push(emitted);if(expected!==emitted)changed++;
 }
 function string(){
  if(text[at]!=='"')throw Error('HOMOSEMA key/string');
  const start=at++;
  while(at<text.length){const c=text[at++]!;if(c==='"'){out.push(text.slice(start,at));return;}
   if(c.charCodeAt(0)<32)throw Error('HOMOSEMA string control');
   if(c==='\\'){const esc=text[at++];if(esc==='u'){if(!/^[0-9a-fA-F]{4}$/.test(text.slice(at,at+4)))throw Error('HOMOSEMA escape');at+=4;}
    else if(!esc||!'"\\/bfnrt'.includes(esc))throw Error('HOMOSEMA escape');}
  }throw Error('HOMOSEMA unterminated string');
 }
 function value(depth:number){
  if(depth>128)throw Error('HOMOSEMA depth');ws();const c=text[at];
  if(c==='"'){string();return;}
  if(c==='{'||c==='['){const object=c==='{',close=object?'}':']';terminal(c);ws();
   const end=undo?(m.close??close):close;
   if(text[at]===end){terminal(close);return;}
   for(;;){if(object){string();ws();terminal(':');}value(depth+1);ws();
    if(text[at]===end){terminal(close);return;}terminal(',');ws();
   }
  }
  const match=/^(?:null|true|false|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));
  if(!match)throw Error('HOMOSEMA value');out.push(match[0]);at+=match[0].length;
 }
 value(0);ws();if(at!==text.length)throw Error('HOMOSEMA trailing input');return {text:out.join(''),changed};
}
export function homosemaUndo(folded:string,m:HomosemaMode):string{return transduce(folded,m,true).text;}
export function homosemaPlans(source:string,enc:EncodingName='o200k_base'){
 const plans=[];
 for(const mode of HOMOSEMA_MODES){
  let r;try{r=transduce(source,mode,false)}catch{return [];}
  if(!r.changed)continue;
  const folded=r.text;if(homosemaUndo(folded,mode)!==source)throw Error('HOMOSEMA inverse');
  const contract=homosemaKey(mode),message=contract+folded;
  plans.push({mode,folded,contract,message,changed:r.changed,tokens:countTokens(message,enc)});
 }
 return plans.sort((a,b)=>a.tokens-b.tokens);
}
/** Caller must supply source-matched, whole-stack incumbent and a folded parent.
 * Reader is injected explicitly: unsupported messages are refused, never assumed.
 */
export function homosemaCandidate(source:string,mode:HomosemaMode,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 try{if(homosemaUndo(readParent(parent),mode)!==source)return null;}catch{return null;}
 const message=homosemaKey(mode)+parent;
 return {message,tokens:countTokens(message,enc),mode};
}
export function homosemaRead(message:string,readParent:(s:string)=>string=(s=>s)):string{
 for(const mode of HOMOSEMA_MODES){const key=homosemaKey(mode);if(message.startsWith(key))return homosemaUndo(readParent(message.slice(key.length)),mode);}
 throw Error('HOMOSEMA envelope');
}
/** Strict complete-message selector; incumbent must be the source-matched parent.
 * A null result means retain that incumbent unchanged. No default-chain wiring.
 */
export function homosemaSelect(source:string,mode:HomosemaMode,parent:string,incumbent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 const candidate=homosemaCandidate(source,mode,parent,readParent,enc);
 return candidate&&candidate.tokens<countTokens(incumbent,enc)?candidate:null;
}

const PLAIN_PARENT_KEY='¶ k=v. expand repeatedly; print only.\n';
export function homosemaFusedKey(close:']'|')'):string{
 return `¶ k=v; expand repeatedly. Outside JSON strings, ${close} closes either container; print only.\n`;
}
/** Fusion removes a duplicate output instruction, not the punctuation inverse.
 * Only the exact ordinary parent header and close-only dialect are supported.
 */
export function homosemaFusedCandidate(source:string,mode:HomosemaMode,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(mode.separator!==null||mode.close===null||!parent.startsWith(PLAIN_PARENT_KEY+'§'))return null;
 const ordinary=homosemaCandidate(source,mode,parent,readParent,enc);if(!ordinary)return null;
 const message=homosemaFusedKey(mode.close)+parent.slice(PLAIN_PARENT_KEY.length);
 if(homosemaFusedRead(message,readParent)!==source)return null;
 return {message,tokens:countTokens(message,enc),mode};
}
export function homosemaFusedRead(message:string,readParent:(s:string)=>string):string{
 for(const close of [']',')'] as const){const key=homosemaFusedKey(close);if(message.startsWith(key))return homosemaUndo(readParent(PLAIN_PARENT_KEY+message.slice(key.length)),{separator:null,close});}
 throw Error('HOMOSEMA fused envelope');
}
