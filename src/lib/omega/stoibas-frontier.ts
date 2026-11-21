/** Optional compact STOIBAS tournament over the full X154 incumbent.
 * Unwired. Token nonregression is not runtime or native-decoder certification.
 */
import {countTokens,type EncodingName} from './bpe';
import {stoibasCompactPlans,stoibasCompactCandidate,stoibasCompactRead} from './stoibas';
import {arkesisRead} from './arkesis';
import {arkesisFrontierEncode,readArkesisIncumbent} from './arkesis-frontier';
import {tagstackEncode} from './tagstack';
import {readPlainParent} from './ekdysis-frontier';
import {isUtf8TransportStable} from './utf8-wire';
export function readStoibasIncumbent(message:string){try{return arkesisRead(message,readPlainParent);}catch{return readArkesisIncumbent(message);}}
export function stoibasFromFrontier(source:string,incumbent:string,encodeParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source)||!isUtf8TransportStable(incumbent))throw Error('STOIBAS transport');
 const baseTokens=countTokens(incumbent,enc);let best={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};
 try{if(readStoibasIncumbent(incumbent)!==source)return {...best,reason:'baseline not source-readable'};}catch{return {...best,reason:'baseline not source-readable'};}
 const cache=new Map<string,string|null>();
 for(const p of stoibasCompactPlans(source)){
  if(!cache.has(p.folded)){best.parentCalls++;try{cache.set(p.folded,encodeParent(p.folded));}catch{cache.set(p.folded,null);}}
  const parent=cache.get(p.folded);if(!parent)continue;
  const c=stoibasCompactCandidate(source,p.width,parent,readPlainParent,enc);if(!c||c.tokens>=best.tokens||!isUtf8TransportStable(c.message))continue;
  if(stoibasCompactRead(c.message,readPlainParent)!==source)throw Error('STOIBAS source mismatch');
  best={...best,message:c.message,tokens:c.tokens,applied:true};
 }
 return {...best,reason:best.applied?'strict token gain; native behavior unverified':'no strict admissible gain'};
}
export function stoibasFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const incumbent=arkesisFrontierEncode(source,enc);
 return stoibasFromFrontier(source,incumbent.message,s=>tagstackEncode(s,enc).message,enc);
}
