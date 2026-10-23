/**
 * X45 screen 1 — ATTRIBUTE THE 8 MILLION countTokens CALLS.
 *
 * X44 localized the stack's dominant cost to a single layer: anadiplosisEncode
 * takes 86,703 ms and makes 15.83M countTokens calls on ls-full-iso, against
 * chironEncode's 542 ms and 0.04M -- a 160-fold jump at one layer. X44 also
 * recorded that syncopeEncode makes only ONE trial, so the cost is not trial-tree
 * breadth at that level.
 *
 * Reading the call graph settles where it is. syncopeEncode calls pyknosisEncode
 * once and oikonomiaEncode once; pyknosisEncode calls oikonomiaEncode twice. So one
 * syncopeEncode is FOUR oikonomiaEncode calls, and since anadiplosisEncode calls
 * syncopeEncode twice, ONE anadiplosisEncode IS EIGHT oikonomiaEncode CALLS.
 * oikonomia is therefore the unit of cost, and this measures it directly.
 *
 * Each layer is timed alone with bpe.ts's own exported cache counters read before
 * and after, so the call count is attributed rather than inferred.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode } from '@/lib/omega/chiron';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { pyknosisEncode } from '@/lib/omega/pyknosis';
import { syncopeEncode } from '@/lib/omega/syncope';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;

const LAYERS: Array<[string, (t: string) => any]> = [
  ['chiron     ', (t) => chironEncode(t, enc)],
  ['oikonomia  ', (t) => oikonomiaEncode(t, enc)],
  ['pyknosis   ', (t) => pyknosisEncode(t, enc)],
  ['syncope    ', (t) => syncopeEncode(t, enc)],
  ['anadiplosis', (t) => anadiplosisEncode(t, enc)],
];

const calls = () => {
  const s = chunkCacheStats();
  return s.shortHits + s.shortMisses + s.longHits + s.longMisses;
};

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  console.log(`\n=== ${p.split('/').pop()}  (${t.length} chars, ${countTokens(t, enc)} raw tokens)`);
  console.log('  layer         self-ms   cum-ms    msg   countTokens calls   distinct-long  distinct-short');
  let prevMs = 0;
  for (const [name, fn] of LAYERS) {
    chunkCacheClear();
    const before = calls();
    const t0 = Date.now();
    let r: any;
    try { r = fn(t); } catch (e: any) { console.log(`  ${name} THREW ${String(e).slice(0, 50)}`); continue; }
    const ms = Date.now() - t0;
    const after = chunkCacheStats();
    const n = (after.shortHits + after.shortMisses + after.longHits + after.longMisses) - before;
    console.log(`  ${name} ${String(ms - prevMs).padStart(8)}  ${String(ms).padStart(7)}  ${String(r.messageTokens).padStart(5)}  ${String(n).padStart(17)}  ${String(after.longSize).padStart(13)}  ${String(after.shortSize).padStart(15)}`);
    prevMs = ms;
  }
}
