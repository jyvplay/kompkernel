/** X43 DIASTEMA — real gate: the parent's one-chat message vs DIASTEMA's, same clock. */
import * as fs from 'node:fs';
import { diastemaEncode, diastemaPlan, diastemaWire } from '@/lib/omega/diastema';
import { apographeDecodeResult, apographeEncode } from '@/lib/omega/apographe';
import { diastemaDecode } from '@/lib/omega/diastema';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); continue; }
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const f: any = ouraEncode(t, ENC);
  // THE SHIPPED FRONTIER, not just the direct parent: apographeEncode is the
  // chain X39/X40/X42 report. A gain against OURA alone is not a gain if an
  // earlier codec already beats it (aapl-2014 is exactly that case).
  let chain = Number(process.env.CHAIN || 0);
  if (!chain) {
    if (process.env.CHAIN === 'self') { try { chain = (apographeEncode(t, ENC) as any).messageTokens; } catch { chain = f.messageTokens; } }
    else chain = f.messageTokens; // chain defaults to OURA; the frontier repeat supplies the real number
  }
  const tf = Date.now();
  const r: any = diastemaEncode(t, ENC);
  const tk = Date.now();
  // Independent round trip: the stack's own decoder, then this codec's reader.
  let rt = 'n/a';
  try { rt = diastemaDecode(apographeDecodeResult(r as any)) === t ? 'EXACT' : 'no'; } catch { rt = 'threw'; }
  const delta = r.messageTokens - f.messageTokens;
  console.log(p.split('/').pop()!.padEnd(24),
    'raw=' + String(countTokens(t, ENC)).padStart(5),
    'oura=' + String(f.messageTokens).padStart(5),
    'chain=' + String(chain).padStart(5),
    'diastema=' + String(r.messageTokens).padStart(5),
    'd=' + String(delta).padStart(6),
    'pct=' + (100 * delta / chain).toFixed(1).padStart(6),
    'fired=' + (r.diastema ? 'Y' : 'n'),
    'vsChain=' + (r.diastema ? (r.messageTokens < chain ? 'WIN' : 'LOSE') : '-'),
    'rt=' + rt,
    ((tk - tf) / 1000).toFixed(0) + 's/' + ((tf - t0) / 1000).toFixed(0) + 's');
  if (r.diastema) console.log('   mask:', r.mask, '| rows:', r.rows);
  else console.log('   note:', r.notes);
}
