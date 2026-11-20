/** X144b COLEX — suffix-first lexical-component preconditioning.
 * Reverses separator-delimited components inside maximal ASCII lexemes, not
 * lines/records, dictionary rules, or character order. Empty components count.
 * An involution; classical colexicographic/suffix locality ancestry, no claim of
 * new mathematics. Experimental, unwired. Parent search must price full keys.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const COLEX_SEPARATORS=['/','-','_','.'] as const;
export type ColexSeparator=typeof COLEX_SEPARATORS[number];
export const colexKey=(sep:ColexSeparator)=>`After decoding the payload, reverse the order of ${JSON.stringify(sep)}-separated components, including empty ones, within every maximal [A-Za-z0-9_./+-]+ run. Preserve all other characters; print only.\n`;
export function colexUndo(text:string,sep:ColexSeparator):string{
 if(!COLEX_SEPARATORS.includes(sep)||text.length>50000||!isUtf8TransportStable(text))throw Error('COLEX domain');
 return text.replace(/[A-Za-z0-9_./+-]+/g,s=>s.split(sep).reverse().join(sep));
}
export function colexPlans(text:string,enc:EncodingName='o200k_base'){
 if(text.length>50000||!isUtf8TransportStable(text))return [];
 const plans=[];for(const sep of COLEX_SEPARATORS){
  const folded=colexUndo(text,sep);if(folded===text)continue;
  if(colexUndo(folded,sep)!==text)throw Error('COLEX inverse');
  const contract=colexKey(sep),message=contract+folded;
  plans.push({sep,folded,contract,message,tokens:countTokens(message,enc)});
 }return plans;
}
export function colexDecode(message:string):string{
 for(const sep of COLEX_SEPARATORS)if(message.startsWith(colexKey(sep)))return colexUndo(message.slice(colexKey(sep).length),sep);
 return message;
}
export function colexEncode(text:string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(text))throw Error('COLEX source is not UTF-8 transport stable');
 if(COLEX_SEPARATORS.some(s=>text.startsWith(colexKey(s))))throw Error('COLEX reserved envelope');
 const p=colexPlans(text,enc).sort((a,b)=>a.tokens-b.tokens)[0],raw=countTokens(text,enc);
 return p&&p.tokens<raw?{message:p.message,tokens:p.tokens,applied:true}:{message:text,tokens:raw,applied:false};
}
