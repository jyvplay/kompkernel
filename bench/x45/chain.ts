/**
 * X45 screen 3 — ATTRIBUTE THE 1.67 MILLION CALLS OF A SINGLE TIMEMA TRIAL.
 *
 * screen 2 established that TIMEMA's shape-trial budget buys nothing: on pom.xml
 * and component.jsx every inCap from 1 to 8 and both gate settings return the
 * IDENTICAL message size, byte-exact, while inCap=1 uses 1.67M countTokens calls
 * against the default's 2.98M and the ungated cap-4 run's 5.60M. So the cap can be
 * cut. But one trial still costs 1.67M calls and 8.2 seconds on a 1,797-character
 * file, and that is the number worth explaining.
 *
 * The call graph is timema -> heuresis -> syntomos -> metathesis -> symploke ->
 * chiron, and metathesis.ts:290 threads inCap/inGate down into symplokeEncode, so
 * the 'in' shape trials live at the bottom of that chain rather than the top. This
 * times each layer alone with bpe.ts's exported counters read around it, which
 * attributes calls instead of inferring them.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode } from '@/lib/omega/chiron';
import { symplokeEncode } from '@/lib/omega/symploke';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { timemaEncode } from '@/lib/omega/timema';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits + s.shortMisses + s.longHits + s.longMisses; };

const LAYERS: Array<[string, (t: string) => any]> = [
  ['chiron    ', (t) => chironEncode(t, enc)],
  ['symploke  ', (t) => symplokeEncode(t, enc)],
  ['metathesis', (t) => metathesisEncode(t, enc)],
  ['syntomos  ', (t) => syntomosEncode(t, enc)],
  ['heuresis  ', (t) => heuresisEncode(t, enc)],
  ['timema    ', (t) => timemaEncode(t, enc)],
  ['oikonomia ', (t) => oikonomiaEncode(t, enc)],
];

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  console.log(`\n=== ${p.split('/').pop()}  (${t.length} chars, ${countTokens(t, enc)} raw)`);
  console.log('  layer        self-ms    cum-ms    msg    calls      delta-calls   longSize');
  let prevMs = 0, prevCalls = 0;
  for (const [name, fn] of LAYERS) {
    chunkCacheClear();
    const t0 = Date.now();
    let r: any;
    try { r = fn(t); } catch (e: any) { console.log(`  ${name} THREW ${String(e).slice(0, 60)}`); continue; }
    const ms = Date.now() - t0;
    const st = chunkCacheStats();
    const n = st.shortHits + st.shortMisses + st.longHits + st.longMisses;
    console.log(`  ${name} ${String(ms - prevMs).padStart(8)} ${String(ms).padStart(9)}  ${String(r.messageTokens).padStart(5)}  ${String(n).padStart(9)}  ${String(n - prevCalls).padStart(12)}  ${String(st.longSize).padStart(9)}`);
    prevMs = ms; prevCalls = n;
  }
}
