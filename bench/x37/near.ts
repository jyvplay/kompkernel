import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const ENC='o200k_base' as any;
const T=(s:string)=>countTokens(s,ENC);
// probe: adjacent equal-length spans of length L>=minL with Hamming distance <= maxD
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8'); const n=t.length;
  const minL=Number(process.env.MINL||12), maxD=Number(process.env.MAXD||2);
  let hits=0, totChars=0, totSave=0;
  const used=new Uint8Array(n);
  for(let L=minL;L<=Math.min(160,n>>1);L*=2){
    for(let i=0;i+L*2<=n;i++){
      if(used[i])continue;
      const a=t.slice(i,i+L), b=t.slice(i+L,i+2*L);
      let d=0; for(let q=0;q<L;q++) if(a[q]!==b[q]){d++; if(d>maxD)break;}
      if(d<=maxD){
        // cost of encoding "same as previous, with d edits": ~ 4 + d*3 tokens
        const cost=4+d*3;
        const save=T(b)-cost;
        if(save>0){ hits++; totChars+=L; totSave+=save;
          for(let q=i;q<i+2*L;q++) used[q]=1; }
      }
    }
  }
  console.log(f.split('/').pop()!.padEnd(26),'nearRpeat pairs',String(hits).padStart(4),
    'chars',String(totChars).padStart(6),'estTokSave',String(totSave).padStart(5),
    `| raw ${T(t)} (${((totSave/T(t))*100).toFixed(1)}% of raw)`);
}
