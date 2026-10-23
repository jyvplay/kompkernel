/**
 * X45 screen 2 — DOES TIMEMA'S SHAPE-TRIAL SEARCH PAY FOR ITSELF?
 *
 * X45 screen 1 attributed the stack's dominant cost precisely: on pom.xml
 * chironEncode makes 20,267 countTokens calls in 290 ms, while oikonomiaEncode
 * makes 2,978,915 calls in 11,696 ms -- and pyknosis, syncope and anadiplosis each
 * add nothing on top (negative self-time, identical call counts), because they only
 * delegate. oikonomiaEncode is itself a thin pass-through with no search of its own,
 * so all three million calls are inside TIMEMA.
 *
 * TIMEMA's budget is already parameterised and already exposed: OIKONOMIA_DEFAULT_IN_CAP
 * = 4 is a hard ceiling on 'in' shape trials and OIKONOMIA_DEFAULT_IN_GATE = 1
 * abandons that order as soon as a trial fails to improve with nothing accepted
 * yet. X33 introduced the gate; the cap is unchanged from X24. Nobody has since
 * asked whether the cap is worth what it costs.
 *
 * This sweeps both parameters and reports, for each setting, the message size, the
 * wall clock and the countTokens call count. If inCap=1 reaches the same message
 * size as inCap=4 on a lane, that lane is paying up to four times its necessary
 * encode cost for nothing, and an adaptive cap becomes a large, general, provably
 * output-identical speed win. If inCap=4 is strictly better somewhere, the search
 * pays and the interesting question becomes which lanes can tell the difference in
 * advance.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { oikonomiaEncode, oikonomiaDecode } from '@/lib/omega/oikonomia';
import { chironDecode } from '@/lib/omega/chiron';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits + s.shortMisses + s.longHits + s.longMisses; };

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  console.log(`\n=== ${p.split('/').pop()}  (${t.length} chars, ${countTokens(t, enc)} raw)`);
  console.log('  inCap inGate   msg    ms      calls(M)   rt   vs default');
  let defMsg = NaN, defMs = 0;
  for (const inCap of [1, 2, 3, 4, 6, 8]) {
    for (const inGate of [0, 1]) {
      chunkCacheClear();
      const before = calls();
      const t0 = Date.now();
      let r: any;
      try { r = oikonomiaEncode(t, enc, { inCap, inGate }); } catch (e: any) {
        console.log(`  ${String(inCap).padStart(5)} ${String(inGate).padStart(6)}   THREW ${String(e).slice(0, 40)}`); continue;
      }
      const ms = Date.now() - t0;
      const n = calls() - before;
      let rt = '?';
      try { rt = oikonomiaDecode(r.wire, { stats: r.stats, order: r.order, undo: chironDecode } as any) === t ? 'OK' : 'FAIL'; } catch { rt = 'THREW'; }
      if (inCap === 4 && inGate === 1) { defMsg = r.messageTokens; defMs = ms; }
      const rel = isNaN(defMsg) ? '' : (r.messageTokens === defMsg ? 'same' : (r.messageTokens < defMsg ? `BETTER by ${defMsg - r.messageTokens}` : `worse by ${r.messageTokens - defMsg}`));
      console.log(`  ${String(inCap).padStart(5)} ${String(inGate).padStart(6)}  ${String(r.messageTokens).padStart(5)}  ${String(ms).padStart(7)}  ${(n / 1e6).toFixed(2).padStart(9)}   ${rt.padEnd(4)} ${rel}`);
    }
  }
  if (!isNaN(defMsg)) console.log(`  default (4,1): ${defMsg} tokens in ${defMs} ms`);
}
