import * as fs from 'node:fs';
import { apographeEncode } from '@/lib/omega/apographe';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = apographeEncode(t, 'o200k_base');
  console.log(p.split('/').pop(), 'chain=', r.messageTokens, 'fired=', !!r.apographe);
}
