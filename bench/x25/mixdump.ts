import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const PRETOK=/[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
function chunks(s:string){PRETOK.lastIndex=0;const o:string[]=[];let m;while((m=PRETOK.exec(s)))o.push(m[0]);return o;}
const isL=(c:string)=>/\p{L}/u.test(c), isN=(c:string)=>/\p{N}/u.test(c), isS=(c:string)=>/\s/.test(c);
function isMix(c:string){
  const body=c.replace(/^\s/,''); if(!body) return false;
  const f=[...body];
  const anyL=f.some(isL), anyN=f.some(isN), anyP=f.some(x=>!isL(x)&&!isN(x)&&!isS(x));
  return (anyL&&anyN)||(anyL&&anyP)||(anyN&&anyP);
}
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const want=(process.env.W||'').split(',').filter(Boolean).map(Number);
const agg=new Map<string,number>();
for(const i of want){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const text=fs.readFileSync(wf,'utf8');
  const cs=chunks(text).filter(isMix);
  const sorted=[...cs].sort((a,b)=>b.length-a.length).slice(0,Number(process.env.N||18));
  console.log(`--- ${lanes[i].split('/').pop()} : ${cs.length} MIX chunks, ${cs.reduce((a,c)=>a+T(c),0)} tokens ---`);
  for(const c of sorted) console.log('   ',String(T(c)).padStart(2),String(c.length).padStart(3),JSON.stringify(c.length>90?c.slice(0,90)+'…':c));
  for(const c of cs) agg.set(c,(agg.get(c)||0)+1);
}
console.log('--- most frequent MIX chunks (all lanes above) ---');
[...agg.entries()].filter(([c,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,20)
  .forEach(([c,n])=>console.log(String(n).padStart(4),String(T(c)).padStart(2),JSON.stringify(c.slice(0,80))));
