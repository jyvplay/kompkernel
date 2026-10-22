import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const cache=new Map<string,number>();
const ct=(s:string)=>{let v=cache.get(s); if(v===undefined){v=countTokens(s,enc);cache.set(s,v);} return v;};
// min-cost segmentation (Viterbi) over a short string
function minTok(s:string){
  const n=s.length; const INF=1e9; const d=new Array(n+1).fill(INF); d[0]=0;
  for(let i=1;i<=n;i++) for(let j=Math.max(0,i-12);j<i;j++){ const c=d[j]+ct(s.slice(j,i)); if(c<d[i])d[i]=c; }
  return d[n];
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const words=t.split(/\s+/).filter(w=>w.length>=5 && /^[A-Za-z][a-z]{4,}$/.test(w));
  words.sort((a,b)=>t.split(b).length-t.split(a).length);
  const samp=words.slice(0,Number(process.env.N||60));
  let g=0,m=0,win=0;
  for(const w of samp){ const gg=ct(' '+w); const mm=minTok(' '+w); g+=gg; m+=mm; if(mm<gg)win++; }
  console.log(f.split('/').pop()!.padEnd(22),'words',String(samp.length).padStart(3),
    'greedy',String(g).padStart(4),'mincost',String(m).padStart(4),
    'save',String(g-m).padStart(3),`(${(100*(g-m)/g).toFixed(1)}%)`,'improved',win);
}
