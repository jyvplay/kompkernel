/** X40 — real encode: frontier (oura) vs KANON, same process, same clock. */
import * as fs from 'node:fs';
import { metronEncode, metronDecodeResult } from '@/lib/omega/metron';
import { ouraEncode } from '@/lib/omega/oura';
import { chironDecode } from '@/lib/omega/chiron';
import { apographeArmOf } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const f: any = ouraEncode(t, enc);
  const tf = Date.now();
  const r: any = metronEncode(t, enc);
  const tk = Date.now();
  let back = '', ok = false;
  try {
    back = metronDecodeResult(r);
    ok = back === t;
  } catch (e: any) { back = 'THREW ' + e.message; }
  let m = '';
  for (let i = 0; i < Math.min(t.length, back.length); i++) if (t[i] !== back[i]) { m = `@${i} want ${JSON.stringify(t.slice(i - 30, i + 30))} got ${JSON.stringify(back.slice(i - 30, i + 30))}`; break; }
  console.log(p.split('/').pop()!.padEnd(24),
    'frontier=' + String(f.messageTokens).padStart(5),
    'metron=' + String(r.messageTokens).padStart(5),
    'd=' + String(r.messageTokens - f.messageTokens).padStart(5),
    ok ? 'EXACT' : '***MISMATCH***',
    (((tk - tf)) / 1000).toFixed(0) + 's/' + ((tf - t0) / 1000).toFixed(0) + 's',
    r.apographe ? r.apographeHeader : '-', r.metronModels.join(','));
  if (!ok) console.log('   ' + m, '\n   backlen', back.length, 'srclen', t.length);
}
