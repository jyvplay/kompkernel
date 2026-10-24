/**
 * X41 — baseline: what the shipped frontier costs on REAL material.
 *
 * These lanes are real tool output captured from this machine this turn (the
 * first line of each file names the command). They are not synthetic fixtures:
 * every byte below was produced by df / ps / ls / du / apt / git / node / tsc.
 */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').filter(Boolean);
for (const p of lanes) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = ouraEncode(t, enc);
  const ms = Date.now() - t0;
  console.log(
    p.split('/').pop()!.padEnd(22),
    'raw=' + String(countTokens(t, enc)).padStart(5),
    'oura=' + String(r.messageTokens).padStart(5),
    'd=' + String(r.messageTokens - countTokens(t, enc)).padStart(5),
    'contract=' + countTokens(r.contract || '', enc),
    'wire=' + countTokens(r.wire, enc),
    (ms / 1000).toFixed(0) + 's',
  );
}
