import * as fs from 'node:fs';
import { stoichothetesTransform, stoichothetesUndo } from '../../src/lib/omega/stoichothetes';
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;
for (const p of (process.env.LANES??'').split(',').filter(Boolean)) {
  if(!fs.existsSync(p)){console.log(`${p} MISSING`);continue;}
  const src = fs.readFileSync(p,'utf8');
  const t0=Date.now();
  let tr:any=null; try{ tr = stoichothetesTransform(src); }catch(e:any){ console.log(`${p.padEnd(40)} THREW ${String(e.message).slice(0,50)}`); continue; }
  if(!tr){ console.log(`${p.padEnd(40)} no fit (${Date.now()-t0}ms)`); continue; }
  const raw = countTokens(src, enc), tt = countTokens(tr.text, enc);
  console.log(`${p.replace('bench/','').padEnd(40)} blocks=${tr.blocks} padMass=${tr.padMass} raw=${raw} ->${tt} Δ=${tt-raw} ${stoichothetesUndo(tr.text)===src?'EXACT':'***FAIL***'} ${Date.now()-t0}ms`);
}
