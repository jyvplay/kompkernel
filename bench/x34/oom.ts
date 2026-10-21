import fs from 'node:fs';
import { pyknosisPlan } from '@/lib/omega/pyknosis';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.LANE!, mode=process.env.MODE!;
const t=fs.readFileSync(f,'utf8');
console.log('file chars',t.length,'raw tok',countTokens(t,enc));
const heap=()=>Math.round(process.memoryUsage().heapUsed/1e6)+'MB rss'+Math.round(process.memoryUsage().rss/1e6)+'MB';
console.log('mode',mode,'start',heap());
if(mode==='plan'){
  const p=pyknosisPlan(t,enc);
  console.log('plan',p?{runs:p.runs,chars:p.chars,est:p.estimated}:null,heap());
} else if(mode==='oiko'){
  const r:any=oikonomiaEncode(t,enc); console.log('oiko msg',r.messageTokens,heap());
} else {
  const p=pyknosisPlan(t,enc); console.log('plan',p?{runs:p.runs,chars:p.chars,est:p.estimated}:null,heap());
  if(p){ const r:any=oikonomiaEncode(p.text,enc); console.log('pyk msg',r.messageTokens,heap()); }
}
