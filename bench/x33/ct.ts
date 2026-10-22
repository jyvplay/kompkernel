import fs from 'node:fs';
import { timemaEncode, CT_STATS } from '@/lib/omega/timema';
import { CT_STATS as S } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const t=fs.readFileSync(process.env.F||'bench/x30/fresh/prose-01.txt','utf8');
const t0=Date.now(); const r:any=timemaEncode(t,enc); const ms=Date.now()-t0;
const d=S.longDistinct as Set<string>;
console.log('msg',r.messageTokens,'ms',ms);
console.log('short calls',S.short,'| long calls',S.long,'| long distinct',d.size);
console.log('redundancy', (100*(1-d.size/Math.max(1,S.long))).toFixed(1)+'%',
  '| long chars total',S.longChars,'| miss chars',S.longMissChars,
  '| avg len',(S.longChars/Math.max(1,S.long)).toFixed(0));
