import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { synPlan, renderSynWire, synizesisDecode, synContract } from '../src/lib/omega/synizesis';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
const ENC: EncodingName = 'o200k_base'; const T = (s:string)=>countTokens(s,ENC);
const files = ['bench/holdout-ops/find-listing.txt','bench/holdout-ops/ls-full-iso.txt','bench/holdout-ops/git-numstat.txt','bench/holdout-ops/openstack-loghub-26.log','bench/holdout-ops/npm-ls.txt','bench/holdout-ops/package-lock-head.json','bench/holdout-ops/node-stacktraces.txt'];
console.log('file'.padEnd(34),'raw'.padStart(6),'synBare'.padStart(8),'DAED'.padStart(6),'D∘SYN'.padStart(7),'best'.padStart(6),'Δ'.padStart(5),'ms'.padStart(7));
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const t0=Date.now();
  const p = synPlan(t, ENC);
  let bare = T(t), synText: string|null = null, cTok=0;
  if (p) { const w=renderSynWire(p); if (synizesisDecode(w)===t) { synText=w; cTok=T(synContract(p)); bare=T(w)+cTok; } }
  const d = daedalusEncode(t, ENC, { budgetMs: 3000 });
  const dTok = d.decoded===t ? d.messageTokens : T(t);
  let dsTok = 1e9;
  if (synText) { const ds = daedalusEncode(synText, ENC, { budgetMs: 3000 }); if (synizesisDecode(daedalusDecode(ds.wire))===t) dsTok = ds.messageTokens + cTok; }
  const best = Math.min(T(t), bare, dTok, dsTok);
  console.log(f.split('/').pop()!.padEnd(34), String(T(t)).padStart(6), String(bare).padStart(8), String(dTok).padStart(6), String(dsTok>1e8?-1:dsTok).padStart(7), String(best).padStart(6), String(dTok-best).padStart(5), String(Date.now()-t0).padStart(7));
}
