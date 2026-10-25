/** X43 DIASTEMA — census: mask, participant rows, wire cost, and the exact round trip. */
import * as fs from 'node:fs';
import { diastemaPlan, diastemaWire, diastemaDecode } from '@/lib/omega/diastema';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); continue; }
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, ENC);
  let plan: any = null;
  try { plan = diastemaPlan(t, ENC); } catch (e: any) { console.log(p.split('/').pop()!.padEnd(24), 'THREW', e.message); continue; }
  if (!plan) { console.log(p.split('/').pop()!.padEnd(24), `raw=${String(raw).padStart(5)} no interval column`); continue; }
  const wire = diastemaWire(plan, t)!;
  const ex = diastemaDecode(wire) === t;
  const wt = countTokens(wire, ENC);
  console.log(`${p.split('/').pop()!.padEnd(24)} raw=${String(raw).padStart(5)} wire=${String(wt).padStart(5)} `
    + `gain=${String(raw - wt).padStart(5)} ord=${plan.ord} rows=${String(plan.rows.length).padStart(3)} `
    + `proxy=${String(plan.proxyGain).padStart(5)} dec=${ex ? 'EXACT' : '***BAD***'} mask=${plan.mask.slice(0, 34)}`);
}
