import fs from 'node:fs';
import { buildOn, renderBest, grammarCost } from '@/lib/omega/ariadne';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const base:any={maxSpan:64,topK:8,levels:6,minOcc:2,noBlocks:false,wordGrid:[1,3,6,12,24]};
for (const f of (process.env.LANES||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  let g:any;
  try { g = buildOn(t, enc, '\n', base as any, Date.now()+25000); } catch { }
  if(!g){ console.log(f.split('/').pop()!.padEnd(22),'no grammar'); continue; }
  const gc = grammarCost(g.g, enc);
  const res:number[]=[]; const times:number[]=[];
  for (const tries of [2,3,4,6,8,12,16]) {
    const t0=Date.now();
    const out:any = renderBest(g.g, t, enc, {noAssign:false,budgetMs:20000,probeScale:1,scriptTries:tries,allowPolyglot:true} as any, Date.now()+25000, gc, 0);
    times.push(Date.now()-t0);
    res.push(out?out.tokens:1e9);
  }
  const best=Math.min(...res); const dflt=res[0];
  console.log(f.split('/').pop()!.padEnd(22),'default(2)',String(dflt).padStart(5),
    '| best',String(best).padStart(5),'| gain',String(best-dflt).padStart(4),
    '| per-tries',res.join('/'),'| ms',times.join('/'));
}
