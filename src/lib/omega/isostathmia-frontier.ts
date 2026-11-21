/** X157 optional selector over the complete X156 incumbent. Unwired. */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
import {synecheiaFrontierEncode,readSynecheiaIncumbent} from './synecheia-frontier';
import {synecheiaRead} from './synecheia';
import {isostathmiaParentRead as readPlainParent} from './isostathmia-parent';
import {tagstackEncode} from './tagstack';
import {isostathmiaPlan,isostathmiaCandidate} from './isostathmia';
export function readIsostathmiaIncumbent(message:string){try{const decoded=readPlainParent(message);if(decoded!==message)return decoded;}catch{/* try outer envelopes */}try{return synecheiaRead(message,readPlainParent);}catch{return readSynecheiaIncumbent(message);}}
export function isostathmiaFromFrontier(source:string,incumbent:string,encodeParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source)||!isUtf8TransportStable(incumbent))throw Error('ISOSTATHMIA transport');
 const baseTokens=countTokens(incumbent,enc),base={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};
 const p=isostathmiaPlan(source);if(!p)return {...base,reason:'no admitted plan'};
 try{if(readIsostathmiaIncumbent(incumbent)!==source)return {...base,reason:'incumbent mismatch'};}catch{return {...base,reason:'incumbent reader unsupported'};}
 let parent:string;try{parent=encodeParent(p.folded);}catch{return {...base,parentCalls:1,reason:'parent failed'};}
 const c=isostathmiaCandidate(source,parent,readPlainParent,enc);return c&&c.tokens<baseTokens?{...base,...c,applied:true,parentCalls:1,reason:'token gain only; native untested'}:{...base,parentCalls:1,reason:'no strict verified gain'};
}
export function isostathmiaFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const base=synecheiaFrontierEncode(source,enc);return isostathmiaFromFrontier(source,base.message,s=>tagstackEncode(s,enc).message,enc);
}
