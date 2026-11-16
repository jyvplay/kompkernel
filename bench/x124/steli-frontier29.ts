/**
 * bench/x124/steli-frontier29.ts — X124. Two jobs in one pass, per lane.
 *
 *   1. RE-CONFIRMATION. Price the parent frontier on every lane of the 29-lane
 *      holdout and compare it with the price frozen in
 *      bench/x123/receipts/ab2-messages.jsonl (the X123 AB2 corpus). If the two
 *      disagree the frontier has moved and the X124 numbers are not comparable,
 *      so the disagreement is printed rather than averaged away.
 *   2. ΣΤΉΛΗ. Fit the offset model, price the complete message, and require the
 *      G6 gate to beat the price actually measured today.
 *
 * Run: OMEGA_DET=1 CHUNK=0,3 node --max-old-space-size=6000 <out>.mjs
 * Every row is appended to bench/x124/receipts-steli-frontier29.log.
 */
import * as fs from 'node:fs';
import { steliEncode, steliFit } from '../../src/lib/omega/steli';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const all = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const ab2 = new Map<string, number>();
for (const line of fs.readFileSync('bench/x123/receipts/ab2-messages.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  ab2.set(r.path as string, r.offTokens as number);
}
const chunk = Number(process.env.CHUNK ?? '0');
const parts = Number(process.env.PARTS ?? '1');
const lanes = all.filter((_, i) => i % parts === chunk);
const log = 'bench/x124/receipts-steli-frontier29.log';

let sumFrozen = 0;
let sumToday = 0;
let sumDelta = 0;

for (const p of lanes) {
  const src = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const frozen = ab2.get(p) ?? null;
  const today = countTokens(tagstackEncode(src, enc).message, enc);
  const fit = steliFit(src.split('\n'));
  const r = steliEncode(src, enc, { incumbent: today });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const fitDesc = fit ? `fit ${fit.rows}x${fit.offsets.length} off ${fit.offsets.join(',')} pad ${fit.padMass} split ${fit.split}` : 'no fit';
  const frozenNote = frozen === null ? 'nofrozen' : (frozen === today ? 'same' : `MOVED ${today - frozen}`);
  const delta = r.applied ? r.messageTokens - today : 0;
  sumToday += today;
  sumDelta += delta;
  if (frozen !== null) sumFrozen += frozen;
  const row =
    `${p.split('/').pop()!.padEnd(24)} frozen ${String(frozen ?? '-').padStart(5)} today ${String(today).padStart(5)} ` +
    `${frozenNote.padEnd(12)} steli ${String(r.messageTokens).padStart(5)} Δ ${String(delta).padStart(5)} ` +
    `exact ${r.exact ? 'y' : 'n'} [${dt}s] ${fitDesc}${r.applied ? '' : ' | ' + r.notes}`;
  console.log(row);
  fs.appendFileSync(log, row + '\n');
}
const tail = `chunk ${chunk}/${parts}: Σ frozen ${sumFrozen} Σ today ${sumToday} Σ Δ ${sumDelta} over ${lanes.length} lanes`;
console.log(tail);
fs.appendFileSync(log, tail + '\n');
