/** X189 ANAPLASIS: bounded non-monotone grammar reconstruction.
 * Experimental/unwired. CHIRON wire; no new reader vocabulary.
 * Delete-then-remine/factor candidates are priced as a joint move, even when
 * deletion alone is worse. Classical ruin/recreate ancestry; novelty unproved.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
import {chironDecode,chironOpsUsed,chironParseTape,chironInScript} from './chiron';
type Rule={g:string;v:string};type State={rs:Rule[];body:string;removed:string[]};
export const ANAPLASIS_CAP=50000;
export type AnaplasisFamily='delete'|'remine'|'factor'|'rename'|'reorder'|'alias';
export const ANAPLASIS_FAMILIES:AnaplasisFamily[]=['delete','remine','factor','rename','reorder','alias'];
export function anaplasisTrial(message:string,source:string,enc:EncodingName='o200k_base',family:AnaplasisFamily='remine',ranking:'chars'|'tokens'|'boundary'='tokens'){
 if(!['chars','tokens','boundary'].includes(ranking))throw Error('ANAPLASIS ranking');
 if(!ANAPLASIS_FAMILIES.includes(family))throw Error('ANAPLASIS family');
 const key=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(k=>message.startsWith(k+'§'));
 if(!key||message.length>ANAPLASIS_CAP||source.length>ANAPLASIS_CAP||message.includes('<|')||!isUtf8TransportStable(message)||!isUtf8TransportStable(source))return null;
 const wire=message.slice(key.length),ops=chironOpsUsed(wire),cut=wire.indexOf('¶');
 if(!ops.script||ops.rep||ops.fill||ops.range||ops.split||cut<2)return null;
 const parsed=chironParseTape(wire.slice(1,cut),ops.script);
 if(!parsed||parsed.length<2||parsed.length>128)return null;
 const seen=new Set<string>();
 for(const r of parsed){if(!r.raw.length||[...r.raw].some(c=>chironInScript(ops.script!,c.codePointAt(0)!)&&!seen.has(c)))return null;seen.add(r.glyph);}
 const initial:State={rs:parsed.map(r=>({g:r.glyph,v:r.raw})),body:wire.slice(cut+1),removed:[]};
 const bounded=(s:State)=>{
  const map=new Map<string,string>();let total=0;
  for(const r of s.rs){let v='';for(const c of r.v){v+=map.get(c)??c;if(v.length>ANAPLASIS_CAP)return false;}map.set(r.g,v);total+=v.length;if(total>ANAPLASIS_CAP*128)return false;}
  let n=0;for(const c of s.body){n+=(map.get(c)??c).length;if(n>ANAPLASIS_CAP)return false;}return true;
 };
 if(!bounded(initial)||chironDecode(wire)!==source)return null;
 const emit=(s:State)=>key+'§'+s.rs.map(r=>r.g+r.v).join('')+'¶'+s.body;
 const baseTokens=countTokens(message,enc);let best=message,tokens=baseTokens,probes=0,exactRejects=0,winner:any=null;
 const evaluate=(s:State,move:string,seedTokens:number)=>{
  if(probes>=4096||!s.rs.length||s.rs.length>128)return;
  const m=emit(s);if(m.length>ANAPLASIS_CAP||!bounded(s))return;probes++;
  const n=countTokens(m,enc);if(n>=tokens)return;
  if(chironDecode(m.slice(key.length))!==source){exactRejects++;return;}
  best=m;tokens=n;winner={move,removed:s.removed,seedTokens,barrier:seedTokens>baseTokens};
 };
 const drop=(s:State,g:string):State=>{
  const r=s.rs.find(r=>r.g===g)!;
  return {rs:s.rs.filter(x=>x.g!==g).map(x=>({g:x.g,v:x.v.split(g).join(r.v)})),body:s.body.split(g).join(r.v),removed:[...s.removed,g]};
 };
 // Keep independently priced costly intermediate states, unlike monotone search.
 const seeds:{s:State;n:number}[]=[{s:initial,n:baseTokens}];
 const pool=initial.rs.slice(-12).reverse();
 for(let i=0;i<pool.length;i++){
  const s=drop(initial,pool[i].g);if(emit(s).length<=ANAPLASIS_CAP&&bounded(s))seeds.push({s,n:countTokens(emit(s),enc)});
  if(i<6)for(let j=i+1;j<6&&j<pool.length;j++){
   const s=drop(drop(initial,pool[i].g),pool[j].g);if(s.rs.length&&emit(s).length<=ANAPLASIS_CAP&&bounded(s))seeds.push({s,n:countTokens(emit(s),enc)});
  }
 }
 const ranked=[seeds[0],...seeds.slice(1).sort((a,b)=>a.n-b.n).slice(0,12)];
 const sourceChars=new Set([...source]);
 const fresh=(s:State)=>{
  const occupied=new Set([...s.rs.map(r=>r.g).join(''),...s.rs.map(r=>r.v).join(''),...s.body]);
  const out:string[]=[];
  // Same alphabet as parent, never introduce literal/script ambiguity.
  for(let cp=0x370;cp<=0x6ff;cp++){const g=String.fromCharCode(cp);if(chironInScript(ops.script!,cp)&&!occupied.has(g)&&!sourceChars.has(g))out.push(g);}
  return out.sort((a,b)=>countTokens(a,enc)-countTokens(b,enc)||a.charCodeAt(0)-b.charCodeAt(0)).slice(0,4);
 };
 for(const {s,n} of ranked){
  if(probes>=4096)break;
  evaluate(s,'delete',n);if(family==='delete')continue;
  const glyphs=fresh(s);if(!glyphs.length)continue;
  if(family==='remine'||family==='factor'){
   const counts=new Map<string,number>();
   const texts=family==='factor'?[...s.rs.map(r=>r.v),s.body]:[s.body];
   // Fixed work cap: at most 24 lengths per input position, 50k input units.
   for(const text of texts)for(let size=2;size<=24;size++)for(let at=0;at+size<=text.length;at++){
    const v=text.slice(at,at+size);if(v.includes('¶')||v.startsWith('×')||v.startsWith('…')||/[\uD800-\uDFFF]/.test(v))continue;
    counts.set(v,(counts.get(v)??0)+1);
   }
   const shortlist=[...counts].filter(([,c])=>c>=2).sort((a,b)=>(b[1]-1)*b[0].length-(a[1]-1)*a[0].length||a[0].localeCompare(b[0])).slice(0,384);
   // Ranking only, never an acceptance bound: overlaps and BPE context can
   // invalidate this proxy. Final acceptance always prices the full envelope.
   const scores=new Map(shortlist.map(([v,c])=>[v,(c-1)*countTokens(v,enc)-c]));
   const candidates=(ranking==='chars'?shortlist:shortlist.filter(([v])=>ranking!=='boundary'||/^\s/.test(v)||/\s$/.test(v)).sort((a,b)=>scores.get(b[0])!-scores.get(a[0])!||a[0].localeCompare(b[0]))).slice(0,32);
   for(const [v] of candidates)for(const g of glyphs){
    const used=new Set([...v]);let insert=0;
    for(let i=0;i<s.rs.length;i++)if(used.has(s.rs[i].g))insert=i+1;
    const rs=s.rs.map((r,i)=>({g:r.g,v:family==='factor'&&i>=insert?r.v.split(v).join(g):r.v}));
    if(family==='remine')insert=rs.length;
    rs.splice(insert,0,{g,v});
    evaluate({rs,body:s.body.split(v).join(g),removed:s.removed},family,n);
   }
  }else if(family==='rename'){
   for(const r of s.rs)for(const g of glyphs)evaluate({rs:s.rs.map(x=>({g:x.g===r.g?g:x.g,v:x.v.split(r.g).join(g)})),body:s.body.split(r.g).join(g),removed:s.removed},family,n);
  }else if(family==='reorder'){
   for(let i=0;i<s.rs.length;i++)for(let j=0;j<s.rs.length;j++){
    if(probes>=4096)break;
    const rs=[...s.rs],r=rs.splice(i,1)[0];rs.splice(j,0,r);
    const seen=new Set<string>(),names=new Set(rs.map(r=>r.g));let valid=true;
    for(const r of rs){if([...r.v].some(c=>names.has(c)&&!seen.has(c))){valid=false;break;}seen.add(r.g);}
    if(valid)evaluate({rs,body:s.body,removed:s.removed},family,n);
   }
  }else if(family==='alias'){
   for(const r of s.rs)for(const g of glyphs)for(const side of [' ','\n','.',',']){
    const body=s.body.split(side+r.g).join(side+g);if(body===s.body)continue;
    evaluate({rs:[...s.rs,{g,v:r.g}],body,removed:s.removed},family,n);
   }
  }
 }
 return {message:best,tokens,baseTokens,probes,exactRejects,winner,seeds:seeds.length,retainedSeeds:ranked.length,sourceExact:chironDecode(best.slice(key.length))===source,family,ranking};
}
export function anaplasisFromFrontier(message:string,source:string,enc:EncodingName='o200k_base'){
 const r=anaplasisTrial(message,source,enc,'remine');return r&&r.tokens<r.baseTokens?r:null;
}
