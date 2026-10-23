/** X43 — does KRISIS change the WIRE, or only the time? Stronger than a token match. */
import { readFileSync } from 'node:fs';
import { krisisEncode } from '@/lib/omega/krisis';
import { apocopeEncode } from '@/lib/omega/apocope';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  const t = readFileSync(p,'utf8');
  const k: any = krisisEncode(t, enc);
  const a: any = apocopeEncode(t, enc);
  const same = k.wire === a.wire;
  console.log(`${p.split('/').pop()!.padEnd(24)} krisis=${String(k.messageTokens).padStart(5)} ungated=${String(a.messageTokens).padStart(5)}  WIRE ${same?'IDENTICAL':'DIFFERS'}  len ${k.wire.length} vs ${a.wire.length}`);
  if (!same) {
    let i=0; while(i<Math.min(k.wire.length,a.wire.length) && k.wire[i]===a.wire[i]) i++;
    console.log(`   first diff at ${i}: krisis ${JSON.stringify(k.wire.slice(i,i+60))}\n                     ungated ${JSON.stringify(a.wire.slice(i,i+60))}`);
  }
}
