/** X130: what is the CEILING of glyph relabelling? big budget, per-lane. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { metonomasiaEncode, metonomasiaResetProbes } from '../../src/lib/omega/metonomasia';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const budget = process.env.OMEGA_METONOMASIA_MS ?? '60000';
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const t = Date.now();
  let r: any = null;
  try { r = metonomasiaEncode(text, enc); } catch (e: any) { console.log(`${p.split('/').pop()!.padEnd(22)} THREW ${e.message.slice(0, 40)}`); continue; }
  const ms = Date.now() - t;
  if (!r) { console.log(`${p.split('/').pop()!.padEnd(22)} A=${String(a.messageTokens).padStart(5)}  no-pay  (${ms}ms)`); metonomasiaResetProbes(); continue; }
  const ok = r.toFrontier(r.message) === a.message && a.decoded === text;
  console.log(`${p.split('/').pop()!.padEnd(22)} A=${String(a.messageTokens).padStart(5)}  B=${String(r.tokens).padStart(5)}  Δ=${String(r.tokens - a.messageTokens).padStart(5)}  rules=${String(r.rules).padStart(3)} merged ${r.mergedBefore}->${r.mergedAfter}  ${ok ? 'EXACT' : '***MISMATCH***'}  ${ms}ms (budget ${budget})`);
  metonomasiaResetProbes();
}
