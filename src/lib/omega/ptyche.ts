/** X136 PTYCHE (fold): paragraph-local layout parameter residualization.
 * Unlike WRAPCANON/STICHOS's one shared width, blocks may override the default
 * width. The default covers the most feasible width intervals; exceptions stay
 * in-band. The optional residual arm adjusts line word counts while wrapping,
 * re-anchoring each prediction at the corrected boundary. Standard predictive
 * coding genus, not a new theorem. Experimental/unwired: 620 -> 608 on one
 * canonical prose lane; same-parent single-width ablation reaches 614. No blind
 * native-model validation or whole-stack speedup established. Finite search,
 * CPU work caps, no local clock cutoff; one extra parent call for the default arm.
 */
import {countTokens,type EncodingName} from './bpe';
export const PTYCHE_KEY='After decoding, ↵W[/line:delta,...]| marks a paragraph: remove prefix; greedily fill lines to W characters with single spaces, adjusting word count on listed 1-based lines by delta; print only.\n';
export type PtychePlan={folded:string;blocks:number;patches:number;removedBreaks:number};
function wordsOf(p:string):string[]|null {
 if(!/^[\x20-\x7e\n]+$/.test(p))return null;
 const lines=p.split('\n');
 if(lines.some(l=>!l||l.startsWith(' ')||l.endsWith(' ')||l.includes('  ')))return null;
 return lines.join(' ').split(' ');
}
function greedyCount(words:string[],at:number,w:number):number {
 let n=words[at].length,k=1;
 while(at+k<words.length&&n+1+words[at+k].length<=w){n+=1+words[at+k].length;k++;}
 return k;
}
export function ptycheUndo(text:string):string {
 const finalLF=text.endsWith('\n')?'\n':'';
 return (finalLF?text.slice(0,-1):text).split('\n\n').map(p=>{
  if(!p.startsWith('↵'))return p;
  const m=/^↵([1-9]\d{0,3})(?:\/([^|]*))?\|([^]*)$/.exec(p);
  if(!m)throw new Error('PTYCHE malformed block');
  const words=wordsOf(m[3]);if(!words||m[3].includes('\n'))throw new Error('PTYCHE malformed words');
  const fixes=new Map<number,number>();
  if(m[2]!==undefined)for(const pair of m[2].split(',')){
   if(!/^[1-9]\d*:-?[1-9]\d*$/.test(pair))throw new Error('PTYCHE malformed correction');
   const [line,delta]=pair.split(':').map(Number);
   if(fixes.has(line)||!Number.isSafeInteger(line)||!Number.isSafeInteger(delta))throw new Error('PTYCHE duplicate/unsafe correction');
   fixes.set(line,delta);
  }
  const out:string[]=[];let at=0,line=1;
  while(at<words.length){const k=greedyCount(words,at,+m[1])+(fixes.get(line)??0);fixes.delete(line);
   if(k<=0||at+k>words.length)throw new Error('PTYCHE invalid boundary');
   out.push(words.slice(at,at+k).join(' '));at+=k;line++;
  }
  if(fixes.size)throw new Error('PTYCHE unused corrections');
  return out.join('\n');
 }).join('\n\n')+finalLF;
}
export function ptychePlan(text:string,enc:EncodingName='o200k_base',maxPatches=3):PtychePlan|null {
 if(text.length>50000||text.includes('↵')||text.includes('\r'))return null;
 let blocks=0,patches=0,removedBreaks=0;
 const finalLF=text.endsWith('\n')?'\n':'';
 const folded=(finalLF?text.slice(0,-1):text).split('\n\n').map(p=>{
  const words=wordsOf(p),lines=p.split('\n');if(!words||lines.length<3)return p;
  let best=p,cost=countTokens(p,enc),bc=0;
  // Width candidates are source line lengths; do not fit content or corpus IDs.
  const widths=[...new Set(lines.slice(0,-1).map(l=>l.length))].filter(w=>w>=40&&w<=160).slice(0,32);
  for(const w of widths){let at=0;const fixes:string[]=[];
   for(let i=0;i<lines.length;i++){
    const actual=lines[i].split(' ').length,delta=actual-greedyCount(words,at,w);
    if(delta)fixes.push(`${i+1}:${delta}`);at+=actual;
   }
   if(fixes.length>maxPatches)continue;
   const candidate=`↵${w}${fixes.length?'/'+fixes.join(','):''}|`+words.join(' ');
   const n=countTokens(candidate,enc);
   if(n<cost&&ptycheUndo(candidate)===p){best=candidate;cost=n;bc=fixes.length;}
  }
  if(best!==p){blocks++;patches+=bc;removedBreaks+=lines.length-1;}return best;
 }).join('\n\n')+finalLF;
 if(!blocks||ptycheUndo(folded)!==text)return null;
 return {folded,blocks,patches,removedBreaks};
}
/** Width-default arm: marker ~ carries a local width only when it differs from
 * the declared default. Exact zero-residual specialization, not a new primitive.
 * Unlike the raw-price-gated planner, all eligible paragraphs reach the parent.
 */
export function ptycheDefaultPlan(text:string,defaultWidth:number):PtychePlan|null {
 if(text.length>50000||text.includes('~')||text.includes('↵')||text.includes('\r')||!Number.isInteger(defaultWidth)||defaultWidth<40||defaultWidth>160)return null;
 const finalLF=text.endsWith('\n')?'\n':'';let blocks=0,removedBreaks=0;
 const folded=(finalLF?text.slice(0,-1):text).split('\n\n').map(p=>{
  const words=wordsOf(p),lines=p.split('\n');if(!words||lines.length<3)return p;
  const widths=[defaultWidth,...new Set(lines.slice(0,-1).map(l=>l.length))].filter(w=>w>=40&&w<=160).slice(0,33);
  for(const w of widths){const marker=`↵${w}|`,body=words.join(' ');
   if(ptycheUndo(marker+body)!==p)continue;
   blocks++;removedBreaks+=lines.length-1;return `~${w===defaultWidth?'':w}|`+body;
  }
  return p;
 }).join('\n\n')+finalLF;
 if(!blocks||ptycheDefaultUndo(folded,defaultWidth)!==text)return null;
 return {folded,blocks,patches:0,removedBreaks};
}
export function ptycheDefaultUndo(text:string,defaultWidth:number):string {
 if(text.includes('↵')||!Number.isInteger(defaultWidth)||defaultWidth<40||defaultWidth>160)throw new Error('PTYCHE marker/default');
 const expanded=text.replace(/(^|\n\n)~(\d*)\|/g,(_,sep,w)=>sep+`↵${w||defaultWidth}|`);
 if(expanded.includes('~'))throw new Error('PTYCHE malformed default marker');
 return ptycheUndo(expanded);
}
/** Interval-stabbing choice: select the smallest width supported by the most
 * eligible paragraph intervals. Exhaustive 121-point search, not learned routing.
 * Only standard <=160-column ASCII paragraphs are proposed; round trip arbitrates.
 */
export function ptycheWidth(text:string):number|null {
 if(text.length>50000)return null;
 const intervals:{lo:number;hi:number}[]=[];
 for(const p of text.replace(/\n$/,'').split('\n\n')){
  const lines=p.split('\n');if(lines.length<3||!wordsOf(p))continue;
  const lo=Math.max(40,...lines.map(l=>l.length));
  let hi=160;for(let i=0;i<lines.length-1;i++)hi=Math.min(hi,lines[i].length+lines[i+1].split(' ')[0].length);
  if(lo<=hi)intervals.push({lo,hi});
 }
 let width:number|null=null,best=0;
 for(let w=40;w<=160;w++){const score=intervals.filter(x=>x.lo<=w&&w<=x.hi).length;if(score>best){best=score;width=w;}}
 return width;
}
export const ptycheDefaultKey=(w:number)=>`¶ k=v; expand recursively. Replace ~W|paragraph by its greedy W-column wrap (default W=${w}). Print only.\n`;
/** One additional parent call; no speedup claim. Complete emitted-message gate. */
export function ptycheDefaultFromFrontier(text:string,base:string,encodeParent:(s:string)=>string,decodeParent:(s:string)=>string,enc:EncodingName='o200k_base') {
 const width=ptycheWidth(text);if(width===null)return null;
 const plan=ptycheDefaultPlan(text,width);if(!plan)return null;
 const parent=encodeParent(plan.folded);
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>parent.startsWith(p+'§'));
 if(!pre)return null;
 const message=ptycheDefaultKey(width)+parent.slice(pre.length),tokens=countTokens(message,enc);
 if(tokens>=countTokens(base,enc))return null;
 try{if(ptycheDefaultUndo(decodeParent(parent),width)!==text)return null;}catch{return null;}
 return {message,tokens,defaultWidth:width,...plan};
}
export function ptycheFromFrontier(text:string,base:string,encodeParent:(s:string)=>string,decodeParent:(s:string)=>string,enc:EncodingName='o200k_base') {
 const plan=ptychePlan(text,enc);if(!plan)return null;
 const parent=encodeParent(plan.folded),message=PTYCHE_KEY+parent;
 if(countTokens(message,enc)>=countTokens(base,enc))return null;
 if(ptycheUndo(decodeParent(parent))!==text)return null;
 return {message,tokens:countTokens(message,enc),...plan};
}
