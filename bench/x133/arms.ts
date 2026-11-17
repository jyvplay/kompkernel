/** X133 — where does the frontier's wall-clock actually go? Per-arm timing. */
import * as fs from 'node:fs';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const mods:any={
  synkrisis: (await import('../../src/lib/omega/synkrisis')).synkrisisEncode,
  kanon: (await import('../../src/lib/omega/kanon')).kanonEncode,
  akolouthia2: (await import('../../src/lib/omega/akolouthia2')).akolouthia2Encode,
};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const t=fs.readFileSync(p,'utf8');
  console.log(`\n### ${p.split('/').pop()}  (${t.length} chars)`);
  let tot=0;
  for(const [n,f] of Object.entries(mods)){
    if(typeof f!=='function'){ console.log(`  ${n}: not a function`); continue; }
    const t0=Date.now(); let r:any=null, err='';
    try{ r=f(t,enc); }catch(e:any){ err=e.message.slice(0,40); }
    const ms=Date.now()-t0; tot+=ms;
    console.log(`  ${n.padEnd(14)} ${String(ms).padStart(7)}ms  ${err||('tok='+(r?.messageTokens??r?.tokens??'?'))}`);
  }
  const t0=Date.now();
  const {tagstackEncode}=await import('../../src/lib/omega/tagstack');
  const a:any=tagstackEncode(t,enc); const full=Date.now()-t0;
  console.log(`  ${'FRONTIER'.padEnd(14)} ${String(full).padStart(7)}ms  tok=${a.messageTokens}   (sum of arms above: ${tot}ms)`);
}
