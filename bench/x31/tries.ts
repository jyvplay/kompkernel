import fs from 'node:fs';
import { buildOn, renderBest, grammarCost, planOrder } from '@/lib/omega/ariadne';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.F||'bench/holdout-work/kb-article.txt';
const t=fs.readFileSync(f,'utf8');
const base:any={maxSpan:64,topK:8,levels:6,minOcc:2,noBlocks:false,wordGrid:[1,3,6,12,24]};
const g:any = buildOn(t, enc, '\n', base as any, Date.now()+20000);
if(!g){ console.log('no grammar'); process.exit(0); }
const gc = grammarCost(g.g, enc);
for (const tries of [1,2,3,4,6,8,12,20]) {
  const t0=Date.now();
  const out:any = renderBest(g.g, t, enc, {noAssign:false, budgetMs:20000, probeScale:1, scriptTries:tries, allowPolyglot:true} as any,
    Date.now()+25000, gc, 0);
  const ms=Date.now()-t0;
  console.log('  scriptTries',String(tries).padStart(3),'-> wire tokens',out?String(out.tokens):'null','ms',ms);
}
