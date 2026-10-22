import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
// Enumerate all repeated substrings; estimate rule profit with an isolated model.
// gain = freq*(T(phrase) - glyphTok) - (T(phrase) + 1)   [glossary stores glyph+phrase]
const GLYPH=1.0;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const n=t.length;
  // count occurrences of every substring length 3..40 via rolling hash buckets
  const byLen=new Map<number,Map<string,number>>();
  const MAXL=Number(process.env.MAXL||40), MINL=Number(process.env.MINL||3);
  for(let L=MINL;L<=MAXL;L++){
    const m=new Map<string,number>();
    for(let i=0;i+L<=n;i++){ const s=t.slice(i,i+L); m.set(s,(m.get(s)||0)+1); }
    // keep only repeated
    const rep=new Map<string,number>();
    for(const [k,v] of m) if(v>=2) rep.set(k,v);
    byLen.set(L,rep);
  }
  // for each length, collect candidates with estimated profit
  const cands:{s:string,freq:number,gain:number}[]=[];
  for(let L=MINL;L<=MAXL;L++){
    const rep=byLen.get(L)!; if(!rep.size) continue;
    // cap work: score top by frequency
    const top=[...rep.entries()].sort((a,b)=>b[1]-a[1]).slice(0,Number(process.env.TOP||400));
    for(const [s,freq] of top){
      const tp=countTokens(s,enc);
      const gain=freq*(tp-GLYPH)-(tp+1);
      if(gain>0) cands.push({s,freq,gain});
    }
  }
  // greedy maximal-reward selection: sort by gain desc, drop candidates overlapping already-chosen
  cands.sort((a,b)=>b.gain-a.gain);
  const chosen:{s:string,freq:number,gain:number}[]=[];
  let total=0;
  // approximate: count non-overlapping occurrences of each candidate in the text
  const occ=(s:string)=>{let c=0,i=0;for(;;){const j=t.indexOf(s,i);if(j<0)break;c++;i=j+s.length;}return c;};
  let covered=new Uint8Array(n);
  for(const c of cands){
    // recompute real non-overlapping occurrences not already covered
    let cnt=0; const marks:number[]=[];
    let i=0;
    for(;;){ const j=t.indexOf(c.s,i); if(j<0)break;
      let free=true; for(let k=j;k<j+c.s.length;k++) if(covered[k]){free=false;break;}
      if(free){cnt++; for(let k=j;k<j+c.s.length;k++) marks.push(k);}
      i=j+1; }
    if(cnt<2) continue;
    const tp=countTokens(c.s,enc);
    const g=cnt*(tp-GLYPH)-(tp+1);
    if(g<=0) continue;
    chosen.push({s:c.s,freq:cnt,gain:g}); total+=g;
    for(const k of marks) covered[k]=1;
    if(chosen.length>=Number(process.env.MAXR||400)) break;
  }
  console.log(f.split('/').pop()!.padEnd(26),'ch',String(n).padStart(5),
    '| profitableCandidates',String(cands.length).padStart(4),
    '| nonOverlapChosen',String(chosen.length).padStart(4),
    '| estTotalGain',String(Math.round(total)).padStart(5));
  if(process.env.SHOW) for(const c of chosen.slice(0,25))
    console.log('    ',JSON.stringify(c.s.slice(0,44)),'freq',c.freq,'gain',Math.round(c.gain));
}
