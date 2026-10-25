/** X42 KANNABOS census: what grid, which codecs, and the wire's token cost. */
import * as fs from 'node:fs';
import { kannabosPlan, kannabosDecode } from '@/lib/omega/kannabos';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').filter(Boolean);
for (const p of lanes) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); continue; }
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, ENC);
  let plan: any = null;
  try { plan = kannabosPlan(t, ENC); } catch (e: any) { console.log(p.split('/').pop()!.padEnd(22), 'THREW', e.message); continue; }
  if (!plan) { console.log(p.split('/').pop()!.padEnd(22), 'raw=' + String(raw).padStart(5), 'no grid'); continue; }
  const ex = kannabosDecode(plan.text) === t;
  const wt = countTokens(plan.text, ENC);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw=${String(raw).padStart(5)} wire=${String(wt).padStart(5)} ` +
    `gain=${String(raw - wt).padStart(4)} cols=${String(plan.cols).padStart(2)} rows=${String(plan.rows).padStart(3)} ` +
    `lit=${String(plan.literals).padStart(3)} dec=${ex ? 'EXACT' : '***BAD***'} codecs=${plan.codecs.join(',')}`);
  if (process.env.H) console.log('   hdr:', plan.header.slice(0, 220));
}
