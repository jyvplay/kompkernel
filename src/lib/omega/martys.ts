/** X192 MARTYS (witness): globally literal-witnessed substring references.
 * Experimental/unwired. A reference may point forward but cannot define its
 * own witness. Related to MNEMA and dictionary addressing, not new mathematics.
 * Native-model decoding and all-stack novelty are not established.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const MARTYS_KEY='Decode payload first. Words are maximal ASCII letter runs. Replace each ^fragment with the unique DISTINCT literal word in the payload containing fragment, case-sensitive. Reference fragments are not literal words; replacements are not rescanned. Preserve everything else; print only.\n';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('MARTYS domain');}
function events(s:string){const ms=[...s.matchAll(/\^[A-Za-z]+|[A-Za-z]+/g)];if(ms.length>10000||ms.some(m=>m[0].length>(m[0][0]==='^'?5:96)))throw Error('MARTYS word cap');return ms;}
export function martysUndo(body:string){
 domain(body);const ms=events(body),words=[...new Set(ms.filter(m=>m[0][0]!=='^').map(m=>m[0]))];
 let last=0,out='';const cache=new Map<string,string>();
 for(const m of ms){const raw=body.slice(last,m.index);if(raw.includes('^'))throw Error('MARTYS marker');out+=raw;let w=m[0];
  if(w[0]==='^'){
   const p=w.slice(1);if(p.length>4)throw Error('MARTYS fragment');let hit=cache.get(p);
   if(hit===undefined){const matches=words.filter(x=>x.includes(p));if(matches.length!==1)throw Error('MARTYS absent or ambiguous');hit=matches[0];cache.set(p,hit);}w=hit;
  }
  out+=w;if(out.length>CAP)throw Error('MARTYS expansion');last=m.index!+m[0].length;
 }
 const tail=body.slice(last);if(tail.includes('^'))throw Error('MARTYS marker');out+=tail;domain(out);return out;
}
export function martysPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('^')||source.includes('<|'))return [];
 const ms=events(source);if(ms.some(m=>m[0].length>96))return [];
 const freq=new Map<string,number[]>();for(let i=0;i<ms.length;i++){const w=ms[i][0],p=freq.get(w)??[];p.push(i);freq.set(w,p);}
 // The literal-word SET is preserved by retaining one witness for every word.
 const index=new Map<string,string|null>();for(const w of freq.keys())for(let at=0;at<w.length;at++)for(let len=1;len<=4&&at+len<=w.length;len++){
  const p=w.slice(at,at+len),old=index.get(p);if(old===undefined)index.set(p,w);else if(old!==w)index.set(p,null);
 }
 const ranked=[...freq].filter(([w,ps])=>w.length>=6&&ps.length>=2).sort((a,b)=>b[0].length*(b[1].length-1)-a[0].length*(a[1].length-1)||a[0].localeCompare(b[0])).slice(0,64);
 const plans:{folded:string;message:string;tokens:number;cap:number;width:number;anchor:string;minSaving:number;sites:number;forward:number}[]=[];
 for(const cap of [16,64])for(const width of [2,4])for(const anchor of ['first','last'])for(const minSaving of [0,1]){
  const aliases=new Map<string,string>();
  for(const [w] of ranked.slice(0,cap)){
   let best='',price=Infinity;
   for(let at=0;at<w.length;at++)for(let len=1;len<=width&&at+len<=w.length;len++){
    const p=w.slice(at,at+len);if(index.get(p)!==w)continue;const c=countTokensExact('^'+p,enc);
    if(c<price||c===price&&(p.length<best.length||p.length===best.length&&p<best)){best=p;price=c;}
   }
   if(best)aliases.set(w,best);
  }
  let folded='',last=0,sites=0,forward=0;
  for(let i=0;i<ms.length;i++){
   const m=ms[i],w=m[0],ps=freq.get(w)!,keep=anchor==='first'?ps[0]:ps[ps.length-1],p=aliases.get(w);let out=w;
   if(p&&i!==keep){const at=m.index!,left=source.slice(Math.max(0,at-1),at),right=source.slice(at+w.length,at+w.length+1),ref='^'+p;
    if(countTokensExact(left+w+right,enc)-countTokensExact(left+ref+right,enc)>=minSaving){out=ref;sites++;if(i<keep)forward++;}}
   folded+=source.slice(last,m.index)+out;last=m.index!+w.length;
  }
  folded+=source.slice(last);if(!sites||plans.some(p=>p.folded===folded))continue;
  if(martysUndo(folded)!==source)throw Error('MARTYS inverse');const message=MARTYS_KEY+folded;
  plans.push({folded,message,tokens:countTokensExact(message,enc),cap,width,anchor,minSaving,sites,forward});
 }
 return plans.sort((a,b)=>a.tokens-b.tokens);
}
export function martysRead(message:string,parent:(s:string)=>string=s=>s){if(!message.startsWith(MARTYS_KEY)||message.length>CAP+1000)throw Error('MARTYS contract');return martysUndo(parent(message.slice(MARTYS_KEY.length)));}
