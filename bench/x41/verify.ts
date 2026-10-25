/** X41 TYPOS — real encode: parent (oura) vs TYPOS, same process, same clock,
 *  plus the independent decode of the emitted wire. */
import * as fs from 'node:fs';
import { typosEncode } from '@/lib/omega/typos';
import { ouraEncode, ouraDecode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const f: any = ouraEncode(t, enc);
  const tf = Date.now();
  const r: any = typosEncode(t, enc);
  const tk = Date.now();
  let back = '';
  try { back = ouraDecode(r.wire, r.stats ?? {}, r as any); } catch (e: any) { back = 'THREW ' + e.message; }
  console.log(p.split('/').pop()!.padEnd(22),
    'frontier=' + String(f.messageTokens).padStart(5),
    'typos=' + String(r.messageTokens).padStart(5),
    'd=' + String(r.messageTokens - f.messageTokens).padStart(5),
    'fired=' + r.typos,
    ((tk - tf) / 1000).toFixed(0) + 's/' + ((tf - t0) / 1000).toFixed(0) + 's',
    r.typos ? r.typosModels || '-' : '-');
  if (r.typos) console.log('   hdr:', JSON.stringify(r.typosHeader).slice(0, 200));
}
