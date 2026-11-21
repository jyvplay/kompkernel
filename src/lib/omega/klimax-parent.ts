/** X159 bounded reader support for the existing AKOLOUTHIA envelope.
 * This adds no wire operation. Exact integer arithmetic; no source input.
 */
import {isostathmiaParentRead} from './isostathmia-parent';
import {readIsostathmiaIncumbent,isostathmiaFrontierEncode} from './isostathmia-frontier';
import {klimaxFromFrontier} from './klimax';
import {tagstackEncode} from './tagstack';
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const KLIMAX_AP_SUFFIX='\nEvery new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.';
export const KLIMAX_AP_KEY='⁺ = number at same position above + change from two lines above.\n';
export function klimaxProgressionUndo(text:string){
 if(text.length>50000||!isUtf8TransportStable(text))throw Error('KLIMAX AP domain');let history:bigint[][]=[],size=0;
 const out=text.split('\n').map(line=>{const nums:bigint[]=[];const decoded=line.replace(/[0-9]+|⁺/g,token=>{
  let value:bigint;if(token==='⁺'){const k=nums.length;if(history.length<2||history[history.length-1][k]===undefined||history[history.length-2][k]===undefined)throw Error('KLIMAX AP predecessor');value=2n*history[history.length-1][k]-history[history.length-2][k];}
  else value=BigInt(token);if(value>9007199254740991n||value< -9007199254740991n)throw Error('KLIMAX AP unsafe integer');nums.push(value);return token==='⁺'?String(value):token;
 });history.push(nums);if(history.length>2)history.shift();size+=decoded.length+1;if(size>50001)throw Error('KLIMAX AP expansion');return decoded;}).join('\n');return out;
}
export function klimaxParentRead(message:string):string{
 if(message.startsWith(KLIMAX_AP_KEY+'§')){
  const body=message.slice(KLIMAX_AP_KEY.length),text=isostathmiaParentRead('Before ¶ k=v. expand; print only.\n'+body);
  if(body.charCodeAt(1)<0x400||body.charCodeAt(1)>=0x500||!text.endsWith(KLIMAX_AP_SUFFIX))throw Error('KLIMAX AP terminal dictionary instruction');
  return klimaxProgressionUndo(text.slice(0,-KLIMAX_AP_SUFFIX.length));
 }
 return isostathmiaParentRead(message);
}
export function klimaxIncumbentRead(message:string):string{
 if(message.startsWith(KLIMAX_AP_KEY+'§'))return klimaxParentRead(message);
 return readIsostathmiaIncumbent(message);
}
export function klimaxFrontierEncode(source:string,enc:EncodingName='o200k_base'){
 const incumbent=isostathmiaFrontierEncode(source,enc);
 try{return klimaxFromFrontier(source,incumbent.message,klimaxIncumbentRead,s=>tagstackEncode(s,enc).message,klimaxParentRead,enc);}
 catch{return {message:incumbent.message,tokens:countTokens(incumbent.message,enc),baseTokens:countTokens(incumbent.message,enc),applied:false,parentCalls:0,reason:'incumbent reader unsupported; unchanged operational fallback'};}
}
