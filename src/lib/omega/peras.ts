/** X185 PERAS: emitted-event-end anchored field copies. Experimental/unwired.
 * LZ-End-related restricted copying, NOT the canonical LZ-End parsing and NOT
 * a new information-theoretic primitive. No native-chat verification implied.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000,EVENTS=8192,LENGTHS=[2,3,4,6,8,12,16,24,32,64];
export const PERAS_RULE='Split on ASCII spaces retaining empty fields. Scan fields left to right, numbering input fields from 1. ~i,n; emits a copy of the n output fields ending at the end of input field i\'s expansion; i must be earlier. Other fields emit literally. Join output fields with ASCII spaces, preserving everything else. ';
export const PERAS_KEY='Decode payload first. '+PERAS_RULE+'Print only.\n';
export const PERAS_OUTER_KEY=PERAS_RULE+'Then decode the restored message according to its instructions; print only its result.\n';
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('PERAS domain');}
export function perasUndo(folded:string){
 domain(folded);const input=folded.split(' ');if(input.length>EVENTS)throw Error('PERAS events');const out:string[]=[],ends:number[]=[];let units=0;
 for(const field of input){let copy:string[];
  if(field.includes('~')){const m=/^~([1-9][0-9]{0,3}),([1-9][0-9]?);$/.exec(field);if(!m)throw Error('PERAS syntax');const i=Number(m[1]),n=Number(m[2]);if(i>ends.length||n>64||n<1||ends[i-1]<n)throw Error('PERAS unavailable span');copy=out.slice(ends[i-1]-n,ends[i-1]);}
  else copy=[field];
  for(const word of copy){units+=word.length+(out.length?1:0);if(units>CAP||out.length>=EVENTS)throw Error('PERAS expansion');out.push(word);}ends.push(out.length);
 }
 const source=out.join(' ');domain(source);return source;
}
export function perasPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('~'))return [];const a=source.split(' ');if(a.length>EVENTS)return [];const plans:{max:number;margin:number;sites:number;folded:string;message:string;tokens:number}[]=[];
 for(const max of [8,32,64])for(const margin of [0,2]){const widths=LENGTHS.filter(n=>n<=max),index=new Map<string,number>(),wire:string[]=[];let at=0,sites=0;
  while(at<a.length){let best:string|undefined,bestN=1,bestGain=-Infinity;
   for(const n of widths){if(at+n>a.length)continue;const segment=a.slice(at,at+n),id=index.get(JSON.stringify(segment));if(id===undefined)continue;const ref=`~${id},${n};`,gain=countTokensExact(segment.join(' '),enc)-countTokensExact(ref,enc);if(gain>=margin&&(gain>bestGain||gain===bestGain&&n>bestN)){best=ref;bestN=n;bestGain=gain;}}
   wire.push(best??a[at]);at+=bestN;if(best)sites++;
   // Only emitted-event ends enter the index; no hidden interior copy boundary.
   for(const n of widths)if(n<=at)index.set(JSON.stringify(a.slice(at-n,at)),wire.length);
  }
  if(!sites)continue;const folded=wire.join(' ');if(folded.length>CAP||plans.some(p=>p.folded===folded))continue;if(perasUndo(folded)!==source)throw Error('PERAS inverse');const message=PERAS_KEY+folded;plans.push({max,margin,sites,folded,message,tokens:countTokensExact(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.max-b.max||a.margin-b.margin);
}
export function perasRead(message:string,parent:(s:string)=>string=s=>s){
 if(message.length>CAP+2000||!isUtf8TransportStable(message))throw Error('PERAS wire');
 if(message.startsWith(PERAS_KEY))return perasUndo(parent(message.slice(PERAS_KEY.length)));
 if(message.startsWith(PERAS_OUTER_KEY))return parent(perasUndo(message.slice(PERAS_OUTER_KEY.length)));
 throw Error('PERAS key');
}
