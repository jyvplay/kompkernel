import * as fs from 'node:fs';
import { diastemaPlan, diastemaWire, diastemaDecode } from '@/lib/omega/diastema';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(p, 'utf8');
  let a = Date.now();
  const plan = diastemaPlan(t, enc);
  const tp = Date.now() - a; a = Date.now();
  let tw = -1, td = -1, to = -1;
  if (plan) {
    const w = diastemaWire(plan, t)!; tw = Date.now() - a; a = Date.now();
    td = 0; diastemaDecode(w); td = Date.now() - a; a = Date.now();
    to = 0; try { ouraEncode(w, enc); } catch {} to = Date.now() - a;
  }
  console.log(p.split('/').pop(), 'lines', t.split('\n').length, 'plan', tp + 'ms', 'wire', tw + 'ms', 'dec', td + 'ms', 'oura(wire)', to + 'ms', plan ? ('rows ' + plan.rows.length + ' ord ' + plan.ord) : 'no plan');
}
