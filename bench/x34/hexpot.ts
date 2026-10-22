import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A='etaoinsrhldcumfp';
const map=new Map<string,string>(); for(let i=0;i<16;i++) map.set(HEX[i],A[i]);
const conv=(s:string)=>{let o='';for(const c of s)o+=map.get(c)??c;return o;};
console.log('mapping clause tokens:', countTokens('hex: '+HEX.split('').map((h,i)=>h+'='+A[i]).join(' '),enc));
console.log('');
console.log('lane'.padEnd(26),'hexRuns hexChars  baseTok  remapTok  saved  delimTok  NET');
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const runs:string[]=[];
  for(const m of t.matchAll(/[0-9a-fA-F]{12,}/g)) runs.push(m[0].toLowerCase());
  if(!runs.length){ console.log(f.split('/').pop()!.padEnd(26),'0'); continue; }
  let bt=0,rt=0,ch=0;
  for(const s of runs){ bt+=countTokens(s,enc); rt+=countTokens(conv(s),enc); ch+=s.length; }
  // delimiter cost: 2 chars per run, measured
  const delim=runs.reduce((a,s)=>a+countTokens('\u00ab'+conv(s)+'\u00bb',enc)-countTokens(conv(s),enc),0);
  console.log(f.split('/').pop()!.padEnd(26),
    String(runs.length).padStart(6),String(ch).padStart(8),String(bt).padStart(8),String(rt).padStart(9),
    String(bt-rt).padStart(7),String(delim).padStart(8),String(bt-rt-delim).padStart(6));
}
