/** Optional HOMOSEMA full-parent tournament. Not imported by TAGSTACK.
 * Two close-only dialects; complete in-band cost, independent source-read gate,
 * strict fallback. Additional parent calls cost time: not a runtime Pareto claim.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
import {homosemaPlans,homosemaFusedCandidate,homosemaFusedRead} from './homosema';
import {tagstackEncode} from './tagstack';
import {readPlainParent} from './ekdysis-frontier';
export function homosemaFromFrontier(source:string,incumbent:string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source)||!isUtf8TransportStable(incumbent))throw Error('HOMOSEMA transport');
 const baseTokens=countTokens(incumbent,enc);let best={message:incumbent,tokens:baseTokens,applied:false,baseTokens,parentCalls:0};
 // Unsupported baseline is a refusal, not a source-read verification pass.
 try{if(readParent(incumbent)!==source)return {...best,reason:'baseline reader unsupported or mismatched'};}catch{return {...best,reason:'baseline reader unsupported or mismatched'};}
 for(const plan of homosemaPlans(source,enc).filter(p=>p.mode.separator===null)){
  best.parentCalls++;let parent:string;try{parent=encodeParent(plan.folded);}catch{continue;}
  const candidate=homosemaFusedCandidate(source,plan.mode,parent,readParent,enc);
  if(!candidate||candidate.tokens>=best.tokens||!isUtf8TransportStable(candidate.message))continue;
  try{if(homosemaFusedRead(candidate.message,readParent)!==source)continue;}catch{continue;}
  best={...best,message:candidate.message,tokens:candidate.tokens,applied:true};
 }
 return {...best,reason:best.applied?'strict complete-message token gain; native behavior unverified':'no strict complete-message gain'};
}
export function homosemaFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source))throw Error('HOMOSEMA source transport');
 const base=tagstackEncode(source,enc);
 return homosemaFromFrontier(source,base.message,s=>tagstackEncode(s,enc).message,readPlainParent,enc);
}
