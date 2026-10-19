import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
const f=process.env.F!; const B=Number(process.env.B||0);
const t=fs.readFileSync(f,'utf8');
const opts:any = B? {budgetMs:B} : {};
const t0=Date.now(); const r:any=synkopeEncode(t,enc,opts); const ms=Date.now()-t0;
console.log(f.split('/').pop()!.padEnd(14),'budget',String(B||'default').padStart(7),'raw',String(r.inTokens).padStart(4),
  'msg',String(r.messageTokens).padStart(4),'rules',String(r.rules).padStart(3),'parent',String(r.parent).padStart(12),'ms',String(ms).padStart(6));
