import * as fs from 'node:fs';
import { apographeEncode } from '@/lib/omega/apographe';
const enc:any='o200k_base';
const out:any[] = [];
for (const p of (process.env.LANES||'').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p,'utf8');
  const r:any = apographeEncode(t, enc);
  const message = (r.contract ? r.contract + '\n' : '') + r.wire;
  out.push({ lane:p, oneChat:r.messageTokens, apographe:r.apographe, header:r.apographeHeader, message });
  console.log(p.split('/').pop(), 'M='+r.messageTokens, 'apo='+r.apographe);
}
fs.writeFileSync(process.env.OUT || 'bench/x39/receipts/x39-messages.json', JSON.stringify(out));
