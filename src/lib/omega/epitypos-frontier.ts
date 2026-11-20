import {tagstackEncode} from './tagstack';
import {readPlainParent} from './ekdysis-frontier';
import {countTokens,type EncodingName} from './bpe';
import {epityposPlan,epityposRestore,epityposKey,EPITYPOS_MARKERS} from './epitypos';
export function epityposRead(message:string):string {
 if(message.length>41000)throw Error('envelope');
 for(let index=0;index<EPITYPOS_MARKERS.length;index++){
  const key=epityposKey(index);if(message.startsWith(key))return epityposRestore(readPlainParent(message.slice(key.length)),index);
 }
 throw Error('envelope');
}
/** Optional experiment. Always pays baseline; no runtime dominance promised. */
export function epityposEncode(source:string,enc:EncodingName='o200k_base') {
 const start=performance.now(),p=epityposPlan(source),base=tagstackEncode(source,enc),baseMs=performance.now()-start;
 let message=base.message,tokens=base.messageTokens,applied=false,candidateTokens:number|null=null,childMessage:string|null=null;
 if(p){const child=tagstackEncode(p.folded,enc);childMessage=child.message;const m=p.contract+child.message;candidateTokens=countTokens(m,enc);
  try{if(candidateTokens<tokens&&epityposRead(m)===source){message=m;tokens=candidateTokens;applied=true}}catch{/* unsupported inherited parent fails closed */}
 }
 return {message,tokens,applied,candidateTokens,childMessage,baseMessage:base.message,baseTokens:base.messageTokens,baseMs,totalMs:performance.now()-start};
}
