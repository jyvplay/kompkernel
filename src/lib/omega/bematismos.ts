/** X158 BEMATISMOS (stops): periodic-column whitespace transducer.
 * Classical tab-stop semantics; optional phase shifts, no per-column schema.
 * Experimental/unwired. Software inverse is not native model verification.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const BEMATISMOS_CAP=50000;
export function bematismosKey(width:number,phase=0){if(![4,8,16].includes(width)||!Number.isInteger(phase)||phase<0||phase>=width)throw Error('BEMATISMOS parameters');return phase===0?`Decode first. Expand each TAB to spaces through the next ${width}-column tab stop (columns start at zero; LF resets). Keep other characters unchanged. Print only.\n`:`Decode first. Each TAB advances with spaces to the next strictly greater column congruent to ${phase} modulo ${width}. Columns start at zero; LF resets. Keep other characters unchanged. Print only.\n`;}
function domain(s:string,tabs:boolean){if(s.length>BEMATISMOS_CAP||!(tabs?/^[\x20-\x7e\n\t]*$/:/^[\x20-\x7e\n]*$/).test(s))throw Error('BEMATISMOS ASCII domain');}
const step=(col:number,width:number,phase:number)=>width-((col-phase+width)%width);
export function bematismosUndo(s:string,width:number,phase=0){bematismosKey(width,phase);domain(s,true);let out='',col=0;for(const c of s){if(c==='\n'){out+=c;col=0;}else if(c==='\t'){const n=step(col,width,phase);if(out.length+n>BEMATISMOS_CAP)throw Error('BEMATISMOS expansion');out+=' '.repeat(n);col+=n;}else{out+=c;col++;}if(out.length>BEMATISMOS_CAP)throw Error('BEMATISMOS expansion');}return out;}
export function bematismosPlans(source:string,allPhases=false){try{domain(source,false);const plans=[];for(const width of [4,8,16])for(let phase=0;phase<(allPhases?width:1);phase++){let col=0,folded='',tabs=0;for(let i=0;i<source.length;){const c=source[i];if(c==='\n'){folded+=c;col=0;i++;continue;}if(c!==' '){folded+=c;col++;i++;continue;}let j=i;while(source[j]===' ')j++;let n=j-i;while(n){const advance=step(col,width,phase);if(advance>1&&n>=advance){folded+='\t';col+=advance;n-=advance;tabs++;}else{folded+=' ';col++;n--;}}i=j;}if(tabs&&bematismosUndo(folded,width,phase)===source)plans.push({width,phase,folded,tabs});}return plans;}catch{return [];}}
export function bematismosRead(message:string,readParent:(s:string)=>string){for(const w of [4,8,16])for(let phase=0;phase<w;phase++){const key=bematismosKey(w,phase);if(message.startsWith(key))return bematismosUndo(readParent(message.slice(key.length)),w,phase);}throw Error('BEMATISMOS envelope');}
export function bematismosCandidate(source:string,width:number,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base',phase=0){try{domain(source,false);if(parent.length>50000||!isUtf8TransportStable(parent))return null;const message=bematismosKey(width,phase)+parent;if(bematismosRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc)};}catch{return null;}}
/** Bounded optional selector. Caller supplies the actual incumbent and its reader.
 * At most 28 parent encodes; no default-stack integration or runtime Pareto claim.
 */
export function bematismosSelect(source:string,incumbent:string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(source)||!isUtf8TransportStable(incumbent)||readParent(incumbent)!==source)throw Error('BEMATISMOS unverified incumbent');
 let best={message:incumbent,tokens:countTokens(incumbent,enc),selected:false};
 for(const p of bematismosPlans(source,true)){
  const candidate=bematismosCandidate(source,p.width,encodeParent(p.folded),readParent,enc,p.phase);
  if(candidate&&candidate.tokens<best.tokens)best={...candidate,selected:true};
 }
 return best;
}
