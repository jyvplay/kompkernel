import fs from 'node:fs';
import { timemaEncode } from '@/lib/omega/timema';
const enc='o200k_base' as any;
const t=fs.readFileSync(process.env.F||'bench/x30/fresh/prose-01.txt','utf8');
const t0=Date.now(); const r:any=timemaEncode(t,enc);
console.log('msg',r.messageTokens,'ms',Date.now()-t0);
