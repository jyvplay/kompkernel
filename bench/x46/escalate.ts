/**
 * X46 screen 1 — IS SYMPLOKE'S SHAPE SEARCH CONVERGED, OR MERELY CAPPED?
 *
 * Every budget intervention in this repository has pushed in one direction. X43's
 * KRISIS gates whole layers off. X45's METRON cut SYMPLOKE's shape-trial ceiling
 * from the value it has held since X24. Both were about spending LESS.
 *
 * X45's own counterexample points the other way and was never followed up. On
 * dump.sql, inCap=1 returns 668 tokens and inCap=4 returns 608. That is SIXTY
 * TOKENS FROM THREE EXTRA TRIALS -- twenty tokens per trial, against a lane whose
 * whole message is 608. On the markup and code lanes that motivated the cap, every
 * value from 1 to 8 returned the identical number, so the marginal value of a trial
 * there is exactly zero. The marginal value is therefore not small and uniform
 * across lanes; it is ZERO on some and TWENTY TOKENS on others.
 *
 * Nothing has ever measured the curve above the default. If the returns on dump.sql
 * are not diminishing at 4, then the stack has been leaving tokens on the table on
 * exactly the class of input -- dense uniform-width rows -- where its lattice
 * mechanism works, and the correct intervention is to spend MORE where the evidence
 * says it pays. That is the mirror image of METRON and it is a compression gain
 * rather than a speed gain.
 *
 * Measured at the oikonomia level so the sweep is not multiplied by the nine layers
 * above it, with a byte-exact decode for every point.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { oikonomiaEncode, oikonomiaDecode } from '@/lib/omega/oikonomia';
import { chironDecode } from '@/lib/omega/chiron';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits + s.shortMisses + s.longHits + s.longMisses; };

const CAPS = (process.env.CAPS || '1,2,4,6,8,12,16,24').split(',').map(Number);
const GATES = (process.env.GATES || '1').split(',').map(Number);

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  console.log(`\n=== ${nm}  (${t.length} chars, raw ${countTokens(t, enc)} tokens)`);
  console.log('  inCap inGate     msg      ms   calls(M)   rt    vs cap4   marginal/trial');
  let ref = NaN;
  let prevMsg = NaN, prevCap = NaN;
  for (const inGate of GATES) {
    for (const inCap of CAPS) {
      chunkCacheClear();
      const b = calls();
      const t0 = Date.now();
      let r: any;
      try { r = oikonomiaEncode(t, enc, { inCap, inGate }); } catch (e: any) {
        console.log(`  ${String(inCap).padStart(5)} ${String(inGate).padStart(6)}  THREW ${String(e).slice(0, 50)}`); continue;
      }
      const ms = Date.now() - t0;
      const n = calls() - b;
      let rt = '?';
      try { rt = oikonomiaDecode(r.wire, { stats: r.stats, order: r.order, undo: chironDecode } as any) === t ? 'OK' : 'FAIL'; } catch { rt = 'THREW'; }
      if (inCap === 4 && inGate === 1) ref = r.messageTokens;
      const vsRef = isNaN(ref) ? '' : (r.messageTokens === ref ? 'same' : (r.messageTokens < ref ? `BETTER by ${ref - r.messageTokens}` : `worse by ${r.messageTokens - ref}`));
      let marg = '';
      if (!isNaN(prevMsg) && prevCap > 0 && inCap > prevCap && prevMsg !== r.messageTokens) {
        marg = `${((prevMsg - r.messageTokens) / (inCap - prevCap)).toFixed(1)} tok/trial`;
      }
      console.log(`  ${String(inCap).padStart(5)} ${String(inGate).padStart(6)} ${String(r.messageTokens).padStart(7)} ${String(ms).padStart(8)}  ${(n / 1e6).toFixed(2).padStart(8)}   ${rt.padEnd(5)} ${vsRef.padEnd(15)} ${marg}`);
      prevMsg = r.messageTokens; prevCap = inCap;
    }
  }
}
