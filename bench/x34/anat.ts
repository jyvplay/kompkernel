import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.F||'';
const t=fs.readFileSync(f,'utf8');
const r:any=oikonomiaEncode(t,enc);
const w:string=r.wire;
const cut=w.indexOf('\u00b6', 1);
const gloss = cut<0? '' : w.slice(1,cut);
const tape  = cut<0? w : w.slice(cut+1);
const ct=r.contract||'';
// redundancy inside the glossary: LZ77-style greedy parse of the glossary string
function lzCover(s:string){
  // count tokens covered by any repeated substring of length>=6 chars occurring >=2x
  const seen=new Map<string,number>(); const n=s.length;
  let covered=0; let i=0;
  // simple: find longest match at i in s[0..i)
  while(i<n){
    let best=0;
    const maxL=Math.min(60,n-i);
    for(let L=maxL;L>=6;L--){
      const sub=s.substr(i,L);
      if(s.indexOf(sub) < i){ best=L; break; }
    }
    if(best>0){ covered+=best; i+=best; } else i++;
  }
  return covered;
}
console.log(JSON.stringify({lane:f.split('/').pop(),raw:countTokens(t,enc),msg:r.messageTokens,
  contract:countTokens(ct,enc), glossTok:countTokens(gloss,enc), tapeTok:countTokens(tape,enc),
  glossCh:gloss.length, tapeCh:tape.length, rules:r.rules,
  glossRedundantCh:lzCover(gloss), glossRedundantPct:+(100*lzCover(gloss)/Math.max(1,gloss.length)).toFixed(1)}));
