import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
// Longest Common Subsequence length (chars) with cap
function lcs(a:string,b:string):number{
  if(Math.abs(a.length-b.length)>60) return 0;
  let prev=new Array(b.length+1).fill(0), cur=new Array(b.length+1).fill(0);
  for(let i=1;i<=a.length;i++){ cur[0]=0;
    for(let j=1;j<=b.length;j++) cur[j]= a[i-1]===b[j-1] ? prev[j-1]+1 : Math.max(prev[j],cur[j-1]);
    const t=prev; prev=cur; cur=t; }
  return prev[b.length];
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const lines=t.split('\n');
  const n=lines.length;
  let exactDup=0, nearDup=0, saved=0, savedIfEncoded=0;
  const seen=new Map<string,number>();
  const reps:number[]=[];
  for(let i=0;i<n;i++){
    const L=lines[i]; if(L.length<12) continue;
    const prev=seen.get(L);
    if(prev!==undefined){ exactDup++; saved+=L.length+1; continue; }
    // find best similar earlier line
    let best=0,bestL=0;
    for(let j=Math.max(0,i-400);j<i;j++){
      const M=lines[j]; if(!M||M.length<12) continue;
      const c=lcs(L,M); if(c>best){best=c;bestL=M.length;}
    }
    if(bestL>0){
      const ratio=best/Math.max(L.length,bestL);
      if(ratio>=0.75){ nearDup++; reps.push(ratio);
        // if encoded as "same as line j with edits", cost ~ 30 chars of instruction; gain = L.length - edits
        const edits=Math.max(L.length,bestL)-best;
        if(L.length-edits-30>0) savedIfEncoded+= L.length-edits-30;
      }
    }
    seen.set(L,i);
  }
  reps.sort((a,b)=>b-a);
  console.log(f.split('/').pop()!.padEnd(26),'lines',String(n).padStart(5),
    'exactDupLines',String(exactDup).padStart(4),'(saved',String(saved).padStart(6),'ch)',
    '| nearDup>=0.75',String(nearDup).padStart(4),
    '| netChIfDiffEncoded',String(savedIfEncoded).padStart(6),
    '| top ratios',reps.slice(0,4).map(x=>x.toFixed(2)).join(','));
}
