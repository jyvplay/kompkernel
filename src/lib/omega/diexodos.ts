/** X191 DIEXODOS (a way through): unique fixed-length graph bridges.
 * Experimental/unwired. In-band adjacency graph, literal endpoints, erased
 * field count. Unlike a causal predictor, branches can be resolved by the
 * RIGHT endpoint. Classical constrained-path ancestry; all-stack novelty and
 * native LLM decoding are NOT established. No external vocabulary.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const DIEXODOS_KEY='Decode payload first. JSON [rows,body]. Each row [field,successors] lists allowed next fields; split successors and body on ASCII spaces retaining empty fields. In body, ~N; replaces N fields: fill them with the UNIQUE directed walk of N+1 edges from the preceding literal field to the following literal field in rows. Endpoints stay once; reject absent or ambiguous walks. Join fields with ASCII spaces, preserve every other character; print only.\n';
const CAP=50000,FRAME=200000;
function domain(s:string,cap=CAP){if(s.length>cap||!isUtf8TransportStable(s))throw Error('DIEXODOS domain');}
function field(x:unknown):x is string{return typeof x==='string'&&x.length<=96&&!x.includes(' ')&&!x.includes('~')&&isUtf8TransportStable(x);}
export type BridgeGraph=Map<string,string[]>;
/** Saturated path-count DP: 0, 1, or >=2. Cycles are allowed, length is fixed.
 * No probabilistic tie break and no use of original source during decoding. */
export function uniqueBridge(g:BridgeGraph,left:string,right:string,n:number):string[]|null{
 if(!Number.isSafeInteger(n)||n<1||n>8)throw Error('DIEXODOS length');
 if(!g.has(left))return null;
 const levels:Map<string,number>[]=[new Map([[right,1]])];
 for(let d=1;d<=n+1;d++){
  const next=new Map<string,number>();for(const [a,bs] of g){let count=0;for(const b of bs)count=Math.min(2,count+(levels[d-1].get(b)??0));if(count)next.set(a,count);}levels.push(next);
 }
 if(levels[n+1].get(left)!==1)return null;
 const out:string[]=[];let at=left;
 for(let d=n+1;d>=1;d--){const choices=(g.get(at)??[]).filter(b=>(levels[d-1].get(b)??0)>0);if(choices.length!==1)throw Error('DIEXODOS DP invariant');at=choices[0];if(d>1)out.push(at);}
 if(at!==right)throw Error('DIEXODOS endpoint');return out;
}
export function diexodosUndo(folded:string){
 domain(folded,FRAME);const v:unknown=JSON.parse(folded);
 if(!Array.isArray(v)||v.length!==2||!Array.isArray(v[0])||v[0].length>256||typeof v[1]!=='string')throw Error('DIEXODOS frame');
 const g:BridgeGraph=new Map();let edges=0;
 for(const row of v[0]){
  if(!Array.isArray(row)||row.length!==2||!field(row[0])||typeof row[1]!=='string'||g.has(row[0]))throw Error('DIEXODOS row');
  const bs=row[1].split(' ');if(!bs.every(field)||new Set(bs).size!==bs.length||(edges+=bs.length)>512)throw Error('DIEXODOS edges');g.set(row[0],bs);
 }
 const tape=v[1].split(' '),out:string[]=[];let units=0,holes=0;
 for(let i=0;i<tape.length;i++){
  const t=tape[i];let add:string[];
  if(t.includes('~')){
   if(!/^~[1-8];$/.test(t)||i===0||i+1===tape.length||tape[i-1].includes('~')||tape[i+1].includes('~')||++holes>1024)throw Error('DIEXODOS marker');
   const bridge=uniqueBridge(g,tape[i-1],tape[i+1],Number(t[1]));if(!bridge)throw Error('DIEXODOS ambiguous or absent');add=bridge;
  }else add=[t];
  for(const w of add){units+=w.length+(out.length?1:0);if(units>CAP)throw Error('DIEXODOS expansion');out.push(w);}
 }
 const source=out.join(' ');domain(source);return source;
}
export function diexodosPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('~')||source.includes('<|'))return [];
 const fields=source.split(' '),freq=new Map<string,{a:string;b:string;count:number}>();
 for(let i=1;i<fields.length;i++){const a=fields[i-1],b=fields[i];if(!field(a)||!field(b))continue;const k=JSON.stringify([a,b]),old=freq.get(k);if(old)old.count++;else freq.set(k,{a,b,count:1});}
 const ranked=[...freq.values()].sort((a,b)=>b.count-a.count||(a.a+a.b<b.a+b.b?-1:1));
 const plans:{folded:string;message:string;tokens:number;edges:number;holes:number;erased:number;branched:number;budget:number;min:number;maxGap:number}[]=[];
 for(const budget of [32,128,512])for(const min of [2,3])for(const maxGap of [3,8]){
  const g:BridgeGraph=new Map();let edges=0;
  for(const e of ranked.filter(e=>e.count>=min).slice(0,budget)){if(!g.has(e.a)&&g.size>=256)continue;const bs=g.get(e.a)??[];bs.push(e.b);g.set(e.a,bs);edges++;}
  if(!edges)continue;
  const tape:string[]=[];let holes=0,erased=0,branched=0;
  for(let i=0;i<fields.length;i++){
   tape.push(fields[i]);if(holes>=1024)continue;
   for(let n=Math.min(maxGap,fields.length-i-2);n>=1;n--){
    const b=uniqueBridge(g,fields[i],fields[i+n+1],n);if(!b||b.some((w,j)=>w!==fields[i+j+1]))continue;
    if(countTokensExact(' ~'+n+';',enc)>=countTokensExact(' '+b.join(' '),enc))continue;
    tape.push('~'+n+';');holes++;erased+=n;let at=fields[i];if([at,...b].some(w=>(g.get(w)?.length??0)>1))branched++;i+=n;break;
   }
  }
  if(!holes)continue;
  // Keep exactly the union of witnessed bridge edges. Deleting other edges
  // cannot create a second walk, and every chosen walk remains present.
  const used:BridgeGraph=new Map();
  for(let i=1;i+1<tape.length;i++)if(/^~[1-8];$/.test(tape[i])){
   const bridge=uniqueBridge(g,tape[i-1],tape[i+1],Number(tape[i][1]));if(!bridge)throw Error('DIEXODOS prune witness');
   const path=[tape[i-1],...bridge,tape[i+1]];
   for(let j=1;j<path.length;j++){const bs=used.get(path[j-1])??[];if(!bs.includes(path[j]))bs.push(path[j]);used.set(path[j-1],bs);}
  }
  edges=[...used.values()].reduce((n,bs)=>n+bs.length,0);branched=0;
  for(let i=1;i+1<tape.length;i++)if(/^~[1-8];$/.test(tape[i])){const bridge=uniqueBridge(used,tape[i-1],tape[i+1],Number(tape[i][1]));if(!bridge)throw Error('DIEXODOS prune broke bridge');if([tape[i-1],...bridge].some(w=>(used.get(w)?.length??0)>1))branched++;}
  const folded=JSON.stringify([[...used].map(([a,bs])=>[a,bs.join(' ')]),tape.join(' ')]);if(folded.length>FRAME||plans.some(p=>p.folded===folded))continue;
  if(diexodosUndo(folded)!==source)throw Error('DIEXODOS inverse');const message=DIEXODOS_KEY+folded;
  plans.push({folded,message,tokens:countTokensExact(message,enc),edges,holes,erased,branched,budget,min,maxGap});
 }
 return plans.sort((a,b)=>a.tokens-b.tokens);
}
export function diexodosRead(message:string,parent:(s:string)=>string=s=>s){if(!message.startsWith(DIEXODOS_KEY)||message.length>202000)throw Error('DIEXODOS contract');return diexodosUndo(parent(message.slice(DIEXODOS_KEY.length)));}
