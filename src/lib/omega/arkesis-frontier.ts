/** Optional ARKESIS tournament; not wired into production.
 * Incumbent includes X153 KENOMA and X152 HOMOSEMA. Extra parent calls
 * are counted, not treated as free. Token nonregression is not runtime Pareto.
 */
import {countTokens,type EncodingName} from './bpe';
import {arkesisPlans,arkesisCandidate,arkesisRead} from './arkesis';
import {kenomaFrontierEncode,readKenomaIncumbent} from './kenoma-frontier';
import {kenomaIndentRead} from './kenoma';
import {tagstackEncode} from './tagstack';
import {readPlainParent} from './ekdysis-frontier';
import {isUtf8TransportStable} from './utf8-wire';
export function readArkesisIncumbent(message:string){try{return kenomaIndentRead(message,readPlainParent);}catch{return readKenomaIncumbent(message);}}
export function arkesisFromFrontier(source:string,incumbent:string,encodeParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source)||!isUtf8TransportStable(incumbent))throw Error('ARKESIS transport');
 const baseTokens=countTokens(incumbent,enc);let best={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};
 try{if(readArkesisIncumbent(incumbent)!==source)return {...best,reason:'baseline not source-readable'};}catch{return {...best,reason:'baseline not source-readable'};}
 const cache=new Map<string,string|null>();
 for(const p of arkesisPlans(source)){
  if(!cache.has(p.folded)){best.parentCalls++;try{cache.set(p.folded,encodeParent(p.folded));}catch{cache.set(p.folded,null);}}
  const parent=cache.get(p.folded);if(!parent)continue;
  const c=arkesisCandidate(source,p.width,parent,readPlainParent,enc);if(!c||c.tokens>=best.tokens||!isUtf8TransportStable(c.message))continue;
  if(arkesisRead(c.message,readPlainParent)!==source)throw Error('ARKESIS source mismatch');
  best={...best,message:c.message,tokens:c.tokens,applied:true};
 }
 return {...best,reason:best.applied?'strict token gain; native behavior unverified':'no strict admissible gain'};
}
export function arkesisFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const incumbent=kenomaFrontierEncode(source,enc);
 return arkesisFromFrontier(source,incumbent.message,s=>tagstackEncode(s,enc).message,enc);
}
