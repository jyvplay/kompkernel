/** X143 PROTASIS (condition): finite-state capitalization prediction with
 * explicit exceptions. Unlike STENTOR's sustained-uppercase spans or MORPH's
 * dictionary case flags, a punctuation/line-boundary state predicts exactly
 * one letter; ~ escapes a lower-case exception. Classical predictive residual
 * coding, new bounded repository experiment; not a novel theoretical family.
 * Unwired. Native-model decoding and Pareto superiority unverified.
 */
import {countTokens,type EncodingName} from './bpe';
export type ProtasisMode='sentence'|'line';
export function protasisKey(mode:ProtasisMode):string{
 return `After decoding the payload, ${mode==='sentence'?'at its start and after each . ! ? followed by whitespace':'at the start of each LF-separated line'}, skip spaces, tabs, CR and LF; uppercase the next character if it is a-z. A ~ there instead removes itself and keeps the following lowercase letter. Preserve everything else; print only.\n`;
}
const ws=(c:string)=>c===' '||c==='\t'||c==='\r'||c==='\n';
/** States: ready (boundary), punct (last char terminal punctuation), ordinary.
 * While ready, skip ASCII space/tab/CR/LF only. Other characters consume it.
 */
function transduce(text:string,mode:ProtasisMode,encoding:boolean){
 if(text.length>50000||!['sentence','line'].includes(mode))throw Error('PROTASIS domain');
 let state=1,out='',changed=0,exceptions=0;
 for(let i=0;i<text.length;i++){
  let c=text[i];
  if(mode==='sentence'&&state===2&&ws(c))state=1;
  if(state===1&&ws(c)){out+=c;continue;}
  if(state===1){
   if(encoding){
    if(/[A-Z]/.test(c)){c=c.toLowerCase();changed++;}
    else if(/[a-z]/.test(c)){c='~'+c;exceptions++;}
   }else if(c==='~'){
    const next=text[++i];if(!next||!/[a-z]/.test(next))throw Error('PROTASIS exception');c=next;
   }else if(/[a-z]/.test(c))c=c.toUpperCase();
  }else if(!encoding&&c==='~')throw Error('PROTASIS stray marker');
  out+=c;
  // Case replacement cannot alter punctuation/boundary state.
  const last=c[c.length-1];state=mode==='line'?(last==='\n'?1:0):(/[.!?]/.test(last)?2:0);
 }
 return {text:out,changed,exceptions};
}
export function protasisUndo(text:string,mode:ProtasisMode):string{return transduce(text,mode,false).text;}
export function protasisPlans(text:string,enc:EncodingName='o200k_base'){
 if(text.length>50000||text.includes('~'))return [];
 const out=[];
 for(const mode of ['sentence','line']as const){
  const r=transduce(text,mode,true);if(!r.changed||r.text.length>50000)continue;
  if(protasisUndo(r.text,mode)!==text)throw Error('PROTASIS inverse');
  const contract=protasisKey(mode),message=contract+r.text;
  out.push({mode,folded:r.text,changed:r.changed,exceptions:r.exceptions,contract,message,tokens:countTokens(message,enc)});
 }
 return out;
}
export function protasisDecode(message:string):string{
 for(const mode of ['sentence','line']as const){const key=protasisKey(mode);if(message.startsWith(key))return protasisUndo(message.slice(key.length),mode);}
 return message;
}
export function protasisEncode(text:string,enc:EncodingName='o200k_base'){
 // Reserve the envelope namespace so raw fallback cannot collide with a wire.
 if((['sentence','line']as const).some(m=>text.startsWith(protasisKey(m))))throw Error('PROTASIS reserved envelope');
 const plans=protasisPlans(text,enc).sort((a,b)=>a.tokens-b.tokens),p=plans[0];
 return p&&p.tokens<countTokens(text,enc)?{message:p.message,tokens:p.tokens,decoded:protasisUndo(p.folded,p.mode),applied:true}:{message:text,tokens:countTokens(text,enc),decoded:text,applied:false};
}
