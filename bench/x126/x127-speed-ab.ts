import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { chunkCacheClear, tailMemoClear, countTokens } from '../../src/lib/omega/bpe';
import { prolepsisReset } from '../../src/lib/omega/prolepsis';
const enc='o200k_base' as const;
const clear = () => { tagstackMemoClear(); chunkCacheClear(); tailMemoClear(); prolepsisReset(); };
const lanes=(process.env.LANES??'bench/holdout-x41/apt-real.txt').split(',');
const R = Number(process.env.R ?? 3);
for (const lane of lanes) {
  const src = fs.readFileSync(lane,'utf8');
  for (const on of ['1','0']) { process.env.OMEGA_MERGECOUNT_SHIFT=on; clear(); tagstackEncode(src,enc); } // warm both
  const ts: Record<string, number[]> = { old: [], neu: [] };
  const Ms: Record<string, number> = {};
  for (let r=0;r<R;r++) {
    const order = r%2===0 ? [['1','old'],['0','neu']] : [['0','neu'],['1','old']];
    for (const [on,name] of order as [string,string][]) {
      process.env.OMEGA_MERGECOUNT_SHIFT=on; clear();
      const t0=Date.now(); const res=tagstackEncode(src,enc); const ms=Date.now()-t0;
      if (res.decoded!==src) throw new Error('INEXACT on '+name);
      ts[name].push(ms); Ms[name]=countTokens(res.message,enc);
    }
  }
  const med=(a:number[])=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
  const mo=med(ts.old), mn=med(ts.neu);
  console.log(`${lane.split('/').pop()!.padEnd(18)} M old=${Ms.old} new=${Ms.neu} ${Ms.old===Ms.neu?'SAME':'DIFF!!'}`
    + `  med old=${mo} new=${mn} (${(100*(mn-mo)/mo).toFixed(1)}%)`
    + `  [${ts.old.join(',')} | ${ts.neu.join(',')}]`);
}
