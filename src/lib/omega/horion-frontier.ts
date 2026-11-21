/** Optional threshold/parent composition, never enabled by default.
 * Extra parent search is charged; no encoder-speed improvement is claimed.
 */
import {tagstackEncode} from './tagstack';
import {readPlainParent} from './ekdysis-frontier';
import {horionPlans,horionRead,horionRestore,HORION_CONTRACT} from './horion';
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const HORION_OUTER='First decode the payload below to reduced CSV, then apply the restoration rule.\n'+HORION_CONTRACT;
const ID='[A-Za-z][A-Za-z0-9_]{0,99}';
const COMPACT=new RegExp(String.raw`^Decode CSV below; append (${ID}): (${ID}) if (${ID})<(-?(?:0|[1-9][0-9]{0,29})(?:\.[0-9]{1,30})?), else (${ID})\. Preserve other bytes; print only\.\n`);
export function horionCompactKey(p:ReturnType<typeof horionPlans>[number]):string|null {
 const [t,h,a,k,lo,hi]=p.spec,headers=p.reduced.split('\n',1)[0].split(',');
 if(t!==headers.length||headers.filter(v=>v===headers[a]).length!==1||![h,lo,hi,headers[a]].every(v=>new RegExp(`^${ID}$`).test(v)))return null;
 return `Decode CSV below; append ${h}: ${lo} if ${headers[a]}<${k}, else ${hi}. Preserve other bytes; print only.\n`;
}
export function horionFrontierRead(message:string):string {
 if(message.length>41000||!isUtf8TransportStable(message))throw Error('transport');
 const compact=COMPACT.exec(message);
 if(compact){
  const reduced=readPlainParent(message.slice(compact[0].length)),headers=reduced.split('\n',1)[0].split(','),a=headers.indexOf(compact[3]);
  if(a<0||headers.filter(v=>v===compact[3]).length!==1)throw Error('ambiguous header');
  return horionRestore(reduced,[headers.length,compact[1],a,compact[4],compact[2],compact[5]]);
 }
 if(message.startsWith(HORION_CONTRACT))return horionRead(message);
 if(!message.startsWith(HORION_OUTER))throw Error('envelope');
 const rest=message.slice(HORION_OUTER.length),end=rest.indexOf('\n');if(end<0)throw Error('frame');
 return horionRestore(readPlainParent(rest.slice(end+1)),JSON.parse(rest.slice(0,end)));
}
export function horionFrontierEncode(source:string,enc:EncodingName='o200k_base') {
 if(!isUtf8TransportStable(source)||source.startsWith(HORION_OUTER)||source.startsWith('Decode CSV below; append '))throw Error('source domain');
 const start=performance.now(),plans=horionPlans(source,enc),base=tagstackEncode(source,enc),baseMs=performance.now()-start;
 let message=base.message,tokens=base.messageTokens,applied=false;
 for(const p of plans.slice(0,1)) {
  if(p.tokens<tokens&&horionFrontierRead(p.message)===source){message=p.message;tokens=p.tokens;applied=true}
  const child=tagstackEncode(p.reduced,enc),key=horionCompactKey(p);
  for(const m of [HORION_OUTER+JSON.stringify(p.spec)+'\n'+child.message,...(key?[key+child.message]:[])]){
   let decoded:string;try{decoded=horionFrontierRead(m)}catch{continue}
   const n=countTokens(m,enc);if(decoded===source&&n<tokens){message=m;tokens=n;applied=true}
  }
 }
 return {message,tokens,applied,baseTokens:base.messageTokens,baseMessage:base.message,baseMs,totalMs:performance.now()-start};
}
