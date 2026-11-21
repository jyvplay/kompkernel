/** Optional KENOMA indentation tournament, unwired. The X152 HOMOSEMA
 * tournament remains in the incumbent, so it is not silently weakened.
 * Extra parent work is real; this is not an encoder-latency Pareto claim.
 */
import {countTokens,type EncodingName} from './bpe';
import {tagstackEncode} from './tagstack';
import {homosemaFrontierEncode} from './homosema-frontier';
import {homosemaFusedRead} from './homosema';
import {readPlainParent} from './ekdysis-frontier';
import {kenomaIndentPlans,kenomaIndentCandidate,kenomaIndentRead} from './kenoma';
import {isUtf8TransportStable} from './utf8-wire';
export function readKenomaIncumbent(message:string){
 try{return homosemaFusedRead(message,readPlainParent);}catch{return readPlainParent(message);}
}
export function kenomaFromFrontier(source:string,incumbent:string,encodeParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source)||!isUtf8TransportStable(incumbent))throw Error('KENOMA transport');
 const baseTokens=countTokens(incumbent,enc);let best={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};
 try{if(readKenomaIncumbent(incumbent)!==source)return {...best,reason:'baseline not source-readable'};}catch{return {...best,reason:'baseline not source-readable'};}
 const parents=new Map<string,string|null>();
 for(const p of kenomaIndentPlans(source)){
  if(!parents.has(p.folded)){best.parentCalls++;try{parents.set(p.folded,encodeParent(p.folded));}catch{parents.set(p.folded,null);}}
  const parent=parents.get(p.folded);if(!parent)continue;
  const c=kenomaIndentCandidate(source,p.width,parent,readPlainParent,enc);
  if(!c||c.tokens>=best.tokens||!isUtf8TransportStable(c.message))continue;
  if(kenomaIndentRead(c.message,readPlainParent)!==source)throw Error('KENOMA source mismatch');
  best={...best,message:c.message,tokens:c.tokens,applied:true};
 }
 return {...best,reason:best.applied?'strict token gain; native behavior unverified':'no strict admissible gain'};
}
export function kenomaFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const incumbent=homosemaFrontierEncode(source,enc);
 return kenomaFromFrontier(source,incumbent.message,s=>tagstackEncode(s,enc).message,enc);
}
