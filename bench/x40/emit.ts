/** X40 — emit the real one-chat messages for the firing lanes, for the
 *  independent CPython reader (bench/x39/apographe_decode.py, extended this
 *  turn with the lin/clock grammar). Same shape as bench/x39/emit.ts. */
import * as fs from 'node:fs';
import { metronEncode } from '@/lib/omega/metron';
const enc: any = 'o200k_base';
const out: any[] = [];
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const r: any = metronEncode(t, enc);
  const message = (r.contract ? r.contract + '\n' : '') + r.wire;
  out.push({ lane: p, oneChat: r.messageTokens, apographe: r.apographe, header: r.apographeHeader, message });
  console.log(p.split('/').pop(), 'M=' + r.messageTokens, 'fired=' + r.apographe, r.apographeHeader || '-');
}
fs.writeFileSync(process.env.OUT || 'bench/x40/receipts/x40-messages.json', JSON.stringify(out));
