import * as fs from 'node:fs';
import { sygkollesisEncode, sygkollesisResetProbes } from '../../src/lib/omega/sygkollesis';
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;
for (const p of (process.env.LANES??'').split(',').filter(Boolean)) {
  if(!fs.existsSync(p)){console.log(`${p} MISSING`);continue;}
  const src = fs.readFileSync(p,'utf8');
  const t0=Date.now();
  let r:any=null;
  try { r = sygkollesisEncode(src, enc); } catch(e:any){ console.log(`${p.replace('bench/','').padEnd(38)} THREW ${String(e.message).slice(0,60)}`); continue; }
  const raw = countTokens(src, enc);
  if(!r){ console.log(`${p.replace('bench/','').padEnd(38)} raw=${String(raw).padStart(5)}  no pay (${Date.now()-t0}ms)`); continue; }
  const ok = r.decode(r.message) === src;
  console.log(`${p.replace('bench/','').padEnd(38)} raw=${String(raw).padStart(5)} sygkollesis=${String(r.tokens).padStart(5)} Δ=${String(r.tokens-raw).padStart(5)} K=${r.k} merges=${r.mergeScore} ${ok?'EXACT':'***MISMATCH***'} ${Date.now()-t0}ms`);
  sygkollesisResetProbes();
}
