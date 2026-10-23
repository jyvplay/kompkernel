/**
 * X47 screen 4 — CAN THE STACK BE MADE DETERMINISTIC WITHOUT COSTING TOKENS?
 *
 * X46 found TEKMAR returning 607 on dump.sql where X45's parent returned 608 through
 * what is by construction the same computation, and attributed it to CHIRON's
 * wall-clock-bounded variant sweep. X47 screen 1 tested that on pom.xml and found
 * CHIRON DETERMINISTIC there -- five identical runs, all 305 -- because the budget
 * was never binding: 66 ms against a 2,777 ms allowance. So the clock bound only
 * bites on inputs large enough to exhaust it, which is exactly the inputs that are
 * expensive to re-run, which is why nobody has measured it.
 *
 * Screen 1 also found the deterministic alternative has a CLIFF. workUnits replaces
 * the clock with a counted budget, and on pom.xml: 5,000 units returns the RAW
 * FALLBACK at 544 tokens with zero rules, 50,000 returns 312 with 8 rules, and
 * 500,000 returns 305 with 13 rules -- identical to the wall-clock default. So a
 * deterministic budget is usable but must be set above the convergence point, and
 * setting it below that is catastrophic rather than merely approximate.
 *
 * This asks whether a work-unit budget, set above the cliff, reproduces the
 * wall-clock result exactly and repeatably at the level where the search actually
 * runs. Measured at oikonomia rather than the full stack so several repetitions
 * are affordable.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { oikonomiaEncode, oikonomiaDecode } from '@/lib/omega/oikonomia';
import { chironDecode } from '@/lib/omega/chiron';
const enc = 'o200k_base' as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits+s.shortMisses+s.longHits+s.longMisses; };
const REPS = Number(process.env.REPS || 3);
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  const t = readFileSync(p,'utf8');
  console.log(`\n=== ${p.split('/').pop()} (${t.length} ch, raw ${countTokens(t,enc)})`);
  for (const [nm,cfg] of [['wall-clock (default)',{}],['workUnits=500000',{workUnits:500_000}],['workUnits=2000000',{workUnits:2_000_000}]] as Array<[string,any]>) {
    const out: string[] = [];
    for (let i=0;i<REPS;i++) {
      chunkCacheClear(); const b=calls(); const t0=Date.now();
      const r:any = oikonomiaEncode(t,enc,cfg);
      const ms=Date.now()-t0, n=calls()-b;
      let ok=false; try{ ok = oikonomiaDecode(r.wire,{stats:r.stats,order:r.order,undo:chironDecode} as any)===t; }catch{}
      out.push(`${r.messageTokens}tok/${ms}ms/${(n/1e6).toFixed(2)}M/${ok?'EXACT':'FAIL'}`);
    }
    const uniq = new Set(out.map(s=>s.split('/')[0]));
    console.log(`  ${nm.padEnd(22)} ${REPS} runs: ${out.join('  ')}`);
    console.log(`  ${''.padEnd(22)} -> ${uniq.size===1?'DETERMINISTIC':'*** VARIES: '+[...uniq].join(',')}`);
  }
}
