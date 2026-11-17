import * as fs from 'node:fs';
import { stoichothetesTransform, stoichothetesUndo } from '../../src/lib/omega/stoichothetes';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;
for (const p of (process.env.LANES??'').split(',').filter(Boolean)) {
  const src = fs.readFileSync(p,'utf8');
  const b = tagstackEncode(src, enc);
  const Mb = countTokens(b.message, enc);
  const tr = stoichothetesTransform(src);
  if(!tr){ console.log(`${p.replace('bench/','').padEnd(38)} M=${Mb} (no fit)`); continue; }
  const k = tagstackEncode(tr.text, enc);
  const Mk = countTokens(k.message, enc);
  const full = stoichothetesUndo(k.decoded);
  console.log(`${p.replace('bench/','').padEnd(38)} M=${String(Mb).padStart(5)} stoich=${String(Mk).padStart(5)} Δ=${String(Mk-Mb).padStart(5)}  roundtrip=${full===src?'EXACT':'***FAIL***'}`);
}
