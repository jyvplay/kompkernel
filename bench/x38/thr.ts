import * as fs from 'node:fs';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
const enc:any='o200k_base';
const THRS=(process.env.THRS||'3,2,1,0').split(',').map(Number);
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const out:string[]=[];
  for(const th of THRS){
    const r:any=anadiplosisEncode(t,enc,{minGainOverride:th});
    out.push(`g${th}:${r.messageTokens}${r.anadiplosis?'*'+r.anadiplosisSpans:''}`);
  }
  console.log(p.split('/').pop()!.padEnd(26),out.join('  '));
}
