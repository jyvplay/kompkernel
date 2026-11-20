/** X144 PSIFIDA: decimal digit-plane weaving, experimental and unwired.
 * A width-selected stream of maximal ASCII digit runs is transposed by digit
 * position. Unlike record-column transposition, numbers need not be in records,
 * in one field, or adjacent. The skeleton retains one hole per selected run.
 * Classical shuffle/bit-plane ancestry, not a new information-theoretic idea.
 */
import {countTokens,type EncodingName} from './bpe';
export const PSIFIDA_KEY='After decoding the payload: its first line contains equal-length digit columns separated by spaces. Transpose these columns into rows; replace successive ~ in the remaining text with successive rows. Preserve everything else; print only.\n';
const CAP=50000;
export function psifidaUndo(folded:string):string{
 if(folded.length>CAP)throw Error('PSIFIDA input cap');
 const at=folded.indexOf('\n');if(at<0)throw Error('PSIFIDA frame');
 const columns=folded.slice(0,at).split(' '),body=folded.slice(at+1),n=columns[0].length;
 if(columns.length<2||columns.length>12||n<1||n>10000||columns.some(c=>!/^\d+$/.test(c)||c.length!==n))throw Error('PSIFIDA columns');
 if((body.match(/~/g)??[]).length!==n)throw Error('PSIFIDA arity');
 if(body.length+n*(columns.length-1)>CAP)throw Error('PSIFIDA output cap');
 let i=0;return body.replace(/~/g,()=>{const number=columns.map(c=>c[i]).join('');i++;return number;});
}
export function psifidaPlans(text:string,enc:EncodingName='o200k_base'){
 if(text.length>CAP||text.includes('~'))return [];
 const plans:{width:number;sites:number;folded:string;message:string;tokens:number;contract:string}[]=[];
 for(let width=2;width<=12;width++){
  const numbers=[...text.matchAll(/[0-9]+/g)].filter(m=>m[0].length===width).map(m=>m[0]);if(numbers.length<3||numbers.length>10000)continue;
  const columns=Array.from({length:width},(_,i)=>numbers.map(n=>n[i]).join(''));
  const body=text.replace(/[0-9]+/g,n=>n.length===width?'~':n),folded=columns.join(' ')+'\n'+body;
  if(folded.length>CAP)continue;if(psifidaUndo(folded)!==text)throw Error('PSIFIDA inverse');
  const message=PSIFIDA_KEY+folded;plans.push({width,sites:numbers.length,folded,message,tokens:countTokens(message,enc),contract:PSIFIDA_KEY});
 }
 return plans;
}
export function psifidaDecode(message:string):string{return message.startsWith(PSIFIDA_KEY)?psifidaUndo(message.slice(PSIFIDA_KEY.length)):message;}
export function psifidaEncode(text:string,enc:EncodingName='o200k_base'){
 if(text.startsWith(PSIFIDA_KEY))throw Error('PSIFIDA reserved envelope');
 const p=psifidaPlans(text,enc).sort((a,b)=>a.tokens-b.tokens)[0],raw=countTokens(text,enc);
 return p&&p.tokens<raw?{message:p.message,tokens:p.tokens,applied:true}:{message:text,tokens:raw,applied:false};
}
