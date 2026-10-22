import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEXD='0123456789abcdef';
const RUN_RE=/[0-9a-f]{4,}(?:[-_][0-9a-f]{2,})*|[0-9a-f]{8,}/g;
const files=(process.env.LANES||'').split(',').filter(f=>fs.existsSync(f));
// real corpus hex runs
const corpus:string[]=[];
for(const f of files){ const t=fs.readFileSync(f,'utf8'); RUN_RE.lastIndex=0; let m;
  while((m=RUN_RE.exec(t))){ if(m[0].length<8) continue; corpus.push(m[0]); } }
const CH=corpus.reduce((a,s)=>a+s.length,0);
const base=corpus.reduce((a,s)=>a+countTokens(s,enc),0);
console.log('real hex runs',corpus.length,'ch',CH,'baseTok',base,'cpt',(CH/base).toFixed(3));
const score=(A:string)=>{ const m=new Map<string,string>(); for(let i=0;i<16;i++)m.set(HEXD[i],A[i]);
  let tk=0; for(const s of corpus){ let o=''; for(const c of s)o+=m.get(c)??c; tk+=countTokens(o,enc); } return tk; };
const POOL='abcdefghijklmnopqrstuvwxyz'.split('');
let cur=process.env.START||'etaoinsrhldcumyp';
let curS=score(cur);
console.log('start',cur,curS,'cpt',(CH/curS).toFixed(3),'saving',((base-curS)/base*100).toFixed(1)+'%');
let improved=true,r=0;
while(improved&&r<8){ improved=false;r++;
  for(let pos=0;pos<16;pos++){ let bc=cur[pos],bs=curS;
    for(const c of POOL){ if(cur.includes(c)&&c!==cur[pos])continue;
      const cand=cur.slice(0,pos)+c+cur.slice(pos+1); const s=score(cand);
      if(s<bs){bs=s;bc=c;} }
    if(bc!==cur[pos]){cur=cur.slice(0,pos)+bc+cur.slice(pos+1);curS=bs;improved=true;
      console.log(`  r${r} pos${pos}->${cur} tok ${curS} cpt ${(CH/curS).toFixed(3)}`);}}}
console.log('BEST',cur,'tok',curS,'cpt',(CH/curS).toFixed(3),'saving',((base-curS)/base*100).toFixed(1)+'%');
