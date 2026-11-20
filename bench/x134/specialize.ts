import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
import {glyphSetFor,parseTape,buildTape} from '../../src/lib/omega/euros';
import {chironDecode} from '../../src/lib/omega/chiron';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line); const M=a.message as string, at=M.indexOf('§'), end=M.indexOf('¶',at);
 if(at<0||end<0)continue;
 const pre=M.slice(0,at);let rules=parseTape(M.slice(at,end),glyphSetFor(a.text,M)),body=M.slice(end);
 if(!rules.length||rules.some(r=>!/[\u0400-\u04ff]/.test(r.g))||pre+buildTape(rules)+body!==M)continue;
 let best=M,bestN=ct(M),moves:any[]=[];const t=Date.now();
 const used=new Set([...a.text,...M]); const pool=Array.from({length:256},(_,i)=>String.fromCodePoint(i+1024)).filter(g=>!used.has(g));
 const target=chironDecode(M.slice(at));
 for(let pass=0;pass<5;pass++){
  const counts=new Map<string,number>(); const G=new Set(rules.map(r=>r.g));
  for(let len=2;len<=8;len++)for(let i=1;i+len<=body.length;i++){
   const s=body.slice(i,i+len);if(![...s].some(c=>G.has(c)))continue;
   counts.set(s,(counts.get(s)??0)+1);
  }
  const cands=[...counts].filter(([s,n])=>n>=3).sort((a,b)=>b[1]*ct(b[0])-a[1]*ct(a[0])).slice(0,60);
  let pick:any=null;
  for(const [s,n] of cands)for(const h of pool){
   if(used.has(h))continue;
   const b=body.split(s).join(h),rs=[...rules,{g:h,v:s}],m=pre+buildTape(rs)+b,nt=ct(m);
   if(nt >= (pick?.nt??bestN))continue;
   if(chironDecode(m.slice(at))!==target)continue;
   pick={m,nt,rs,b,h,s,n};
  }
  if(!pick)break;best=pick.m;bestN=pick.nt;rules=pick.rs;body=pick.b;used.add(pick.h);moves.push([pick.h,pick.s,pick.n]);
 }
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:bestN,delta:bestN-a.tokens,ms:Date.now()-t,moves}));
}
