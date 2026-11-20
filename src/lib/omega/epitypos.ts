/** EPITYPOS (X148): reversible character-overstrike factorization.
 * Historical nroff/POD typography is not a new invention. Repository addition:
 * expose per-character overstrikes as readable spans BEFORE parent search.
 * Bounded deterministic maximal runs; first-valid delimiter choice is greedy.
 * Experimental: program inversion does not establish native-chat behavior.
 */
import {isUtf8TransportStable} from './utf8-wire';
export const EPITYPOS_MARKERS=[['**','__'],['**','~~'],['^^','~~']] as const;
export function epityposKey(index=0):string {
 const pair=EPITYPOS_MARKERS[index];if(!pair)throw Error('markers');const [b,u]=pair;
 return `Decode below; in ${b}...${b} replace each character c with c,backspace,c; in ${u}...${u} replace each c with _,backspace,c. Remove delimiters. Preserve other bytes; print only.\n`;
}
export const EPITYPOS_KEY=epityposKey();
const CAP=40000;
export function epityposRestore(folded:string,index=0):string {
 if(folded.length>CAP||!isUtf8TransportStable(folded))throw Error('domain');
 const pair=EPITYPOS_MARKERS[index];if(!pair)throw Error('markers');const [b,u]=pair;
 let out='';
 for(let i=0;i<folded.length;){
  const marker=folded.slice(i,i+2);
  if(marker!==b&&marker!==u){out+=folded[i++];continue;}
  const end=folded.indexOf(marker,i+2);if(end<0)throw Error('unclosed span');
  const body=folded.slice(i+2,end);if(!body.length||!/^[\x20-\x7e]+$/.test(body)||body.includes(b)||body.includes(u))throw Error('span');
  for(const c of body)out+=(marker===b?c:'_')+'\b'+c;
  i=end+2;if(out.length>CAP)throw Error('expansion');
 }
 if(out.length>CAP)throw Error('expansion');return out;
}
export function epityposPlan(source:string):{folded:string;sites:number;contract:string;index:number}|null {
 if(source.length>CAP||!source.includes('\b')||!isUtf8TransportStable(source))return null;
 for(let index=0;index<EPITYPOS_MARKERS.length;index++){
  const [b,u]=EPITYPOS_MARKERS[index];if(source.includes(b)||source.includes(u))continue;
  const kind=(i:number)=>{
   const a=source[i],c=source[i+2];if(source[i+1]!=='\b'||!c||c<' '||c>'~')return '';
   return a===c?b:a==='_'?u:'';
  };
  let folded='',sites=0,bad=false;
  for(let i=0;i<source.length;){
   const marker=kind(i);if(!marker){if(source[i]==='\b'){bad=true;break;}folded+=source[i++];continue;}
   let body='';while(kind(i)===marker){body+=source[i+2];i+=3;}
   folded+=marker+body+marker;sites++;
  }
  if(bad)continue;
  try{if(epityposRestore(folded,index)!==source)continue;}catch{continue;}
  return {folded,sites,index,contract:epityposKey(index)};
 }
 return null;
}
