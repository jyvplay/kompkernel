import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { synarmogeFromFrontier } from '../../src/lib/omega/synarmoge';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const t=fs.readFileSync(p,'utf8');
  process.env.OMEGA_NO_SYNARMOGE='1';   // measure the search on the UN-optimized frontier
  const t0=Date.now(); const a:any=tagstackEncode(t,enc); const encMs=Date.now()-t0;
  delete process.env.OMEGA_NO_SYNARMOGE;
  const out=[`${p.split('/').pop()!.padEnd(18)} frontier=${String(a.messageTokens).padStart(5)}`];
  for(const cfg of (process.env.CFGS??'8:192').split(';')){
    const [ps,po]=cfg.split(':');
    process.env.OMEGA_SYNARMOGE_PASSES=ps!; process.env.OMEGA_SYNARMOGE_POOL=po!;
    const t1=Date.now(); const s:any=synarmogeFromFrontier(a,t,enc); const ms=Date.now()-t1;
    out.push(`${ps}/${po}: ${String((s?s.tokens:a.messageTokens)-a.messageTokens).padStart(4)} in ${String(ms).padStart(6)}ms`);
  }
  delete process.env.OMEGA_SYNARMOGE_PASSES; delete process.env.OMEGA_SYNARMOGE_POOL;
  console.log(out.join('  |  ')+`  (enc ${encMs}ms)`);
}
