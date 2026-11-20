/** X135 ANAKYKLI — cyclic-cut preconditioning of an existing text encoder.
 * Input x=P+Q becomes Q+marker+P. The parent still sees ordinary text, not a
 * dictionary-coded surrogate. One in-band marker describes the inverse; no
 * arbitrary permutation or character-count instruction is needed.
 * This is a search heuristic, not a new information-theoretic primitive.
 */
import {countTokens,type EncodingName} from './bpe';
export const ANAKYKLI_LINE_KEY = 'Decode; move final line (including newline) to front.\n';
export function anakykliLineFold(text:string):string|null {
  const cut=text.indexOf('\n')+1;
  return cut>0&&cut<text.length&&text.endsWith('\n')?text.slice(cut)+text.slice(0,cut):null;
}
export function anakykliLineRestore(text:string):string {
  if(!text.endsWith('\n'))throw new Error('ANAKYKLI: incomplete final line');
  const cut=text.lastIndexOf('\n',text.length-2)+1;
  return text.slice(cut)+text.slice(0,cut);
}
export const ANAKYKLI_MARKERS = ['↶','⤴','◊','⟲'] as const;
export const anakykliKey = (marker:string) => `After decoding, swap the parts at ${marker}; omit ${marker}.\n`;
export function anakykliPlan(text:string,cut:number):{folded:string;marker:string}|null {
  if(!Number.isInteger(cut)||cut<=0||cut>=text.length)return null;
  // Never split a surrogate pair, even when a caller supplies its own cut.
  if(/[\uD800-\uDBFF]/.test(text[cut-1]!)&&/[\uDC00-\uDFFF]/.test(text[cut]!))return null;
  const marker=ANAKYKLI_MARKERS.find(m=>!text.includes(m));if(!marker)return null;
  return {folded:text.slice(cut)+marker+text.slice(0,cut),marker};
}
export function anakykliRestore(folded:string,marker:string):string {
  const a=folded.split(marker);if(a.length!==2)throw new Error('ANAKYKLI: expected one cut marker');
  return a[1]+a[0];
}
export function anakykliDecode(message:string,decodeParent:(m:string)=>string):string {
  if(message.startsWith(ANAKYKLI_LINE_KEY))return anakykliLineRestore(decodeParent(message.slice(ANAKYKLI_LINE_KEY.length)));
  const marker=ANAKYKLI_MARKERS.find(m=>message.startsWith(anakykliKey(m)));
  if(!marker)throw new Error('ANAKYKLI: missing declared inverse');
  return anakykliRestore(decodeParent(message.slice(anakykliKey(marker).length)),marker);
}
/** Four line-aligned phases, deduplicated. No wall clock or learned routing. */
export function anakykliCuts(text:string):number[] {
  const cuts:number[]=[];for(let i=0;i<text.length-1;i++)if(text[i]==='\n')cuts.push(i+1);
  if(!cuts.length)return [];
  return [...new Set([cuts[0],...[0.25,0.5,0.75].map(f=>cuts.reduce((a,b)=>Math.abs(b-text.length*f)<Math.abs(a-text.length*f)?b:a))])];
}
/** Decoder callback must reconstruct from MESSAGE ONLY, never encoder metadata.
 * Per-call callback costs dominate. Full F+multiple F trials is not a speedup.
 * The base is never recomputed; each admitted candidate is strictly cheaper.
 */
export function anakykliFromFrontier(text:string,base:string,
 encodeParent:(s:string)=>string,decodeParent:(s:string)=>string,
 enc:EncodingName='o200k_base',cuts=anakykliCuts(text)) {
  let best=base,tokens=countTokens(base,enc),cutUsed:number|null=null,trials=0;
  if(text.length>100000)return null;
  for(const cut of cuts){
    const lineFold=cut===text.indexOf('\n')+1?anakykliLineFold(text):null;
    const p=lineFold===null?anakykliPlan(text,cut):null;
    if(lineFold===null&&!p)continue;trials++;
    const inner=encodeParent(lineFold??p!.folded);
    const message=(lineFold!==null?ANAKYKLI_LINE_KEY:anakykliKey(p!.marker))+inner,n=countTokens(message,enc);
    if(n>=tokens)continue;
    try{if(anakykliDecode(message,decodeParent)!==text)continue;}catch{continue;}
    best=message;tokens=n;cutUsed=cut;
  }
  return cutUsed===null?null:{message:best,tokens,cut:cutUsed,trials};
}
