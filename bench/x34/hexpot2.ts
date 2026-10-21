import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A='etaoinsrhldcumfp';
const map=new Map<string,string>(); for(let i=0;i<16;i++) map.set(HEX[i],A[i]);
const conv=(s:string)=>{let o='';for(const c of s)o+=map.get(c)??c;return o;};
// clause wordings
const clauses={
  pairs   : 'hex: '+HEX.split('').map((h,i)=>h+'='+A[i]).join(' '),
  parallel: 'hex: '+A+' = '+HEX,
  compact : 'hex digits map: 0123456789abcdef -> '+A,
  short   : '0-9a-f = '+A,
};
for(const k of Object.keys(clauses)) console.log('  clause',k.padEnd(9),countTokens(clauses[k as keyof typeof clauses],enc),'tok');
console.log('');
// UUID-aware run detection
const RUNRE=/[0-9a-fA-F]{4,}(?:[-_][0-9a-fA-F]{2,})*|[0-9a-fA-F]{12,}/g;
console.log('lane'.padEnd(26),'runs  ch   baseTok remapTok saved  d1    NET(after 44 clause)');
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const runs:string[]=[];
  for(const m of t.matchAll(RUNRE)) runs.push(m[0].toLowerCase());
  if(!runs.length) continue;
  let bt=0,rt=0,ch=0,d1=0;
  for(const s of runs){
    bt+=countTokens(s,enc); rt+=countTokens(conv(s),enc); ch+=s.length;
    d1+=countTokens('~'+conv(s)+'|',enc)-countTokens(conv(s),enc);
  }
  console.log(f.split('/').pop()!.padEnd(26),String(runs.length).padStart(4),String(ch).padStart(6),
    String(bt).padStart(7),String(rt).padStart(8),String(bt-rt).padStart(6),String(d1).padStart(5),
    String(bt-rt-d1-44).padStart(5));
}
