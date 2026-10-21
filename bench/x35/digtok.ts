import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
function toks(s:string):string[]{const out:string[]=[];let i=0;
  while(i<s.length){let lo=1,hi=Math.min(32,s.length-i),best=1;
    while(lo<=hi){const mid=(lo+hi)>>1;
      if(countTokens(s.slice(i,i+mid),enc)===1){best=mid;lo=mid+1;}else hi=mid-1;}
    out.push(s.slice(i,i+best));i+=best;} return out;}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const tape=w.slice(cut+1);
  const tk=toks(tape);
  const dig=tk.filter(x=>/^[0-9]+$/.test(x));
  const freq=new Map<string,number>();
  for(const d of dig) freq.set(d,(freq.get(d)||0)+1);
  const top=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,14);
  // distribution of digit-run lengths (contiguous digit tokens glued)
  const runs:string[]=[]; let cur='';
  for(const x of tk){ if(/^[0-9]+$/.test(x)) cur+=x; else { if(cur)runs.push(cur); cur=''; } }
  if(cur)runs.push(cur);
  const lenHist=new Map<number,number>();
  for(const r2 of runs) lenHist.set(r2.length,(lenHist.get(r2.length)||0)+1);
  console.log('==',f.split('/').pop(),'digitToks',dig.length,'distinct',freq.size,'runs',runs.length);
  console.log('   top digit tokens:',top.map(([k,v])=>`${JSON.stringify(k)}x${v}`).join(' '));
  console.log('   run-length hist:',[...lenHist.entries()].sort((a,b)=>a[0]-b[0]).map(([l,c])=>`${l}:${c}`).join(' '));
  console.log('   sample runs:',runs.slice(0,10).map(r2=>JSON.stringify(r2)).join(' '));
}
