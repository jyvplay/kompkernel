/** X190 DIPIGI (two sources): two-parent lexical splice dictionary.
 * Experimental/unwired. Relative-compression / straight-line-DAG ancestry.
 * Extends single-parent affix borrowing, not a new mathematical primitive.
 * No native-model claim. Complete reader key and dictionary must be paid.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const DIPIGI_CAP=50000;
export const DIPIGI_KEY='Decode payload first. JSON [entries,body]. Entries are numbered from 1 in order. A string entry is literal. [l,p,m,r,s] is the first p ASCII characters of earlier entry l, followed by literal m, then the last s ASCII characters of earlier entry r; s=0 means empty. Replace each ~N; in body once by entry N, without rescanning. Preserve all other characters; print only.\n';
type Row=string|[number,number,string,number,number];
const word=/^[A-Za-z0-9_./-]{1,96}$/;
function domain(s:string){if(s.length>DIPIGI_CAP||!isUtf8TransportStable(s))throw Error('DIPIGI source domain');}
export function dipigiUndo(folded:string){
 if(folded.length>150000||!isUtf8TransportStable(folded))throw Error('DIPIGI frame');
 const v:unknown=JSON.parse(folded);
 if(!Array.isArray(v)||v.length!==2||!Array.isArray(v[0])||v[0].length>64||typeof v[1]!=='string'||v[1].length>150000)throw Error('DIPIGI tuple');
 const words:string[]=[];
 for(const row of v[0]){
  let w:string;
  if(typeof row==='string')w=row;
  else{
   if(!Array.isArray(row)||row.length!==5||![row[0],row[1],row[3],row[4]].every(Number.isSafeInteger)||typeof row[2]!=='string'||! /^[A-Za-z0-9_./-]*$/.test(row[2]))throw Error('DIPIGI edge');
   const [l,p,m,r,s]=row;
   if(l<1||r<1||l>words.length||r>words.length||p<0||s<0||p>words[l-1].length||s>words[r-1].length||p+m.length+s>96)throw Error('DIPIGI range');
   w=words[l-1].slice(0,p)+m+(s?words[r-1].slice(-s):'');
  }
  if(!word.test(w)||words.includes(w))throw Error('DIPIGI word');words.push(w);
 }
 let out='',last=0;
 for(const m of v[1].matchAll(/~([1-9][0-9]?);/g)){
  const literal=v[1].slice(last,m.index);if(literal.includes('~')||+m[1]>words.length)throw Error('DIPIGI marker');
  out+=literal+words[+m[1]-1];if(out.length>DIPIGI_CAP)throw Error('DIPIGI expansion');last=m.index!+m[0].length;
 }
 const tail=v[1].slice(last);if(tail.includes('~'))throw Error('DIPIGI tail');out+=tail;domain(out);return out;
}
function prefix(a:string,b:string){let n=0;while(n<Math.min(a.length,b.length)&&a[n]===b[n])n++;return n;}
function suffix(a:string,b:string){let n=0;while(n<Math.min(a.length,b.length)&&a[a.length-1-n]===b[b.length-1-n])n++;return n;}
export function dipigiPlans(source:string,enc:EncodingName='o200k_base',force=false){
 domain(source);if(source.includes('~')||source.includes('<|'))return [];
 const freq=new Map<string,number>();for(const w of source.match(/[A-Za-z0-9_./-]+/g)??[])if(w.length>=6&&w.length<=96)freq.set(w,(freq.get(w)??0)+1);
 const ranked=[...freq].sort((a,b)=>b[0].length*b[1]-a[0].length*a[1]||(a[0]<b[0]?-1:1)).slice(0,64);
 const plans:{cap:number;order:string;twoParents:number;probes:number;folded:string;message:string;tokens:number}[]=[];
 for(const cap of [8,24,64])for(const order of ['length','frequency']){
  const selected=ranked.slice(0,cap).map(x=>x[0]);if(order==='length')selected.sort((a,b)=>a.length-b.length||(a<b?-1:1));
  if(!selected.length)continue;
  const rows:Row[]=[],words:string[]=[];let probes=0,twoParents=0;
  for(const w of selected){
   let best:Row=w,cost=countTokensExact(JSON.stringify(w),enc),covered=0;
   const left=words.map((v,i)=>({i,n:prefix(v,w)})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n||a.i-b.i).slice(0,8);
   const right=words.map((v,i)=>({i,n:suffix(v,w)})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n||a.i-b.i).slice(0,8);
   for(const a of left)for(const b of right){
    const p=a.n,s=Math.min(b.n,w.length-p);if(!s||a.i===b.i)continue;
    const row:Row=[a.i+1,p,w.slice(p,w.length-s),b.i+1,s];probes++;
    const n=countTokensExact(JSON.stringify(row),enc);if(force?(p+s>=8&&(p+s>covered||(p+s===covered&&n<cost))):n<cost){best=row;cost=n;covered=p+s;}
   }
   rows.push(best);words.push(w);if(Array.isArray(best))twoParents++;
  }
  const ids=new Map(words.map((w,i)=>[w,i+1]));
  const body=source.replace(/[A-Za-z0-9_./-]+/g,w=>ids.has(w)?'~'+ids.get(w)+';':w),folded=JSON.stringify([rows,body]);
  if(folded.length>150000||plans.some(p=>p.folded===folded))continue;
  if(dipigiUndo(folded)!==source)throw Error('DIPIGI inverse');
  const message=DIPIGI_KEY+folded;plans.push({cap,order,twoParents,probes,folded,message,tokens:countTokensExact(message,enc)});
 }
 return plans.sort((a,b)=>a.tokens-b.tokens||a.cap-b.cap);
}
export function dipigiRead(message:string,parent:(s:string)=>string=s=>s){
 if(!message.startsWith(DIPIGI_KEY)||message.length>152000)throw Error('DIPIGI contract');
 return dipigiUndo(parent(message.slice(DIPIGI_KEY.length)));
}
