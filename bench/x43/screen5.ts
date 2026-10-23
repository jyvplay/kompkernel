/** X43 screen 5 — time each layer of the lower chain on one small file. */
import { readFileSync } from 'node:fs';
import { chironEncode } from '@/lib/omega/chiron';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
import { euteleiaEncode } from '@/lib/omega/euteleia';
import { ouraEncode } from '@/lib/omega/oura';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  const t = readFileSync(p,'utf8');
  console.log(`\n=== ${p.split('/').pop()} (${t.length} chars)`);
  let prev = 0;
  for (const [n, f] of [['chiron     ',()=>chironEncode(t,enc)],['anadiplosis',()=>anadiplosisEncode(t,enc)],['euteleia   ',()=>euteleiaEncode(t,enc)],['oura       ',()=>ouraEncode(t,enc)]] as Array<[string,()=>any]>) {
    const t0=Date.now(); let r:any; try{ r=f(); }catch(e:any){ console.log(`  ${n} THREW ${String(e).slice(0,60)}`); continue; }
    const ms=Date.now()-t0;
    console.log(`  ${n} ${String(ms).padStart(7)} ms  msg=${String(r.messageTokens).padStart(5)}  +${ms-prev} ms`);
    prev=ms;
  }
}
