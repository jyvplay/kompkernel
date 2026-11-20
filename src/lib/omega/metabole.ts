/** X143b METABOLE (change): bucketed lexical suffix edits.
 * Maximal [A-Za-z0-9_./-]+ lexemes update a same-message first-character
 * bucket. ^k,d:s; drops d characters from the latest lexeme beginning k and
 * appends s. Unlike MNEMA this can introduce a never-before-seen word; unlike
 * DIRFOLD the reference is neither a directory nor necessarily the prior line.
 * Classical front/delta-coding ancestry. New repository extension, not a claim
 * of a new mathematical primitive or exhaustive semantic novelty. Unwired.
 */
import {countTokens,type EncodingName} from './bpe';
export const METABOLE_KEY='After decoding the payload, scan left to right. Words are maximal [A-Za-z0-9_./-]+ runs. ^k,d:s; emits a copy of the latest decoded word beginning k, with its last d characters removed and s appended. Every decoded word updates history. Preserve other characters; print only.\n';
const isWord=(c:string|undefined)=>c!==undefined&&/^[A-Za-z0-9_./-]$/.test(c);
const CAP=50000;
export function metaboleUndo(text:string):string{
 if(text.length>CAP)throw Error('METABOLE input cap');
 const history=new Map<string,string>();let out='';
 for(let i=0;i<text.length;){
  if(text[i]==='^'){
   if(isWord(out[out.length-1]))throw Error('METABOLE left boundary');
   const m=/^\^([A-Za-z0-9_./-]),(0|[1-9]\d{0,4}):([A-Za-z0-9_./-]*);/.exec(text.slice(i));
   if(!m)throw Error('METABOLE syntax');const prev=history.get(m[1]),drop=Number(m[2]);
   if(prev===undefined||drop>prev.length)throw Error('METABOLE history');
   const word=prev.slice(0,prev.length-drop)+m[3];
   if(!word||isWord(text[i+m[0].length]))throw Error('METABOLE right boundary');
   out+=word;history.set(word[0],word);i+=m[0].length;
  }else if(isWord(text[i])){
   const start=i;while(isWord(text[i]))i++;const word=text.slice(start,i);out+=word;history.set(word[0],word);
  }else out+=text[i++];
  if(out.length>CAP)throw Error('METABOLE output cap');
 }
 return out;
}
export function metabolePlans(text:string,enc:EncodingName='o200k_base'){
 if(text.length>CAP||text.includes('^'))return [];
 const plans: {threshold:number;folded:string;sites:number;contract:string;message:string;tokens:number}[]=[];
 for(const threshold of [0,1]){
  const history=new Map<string,string>();let folded='',last=0,sites=0;
  for(const m of text.matchAll(/[A-Za-z0-9_./-]+/g)){
   const word=m[0],at=m.index!,prev=history.get(word[0]);let wire=word;
   if(prev){let common=0;while(common<prev.length&&common<word.length&&prev[common]===word[common])common++;
    if(common>=2){const ref=`^${word[0]},${prev.length-common}:${word.slice(common)};`,left=at?text[at-1]:'',right=text[at+word.length]??'';
     if(ref.length<word.length&&countTokens(left+word+right,enc)-countTokens(left+ref+right,enc)>=threshold){wire=ref;sites++;}}
   }
   folded+=text.slice(last,at)+wire;last=at+word.length;history.set(word[0],word);
  }
  folded+=text.slice(last);if(!sites||folded.length>CAP||plans.some(p=>p.folded===folded))continue;
  if(metaboleUndo(folded)!==text)throw Error('METABOLE inverse');
  const message=METABOLE_KEY+folded;
  plans.push({threshold,folded,sites,contract:METABOLE_KEY,message,tokens:countTokens(message,enc)});
 }
 return plans;
}
export function metaboleDecode(message:string):string{return message.startsWith(METABOLE_KEY)?metaboleUndo(message.slice(METABOLE_KEY.length)):message;}
export function metaboleEncode(text:string,enc:EncodingName='o200k_base'){
 if(text.startsWith(METABOLE_KEY))throw Error('METABOLE reserved envelope');
 const p=metabolePlans(text,enc).sort((a,b)=>a.tokens-b.tokens)[0];
 const raw=countTokens(text,enc);return p&&p.tokens<raw?{message:p.message,tokens:p.tokens,decoded:metaboleDecode(p.message),applied:true}:{message:text,tokens:raw,decoded:text,applied:false};
}
