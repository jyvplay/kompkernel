import { countTokens } from '@/lib/omega/bpe';
import * as crypto from 'node:crypto';
const enc='o200k_base' as any;
// random hex corpus (deterministic)
let rng=42; const rnd=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
const HEXD='0123456789abcdef';
const corpus:string[]=[];
for(let i=0;i<900;i++){ const L=16+Math.floor(rnd()*24); let s=''; for(let j=0;j<L;j++) s+=HEXD[Math.floor(rnd()*16)]; corpus.push(s); }
const CH=corpus.reduce((a,s)=>a+s.length,0);
const base=corpus.reduce((a,s)=>a+countTokens(s,enc),0);
console.log('corpus',corpus.length,'runs ch',CH,'baseTok',base,'cpt',(CH/base).toFixed(3));
const score=(A:string)=>{ const m=new Map<string,string>(); for(let i=0;i<16;i++)m.set(HEXD[i],A[i]);
  let tk=0; for(const s of corpus){ let o=''; for(const c of s)o+=m.get(c)!; tk+=countTokens(o,enc); } return tk; };
// candidate pool: lowercase letters + a few safe symbols
const POOL='abcdefghijklmnopqrstuvwxyz'.split('');
let cur='etaoinsrhldcumfp';
let curS=score(cur);
console.log('start',cur,curS,'cpt',(CH/curS).toFixed(3));
// hill climb: try replacing each position with each pool char
let improved=true, rounds=0;
while(improved && rounds<12){
  improved=false; rounds++;
  for(let pos=0;pos<16;pos++){
    let bestC=cur[pos], bestS=curS;
    for(const c of POOL){
      if(cur.includes(c) && c!==cur[pos]) continue;
      const cand=cur.slice(0,pos)+c+cur.slice(pos+1);
      const s=score(cand);
      if(s<bestS){ bestS=s; bestC=c; }
    }
    if(bestC!==cur[pos]){ cur=cur.slice(0,pos)+bestC+cur.slice(pos+1); curS=bestS; improved=true;
      console.log(`  r${rounds} pos${pos} -> ${cur} tok ${curS} cpt ${(CH/curS).toFixed(3)}`); }
  }
}
console.log('BEST alphabet',cur,'tok',curS,'cpt',(CH/curS).toFixed(3),'vs base',base,
  'saving',((base-curS)/base*100).toFixed(1)+'%');
