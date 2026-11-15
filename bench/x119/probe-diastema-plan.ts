import * as fs from 'node:fs';
import { diastemaPlan } from '../../src/lib/omega/diastema';
const enc='o200k_base' as const;
for(const p of ['bench/holdout-x41/ls-l-real.txt','bench/holdout-x40/prices.csv','bench/holdout-x41/apt-real.txt','bench/holdout-x41/ps-aux-real.txt']){
 const text=fs.readFileSync(p,'utf8');const t=performance.now();const plan=diastemaPlan(text,enc);const ms=performance.now()-t;
 console.log(p.split('/').pop(),JSON.stringify(plan?{ms:Math.round(ms),mask:plan.mask,ord:plan.ord,rows:plan.rows.length,pattern:plan.pattern.slice(0,80),proxyGain:plan.proxyGain}:{ms:Math.round(ms),plan:null}));
}
