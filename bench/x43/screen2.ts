/**
 * X43 screen 2 — IS CHIRON'S SEARCH CONVERGED, OR MERELY OUT OF TIME?
 *
 * chiron.ts:1341 sets budgetMs = min(11_000, 800 + 1.1*len) and line 1373 caps
 * the whole sweep at min(26_000, 2.1*budgetMs). The smallest-grammar problem is
 * NP-hard (Charikar et al., STOC 2002) and CHIRON explicitly claims no
 * optimality — so the search stops on a WALL CLOCK, not on convergence.
 *
 * If a larger budget finds a materially smaller grammar, there is real headroom
 * that no mechanism change is needed to reach. If it does not, the search is
 * effectively converged and the headroom is elsewhere.
 *
 * Measured on the two cheapest lanes so the multiplier through the stack
 * (SYSTOLE encodes twice, PERITROPE twice more) stays affordable.
 */
import { readFileSync } from 'node:fs';
import { chironEncode, chironDecode } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean);

for (const p of lanes) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  console.log(`\n=== ${nm}  (${t.length} chars, raw ${chironEncode(t, enc, { budgetMs: 1 }).messageTokens} fallback)`);
  for (const budget of [undefined, 4_000, 11_000, 26_000]) {
    const t0 = Date.now();
    const r = chironEncode(t, enc, budget === undefined ? {} : { budgetMs: budget });
    const ms = Date.now() - t0;
    const ok = chironDecode(r.wire) === t ? 'EXACT' : '***FAIL***';
    console.log(`  budget=${String(budget ?? 'default').padStart(7)}  msg=${String(r.messageTokens).padStart(5)}  script=${String(r.script).padEnd(9)} rules=${String(r.rules).padStart(3)} blocks=${String(r.blocks).padStart(3)}  ${ok}  ${ms}ms`);
  }
  // workUnits path (deterministic, used by benches)
  for (const wu of [20_000, 200_000]) {
    const t0 = Date.now();
    const r = chironEncode(t, enc, { workUnits: wu });
    const ms = Date.now() - t0;
    const ok = chironDecode(r.wire) === t ? 'EXACT' : '***FAIL***';
    console.log(`  workUnits=${String(wu).padStart(7)}  msg=${String(r.messageTokens).padStart(5)}  script=${String(r.script).padEnd(9)} rules=${String(r.rules).padStart(3)} blocks=${String(r.blocks).padStart(3)}  ${ok}  ${ms}ms`);
  }
}
