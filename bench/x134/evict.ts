import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
import {glyphSetFor,parseTape,buildTape} from '../../src/lib/omega/euros';
import {chironDecode} from '../../src/lib/omega/chiron';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line); const M=a.message as string, at=M.indexOf('§'), end=M.indexOf('¶',at);
 if(at<0||end<0)continue;
 const pre=M.slice(0,at), rules=parseTape(M.slice(at,end),glyphSetFor(a.text,M)), body=M.slice(end);
 if(!rules.length||rules.some(r=>!/[\u0400-\u04ff]/.test(r.g))||pre+buildTape(rules)+body!==M)continue;
 let best=M, bestN=ct(M), moves:any[]=[];const t=Date.now();
 const used=new Set([...a.text,...M]); const pool=Array.from({length:256},(_,i)=>String.fromCodePoint(i+1024)).filter(g=>!used.has(g));
 const target=chironDecode(M.slice(at));
 for(const victim of rules){
  // Prefer least expensive empty slot. Whole-message score includes displacement.
  const ranked=pool.map(j=>({j,n:ct(M.split(victim.g).join(j))})).sort((a,b)=>a.n-b.n);
  const pick=ranked[0];if(!pick)continue;
  for (const replacement of [pick.j,victim.v]) {
  const rename=(s:string)=>s.split(victim.g).join(replacement);
  const rs=rules.filter(r=>replacement===pick.j||r.g!==victim.g).map(r=>({g:r.g===victim.g?pick.j:r.g,v:rename(r.v)})), b0=rename(body), h=victim.g;
  for(const r of rs){
   const pos:number[]=[];for(let i=1;i<b0.length;i++)if(b0[i]===r.g)pos.push(i);
   if(pos.length<2)continue;
   let b='',last=0,n=0;
   for(const p of pos){const lo=Math.max(1,p-12),hi=Math.min(b0.length,p+13);
    if(ct(b0.slice(lo,p)+h+b0.slice(p+1,hi))<ct(b0.slice(lo,hi))){b+=b0.slice(last,p)+h;last=p+1;n++;}
   }
   if(n<2)continue;b+=b0.slice(last);
   const m=pre+buildTape([...rs,{g:h,v:r.g}])+b, nt=ct(m);
   if(nt<bestN&&chironDecode(m.slice(at))===target){best=m;bestN=nt;moves=[h,replacement,r.g,n];}
  }
 }
 }
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:bestN,delta:bestN-a.tokens,ms:Date.now()-t,moves}));
}
