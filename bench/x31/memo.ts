import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { MEMO_STATS } from '@/lib/omega/ariadne';
const enc='o200k_base' as any;
const t=fs.readFileSync(process.env.F||'bench/holdout-ops/ls-full-iso.txt','utf8');
const t0=Date.now(); const r:any=tachosEncode(t,enc); const ms=Date.now()-t0;
console.log((process.env.F||'').split('/').pop()!.padEnd(16),'ms',ms,'msg',r.messageTokens);
console.log('  tries',MEMO_STATS.tries,'hits',MEMO_STATS.hits,'misses',MEMO_STATS.misses,
  'hitRate',(100*MEMO_STATS.hits/Math.max(1,MEMO_STATS.tries)).toFixed(1)+'%',
  '| keyMs',MEMO_STATS.keyMs.toFixed(0),'scanMs',MEMO_STATS.scanMs.toFixed(0));
