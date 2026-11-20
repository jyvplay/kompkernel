/** X141 MNEMA (memory): same-message lexical recency references.
 * ^p names the latest completed ASCII word with prefix p, case-sensitive.
 * First occurrences remain literal; ALL decoded words update history.
 * Unlike ANAMNESIS/CTXCOPY no previous message or external dictionary is used.
 * Unlike KAPPA there is no explicit bind operation or fixed symbol assignment.
 * Adaptive dictionary/prefix-addressing ancestry; not a new theoretical primitive.
 * Experimental, unwired; no native-model or Pareto claim.
 */
import {countTokens,type EncodingName} from './bpe';
export const MNEMA_KEY='Words=[A-Za-z]+; ^p copies latest decoded word starting p, case-sensitive. Scan left to right; preserve all other characters; print only.\n';
export const MNEMA_COMPOSE_KEY='First decode the following payload completely. Then: '+MNEMA_KEY;
const CAP=50000,MAX_PREFIX=12,MAX_WORDS=10000;
const letter=(c:string|undefined)=>!!c&&/^[A-Za-z]$/.test(c);
function learn(history:Map<string,string>,word:string){for(let k=1;k<=Math.min(word.length,MAX_PREFIX);k++)history.set(word.slice(0,k),word);}
/** No source argument and no cross-message state. Malformed references refuse. */
export function mnemaUndo(body:string):string{
 if(body.length>CAP)throw Error('MNEMA input cap');
 const history=new Map<string,string>();let out='',words=0;
 for(let i=0;i<body.length;){
  const ref=body[i]==='^',start=i;if(ref)i++;
  if(ref||letter(body[i])){
   const p=i;while(letter(body[i]))i++;const token=body.slice(p,i);
   if(!token||ref&&(token.length>MAX_PREFIX||letter(body[start-1])||body[start-1]==='^'||body[i]==='^'))throw Error('MNEMA reference boundary');
   const word=ref?history.get(token):token;if(word===undefined)throw Error('MNEMA missing history');
   if(++words>MAX_WORDS)throw Error('MNEMA word cap');
   out+=word;learn(history,word);
  }else out+=body[i++];
  if(out.length>CAP)throw Error('MNEMA output cap');
 }
 return out;
}
export function mnemaDecode(message:string):string{
 if(!message.startsWith(MNEMA_KEY))throw Error('MNEMA contract');return mnemaUndo(message.slice(MNEMA_KEY.length));
}
/** Greedy local BPE proposals, not global optimality. State depends on decoded
 * words, so literal/reference choice does not change future eligibility.
 * minSaving=0 permits local ties for parent-representation experiments.
 */
export function mnemaPlan(text:string,minSaving=1,enc:EncodingName='o200k_base'){
 if(text.length>CAP||text.includes('^')||!Number.isInteger(minSaving)||minSaving<0||minSaving>10)return null;
 const history=new Map<string,string>();let out='',last=0,sites=0,words=0,probes=0;
 for(const m of text.matchAll(/[A-Za-z]+/g)){
  if(++words>MAX_WORDS)return null;
  const word=m[0],at=m.index!,left=at?text[at-1]:'',right=text[at+word.length]??'';
  let chosen=word,price=countTokens(left+word+right,enc);
  const original=price;
  for(let k=1;k<=Math.min(MAX_PREFIX,word.length-1);k++){
   const prefix=word.slice(0,k);if(history.get(prefix)!==word)continue;
   const wire='^'+prefix,n=countTokens(left+wire+right,enc);probes++;
   if(n<=price&&original-n>=minSaving&&(n<price||wire.length<chosen.length)){chosen=wire;price=n;}
  }
  out+=text.slice(last,at)+chosen;last=at+word.length;if(chosen!==word)sites++;
  learn(history,word);
 }
 out+=text.slice(last);if(!sites)return null;
 if(mnemaUndo(out)!==text)throw Error('MNEMA inverse mismatch');
 const message=MNEMA_KEY+out;
 return {folded:out,message,tokens:countTokens(message,enc),sourceTokens:countTokens(text,enc),sites,words,probes,minSaving};
}
export function mnemaEncode(text:string,enc:EncodingName='o200k_base'){
 let best:ReturnType<typeof mnemaPlan>=null;
 for(const threshold of [0,1,2]){const r=mnemaPlan(text,threshold,enc);if(r&&r.tokens<r.sourceTokens&&(!best||r.tokens<best.tokens))best=r;}
 return best;
}
