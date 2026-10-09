import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { synPlan, renderSynWire, synizesisDecode, synContract } from '../src/lib/omega/synizesis';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { allFixtures } from './synizesis-fixtures';
const ENC: EncodingName = 'o200k_base'; const T = (s:string)=>countTokens(s,ENC);
function syn(t: string) {
  const p = synPlan(t, ENC); if (!p) return null;
  const w = renderSynWire(p); if (synizesisDecode(w) !== t) return null;
  return { wire: w, contract: synContract(p), tok: T(w) + T(synContract(p)), shapes: p.shapes.length };
}
console.log('fixture'.padEnd(26),'raw'.padStart(6),'DAED'.padStart(6),'SYN∘D'.padStart(7),'gain'.padStart(5),'g%'.padStart(6),'shapes'.padStart(6),'ms'.padStart(6));
let R=0,D=0,SD=0;
for (const f of allFixtures()) {
  const t0=Date.now(); const t=f.text; const raw=T(t);
  const d = daedalusEncode(t, ENC, { budgetMs: 2500 });
  const dOk = d.decoded === t;
  const dTok = dOk ? d.messageTokens : raw;
  let sdTok = dTok;
  if (dOk) {
    const s = syn(d.wire);
    if (s) {
      const dec = daedalusDecode(synizesisDecode(s.wire));
      if (dec === t) sdTok = Math.min(dTok, s.tok + (d.messageTokens - T(d.wire)));
    }
  }
  // also raw-syn arm
  const s0 = syn(t); if (s0) sdTok = Math.min(sdTok, s0.tok);
  sdTok = Math.min(sdTok, raw);
  R+=raw; D+=Math.min(dTok,raw); SD+=sdTok;
  console.log(f.name.padEnd(26), String(raw).padStart(6), String(dTok).padStart(6), String(sdTok).padStart(7), String(dTok-sdTok).padStart(5), (((dTok-sdTok)/dTok)*100).toFixed(1).padStart(6), String(s0?s0.shapes:0).padStart(6), String(Date.now()-t0).padStart(6));
}
console.log('TOTAL'.padEnd(26), String(R).padStart(6), String(D).padStart(6), String(SD).padStart(7), String(D-SD).padStart(5), (((D-SD)/D)*100).toFixed(2).padStart(6));
