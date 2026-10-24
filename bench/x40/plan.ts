/** X40 — plan-only sweep: which lanes does KANON find a generator for? (no parent encode) */
import * as fs from 'node:fs';
import { metronPlan } from '@/lib/omega/metron';
import { apographePlan } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const base = countTokens(t, enc);
  let k: any = null, a: any = null;
  try { k = metronPlan(t, enc); } catch (e: any) { console.log(p, 'THREW', e.message); continue; }
  try { a = apographePlan(t, enc); } catch { a = null; }
  const show = (r: any) => r
    ? `hdr=${r.header} gain=${r.proxyGain} lit=${r.literalRows} mod=${r.modelledRows}` : 'none';
  console.log(p.split('/').pop()!.padEnd(24), 'raw=' + base,
    '\n    apo   ' + show(a), '\n    metron ' + show(k));
}
