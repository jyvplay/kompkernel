import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const O200K=/[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n\/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
const memo=new Map<string,number>();
function tk(c:string,e:EncodingName){let v=memo.get(c);if(v===undefined){v=countTokens(c,e);memo.set(c,v);}return v;}
function fast(s:string,e:EncodingName){O200K.lastIndex=0;const cs=s.match(O200K);if(!cs)return countTokens(s,e);let n=0;for(const c of cs)n+=tk(c,e);return n;}
/** exact delta of replacing every occurrence of `s` by `g`, scored only in windows */
function winDelta(body:string,s:string,g:string,e:EncodingName,W=96){
  let d=0,i=0,occ=0;
  for(;;){ const j=body.indexOf(s,i); if(j<0) break; occ++;
    const lo=Math.max(0,j-W), hi=Math.min(body.length,j+s.length+W);
    d += fast(body.slice(lo,j)+s+body.slice(j+s.length,hi),e) - fast(body.slice(lo,j)+g+body.slice(j+s.length,hi),e);
    i=j+s.length; }
  return {d,occ};
}
const docs=['bench/holdout/code-ts.txt','bench/holdout/gh-prose.txt','bench/holdout-mk/page.html','bench/holdout-ops/openstack-loghub-26.log','bench/holdout-tab/aapl-2014.csv'];
const GL='абвгдежзийклмнопрстуфхцчшщъыэюя';
console.log('doc'.padEnd(26),'cands'.padStart(6),'wholeMs'.padStart(8),'winMs'.padStart(7),'speedup'.padStart(8),'exactAgree'.padStart(11));
let TS=0,TW=0,agreeAll=0,nAll=0;
for(const f of docs){
  const t=fs.readFileSync(f,'utf8'); memo.clear(); fast(t,'o200k_base');
  const cands:string[]=[]; const seen=new Set<string>();
  for(let i=0;cands.length<1500&&i<t.length-60;i+=Math.max(1,Math.floor(t.length/2200))){
    const len=4+((i*11)%44); const s=t.substr(i,len);
    if(s.length<3||seen.has(s)) continue; if(t.indexOf(s,i+len)<0) continue; seen.add(s); cands.push(s);
  }
  if(!cands.length) continue;
  const base=countTokens(t,'o200k_base');
  let t0=Date.now(); const truth:number[]=[];
  for(let i=0;i<cands.length;i++) truth.push(base-countTokens(t.split(cands[i]).join(GL[i%GL.length]),'o200k_base'));
  const whole=Date.now()-t0;
  t0=Date.now(); const got:number[]=[];
  for(let i=0;i<cands.length;i++) got.push(winDelta(t,cands[i],GL[i%GL.length],'o200k_base').d);
  const win=Date.now()-t0;
  let agree=0; for(let i=0;i<truth.length;i++) if(truth[i]===got[i]) agree++;
  TS+=whole;TW+=win;agreeAll+=agree;nAll+=truth.length;
  console.log(f.split('/').pop()!.padEnd(26),String(cands.length).padStart(6),String(whole).padStart(8),String(win).padStart(7),(whole/Math.max(win,1)).toFixed(1).padStart(8),`${agree}/${truth.length}`.padStart(11));
}
console.log(`TOTAL whole=${TS}ms windowed=${TW}ms speedup ${(TS/Math.max(TW,1)).toFixed(1)}x ; windowed delta EXACT on ${agreeAll}/${nAll} candidates (${(100*agreeAll/nAll).toFixed(2)}%)`);
