import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.F||'';
const text=fs.readFileSync(f,'utf8');
const r:any=oikonomiaEncode(text,enc);
const w:string=r.wire; const cut=w.indexOf('\u00b6',1);
const tape=w.slice(cut+1);
// residual: how many chars of the tape are covered by a repeated substring (len>=8, seen earlier)?
function cover(s:string,minL:number){
  let i=0,cov=0; const n=s.length;
  const idx=new Map<string,number[]>();
  while(i<n){
    let best=0;
    const maxL=Math.min(80,n-i);
    for(let L=maxL;L>=minL;L--){
      const sub=s.substr(i,L);
      const p=s.lastIndexOf(sub, i-1+L-1+0);
      // find any earlier occurrence
      const prev=s.indexOf(sub);
      if(prev>=0 && prev<i){ best=L; break; }
    }
    if(best){ cov+=best; i+=best; } else i++;
  }
  return cov;
}
const rawCov=cover(text,12);
const tapeCov=cover(tape,12);
// also: try re-encoding the tape itself
const r2:any=oikonomiaEncode(tape,enc);
console.log(JSON.stringify({lane:f.split('/').pop(),raw:countTokens(text,enc),msg:r.messageTokens,
  tapeTok:countTokens(tape,enc),tapeCh:tape.length,
  rawRepeatPct:+(100*rawCov/Math.max(1,text.length)).toFixed(1),
  tapeRepeatPct:+(100*tapeCov/Math.max(1,tape.length)).toFixed(1),
  tapeReencode:countTokens(tape,enc)+' -> '+r2.messageTokens}));
