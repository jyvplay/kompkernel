/**
 * bench/x124/steli-wired.ts — price the real chain with ΣΤΉΛΗ wired in, against
 * the same chain with OMEGA_NO_STELI=1, on the lanes where the fitter fires.
 * Run: LANES=a,b OMEGA_DET=1 node <out>.mjs   (and again with OMEGA_NO_STELI=1)
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const all = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const ORDER = process.env.LANES ? process.env.LANES.split(',') : null;
const CHUNK = Number(process.env.CHUNK ?? '0');
const PARTS = Number(process.env.PARTS ?? '1');
const lanes = (ORDER ? all.filter((p) => ORDER.includes(p.split('/').pop()!)) : all)
  .filter((_, i) => i % PARTS === CHUNK);
for (const p of lanes) {
  const src = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r = tagstackEncode(src, enc);
  const ms = Date.now() - t0;
  const toks = countTokens(r.message, enc);
  const arm = r.notes.includes('ΣΤΉΛΗ') ? 'STELI' : (r.notes.split(' ')[0] ?? '?');
  const row = `${String(process.env.OMEGA_NO_STELI === '1' ? 'OFF' : 'ON ')} ${p.split('/').pop()!.padEnd(24)} M ${String(toks).padStart(5)} exact ${r.decoded === src ? 'y' : 'n'} [${(ms / 1000).toFixed(1)}s] arm ${arm} | ${r.notes.slice(0, 120)}`;
  console.log(row);
  fs.appendFileSync('bench/x124/receipts-steli-wired.log', row + '\n');
}
