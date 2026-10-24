import * as fs from 'node:fs';
import { apographePlan, apographeUndo } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';
const enc:any='o200k_base';
for (const p of (process.env.LANES||'').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p,'utf8');
  const t0 = Date.now();
  const plan:any = apographePlan(t, enc);
  const raw = countTokens(t, enc);
  if (!plan) { console.log(p.split('/').pop()!.padEnd(26), 'raw='+String(raw).padStart(5), 'NO PLAN'); continue; }
  const back = apographeUndo(plan.text);
  const txt = countTokens(plan.text, enc);
  console.log(p.split('/').pop()!.padEnd(26),
    'raw='+String(raw).padStart(5), 'txt='+String(txt).padStart(5),
    'clause='+String(Math.round(plan.clauseTokens)).padStart(3),
    'proxy='+String(plan.proxyGain).padStart(5),
    'rows='+plan.modelledRows+'/'+(plan.modelledRows+plan.literalRows),
    (back===t?'EXACT':'***MISMATCH***'),
    ((Date.now()-t0)/1000).toFixed(1)+'s');
  console.log('   header='+JSON.stringify(plan.header));
  console.log('   clause='+JSON.stringify(plan.clause.slice(0,220)));
}
