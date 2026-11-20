/** EKDYSIS (X146): remove whole canonical JSON-string serialization layers.
 * Experimental, not automatically wired. Unlike JSON-ESCAPE-FOLD's five
 * punctuation escapes, a selected complete string becomes literal inner text,
 * exposing multiline prose/code to the parent. Classical serialization inverse,
 * not new information theory. Exact finite menu; greedy nonoverlapping scanner.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const EKDYSIS_CAP=100000;
export const EKDYSIS_OPEN='⟦',EKDYSIS_CLOSE='⟧';
export function ekdysisKey(depth:number,whole=false):string{
 if(!Number.isInteger(depth)||depth<1||depth>4)throw Error('EKDYSIS depth');
 if(whole)return depth===1?'JSON.stringify the decoded payload; print only.\n':`Apply JSON.stringify ${depth} times to the decoded payload; print only.\n`;
 return `Expand the payload first. Replace each ⟦text⟧ with JSON.stringify(text), applied ${depth} time${depth===1?'':'s'} (non-ASCII stays literal). Print only.\n`;
}
export function ekdysisUndo(folded:string,depth:number,whole=false):string{
 ekdysisKey(depth);
 if(folded.length>EKDYSIS_CAP||!isUtf8TransportStable(folded))throw Error('EKDYSIS domain');
 if(whole){let out=folded;for(let i=0;i<depth;i++){out=JSON.stringify(out);if(out.length>EKDYSIS_CAP)throw Error('EKDYSIS expansion cap');}return out;}
 let out='',at=0;
 while(at<folded.length){const start=folded.indexOf(EKDYSIS_OPEN,at),end=folded.indexOf(EKDYSIS_CLOSE,at);
  if(start<0){if(end>=0)throw Error('EKDYSIS unmatched close');out+=folded.slice(at);break;}
  if(end<start||folded.indexOf(EKDYSIS_OPEN,start+1)>=0&&folded.indexOf(EKDYSIS_OPEN,start+1)<end)throw Error('EKDYSIS frame');
  out+=folded.slice(at,start);let text=folded.slice(start+1,end);
  for(let i=0;i<depth;i++){text=JSON.stringify(text);if(text.length>EKDYSIS_CAP)throw Error('EKDYSIS expansion cap');}
  out+=text;if(out.length>EKDYSIS_CAP)throw Error('EKDYSIS output cap');at=end+1;
 }
 if(out.length>EKDYSIS_CAP)throw Error('EKDYSIS output cap');return out;
}
export interface EkdysisPlan {whole:boolean;depth:number;sites:number;threshold:number;folded:string;contract:string;message:string;tokens:number;}
export function ekdysisPlans(source:string,enc:EncodingName='o200k_base'):EkdysisPlan[]{
 if(source.length>EKDYSIS_CAP||!isUtf8TransportStable(source)||source.includes(EKDYSIS_OPEN)||source.includes(EKDYSIS_CLOSE))return [];
 // Deterministic scanner: an unterminated quoted suffix is visited once,
 // unlike a regex that can retry from each escaped quote in that suffix.
 const matches:{index:number;raw:string}[]=[];
 for(let i=0;i<source.length;i++)if(source[i]==='"'){
  const start=i;let end=i+1;
  while(end<source.length){if(source[end]==='\\'){end+=2;continue;}if(source[end]==='"')break;end++;}
  if(end>=source.length)break;
  matches.push({index:start,raw:source.slice(start,end+1)});i=end;
 }
 if(matches.length>10000)return [];
 const plans:EkdysisPlan[]=[],seen=new Set<string>();
 for(let depth=1;depth<=4;depth++)for(const threshold of [0,8,32]){
  let folded='',at=0,sites=0;
  for(const m of matches){let inner=m.raw,valid=true;
   for(let i=0;i<depth;i++){try{const v:unknown=JSON.parse(inner);if(typeof v!=='string'||JSON.stringify(v)!==inner){valid=false;break;}inner=v;}catch{valid=false;break;}}
   if(!valid||inner.includes(EKDYSIS_OPEN)||inner.includes(EKDYSIS_CLOSE)||!isUtf8TransportStable(inner))continue;
   const marked=EKDYSIS_OPEN+inner+EKDYSIS_CLOSE;
   if(countTokens(m.raw,enc)-countTokens(marked,enc)<=threshold)continue;
   folded+=source.slice(at,m.index)+marked;at=m.index+m.raw.length;sites++;
  }
  if(!sites)continue;folded+=source.slice(at);if(seen.has(folded+'\0'+depth))continue;seen.add(folded+'\0'+depth);
  if(ekdysisUndo(folded,depth)!==source)throw Error('EKDYSIS inverse');
  const contract=ekdysisKey(depth),message=contract+folded;
  plans.push({whole:false,depth,sites,threshold,folded,contract,message,tokens:countTokens(message,enc)});
 }
 let inner=source;
 for(let depth=1;depth<=4;depth++){
  try{const v:unknown=JSON.parse(inner);if(typeof v!=='string'||JSON.stringify(v)!==inner||!isUtf8TransportStable(v))break;inner=v;}catch{break;}
  const contract=ekdysisKey(depth,true),message=contract+inner;
  if(ekdysisUndo(inner,depth,true)!==source)throw Error('EKDYSIS whole inverse');
  plans.push({whole:true,depth,sites:1,threshold:0,folded:inner,contract,message,tokens:countTokens(message,enc)});
 }
 return plans.sort((a,b)=>a.tokens-b.tokens);
}
export function ekdysisDecode(message:string):string{
 for(let depth=1;depth<=4;depth++)for(const whole of [false,true]){const key=ekdysisKey(depth,whole);if(message.startsWith(key))return ekdysisUndo(message.slice(key.length),depth,whole);}
 return message;
}
export function ekdysisEncode(source:string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source))throw Error('EKDYSIS source UTF-8');
 if([1,2,3,4].some(d=>[false,true].some(w=>source.startsWith(ekdysisKey(d,w)))))throw Error('EKDYSIS reserved envelope');
 const raw=countTokens(source,enc),p=ekdysisPlans(source,enc)[0];
 return p&&p.tokens<raw?{message:p.message,tokens:p.tokens,applied:true,depth:p.depth}:{message:source,tokens:raw,applied:false,depth:0};
}
