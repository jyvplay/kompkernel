/** Optional X156 tournament; not wired into production TAGSTACK. */
import {type EncodingName} from './bpe';
import {stoibasFrontierEncode,readStoibasIncumbent} from './stoibas-frontier';
import {stoibasCompactRead} from './stoibas';
import {readPlainParent} from './ekdysis-frontier';
import {tagstackEncode} from './tagstack';
import {synecheiaFromFrontier,synecheiaPlan} from './synecheia';
export function readSynecheiaIncumbent(message:string){
 try{return stoibasCompactRead(message,readPlainParent);}catch{return readStoibasIncumbent(message);}
}
export function synecheiaFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const base=stoibasFrontierEncode(source,enc);
 // No new representation exists here: preserve incumbent, including unsupported
 // reader families, without pretending to have independently decoded them.
 if(!synecheiaPlan(source))return {...base,baseTokens:base.tokens,applied:false,parentCalls:0};
 return synecheiaFromFrontier(source,base.message,readSynecheiaIncumbent,s=>tagstackEncode(s,enc).message,readPlainParent,enc);
}
