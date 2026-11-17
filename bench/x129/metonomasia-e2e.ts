/**
 * X130 — ΜΕΤΟΝΟΜΑΣΊΑ end-to-end A/B on the 29 canonical lanes.
 *   A = tagstackEncode(src)                  (the true shipped frontier)
 *   B = metonomasiaEncode(src).message       (frontier + glyph relabelling)
 * Exactness gate: inverting the renaming must reproduce A's message, and A
 * itself guarantees decoded === src, so the two compose to byte-exactness.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { metonomasiaEncode, metonomasiaResetProbes } from '../../src/lib/omega/metonomasia';
// Pinned for determinism: without OMEGA_DET the frontier varies run to run
// (observed 12035 vs 12031), which would make any delta meaningless.
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
fs.mkdirSync('bench/x129/receipts', { recursive: true });
const f = fs.openSync('bench/x129/receipts/x130-metonomasia-e2e.jsonl', 'w');
let A = 0, B = 0, better = 0, worse = 0, exA = 0, exB = 0, msA = 0, msB = 0, noTape = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const t1 = Date.now(); const a: any = tagstackEncode(text, enc); const dA = Date.now() - t1;
  let bTok = a.messageTokens, dB = 0, note = 'off', exactB = a.decoded === text, rules = 0, merged = 0;
  try {
    const r = metonomasiaEncode(text, enc);
    if (r) { bTok = r.tokens; rules = r.rules; merged = r.mergedPairs; exactB = r.toFrontier(r.message) === a.message && a.decoded === text; note = `rules=${rules} merged=${merged}`; }
    else note = 'no-pay';
  } catch (e: any) { note = 'THREW ' + String(e.message).slice(0, 28); exactB = false; }
  const d = bTok - a.messageTokens;
  A += a.messageTokens; B += bTok; msA += dA; msB += dB;
  if (d < 0) better++; if (d > 0) worse++;
  if (a.decoded === text) exA++; if (exactB) exB++;
  if (a.message.indexOf('\u00a7') < 0) noTape++;
  fs.writeSync(f, JSON.stringify({ path: p, raw, a: a.messageTokens, b: bTok, delta: d, rules, merged, exactA: a.decoded === text, exactB, note, msA: dA, msB: dB }) + '\n');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  A ${String(a.messageTokens).padStart(5)}  B ${String(bTok).padStart(5)}  Δ ${String(d).padStart(5)}  ${note.padEnd(24)} exact ${a.decoded === text ? 'y' : 'N'}/${exactB ? 'y' : 'N'}`);
  metonomasiaResetProbes();
}
fs.closeSync(f);
console.log(`\nMETONOMASIA 29   A(frontier) ${A}   B(relabelled) ${B}   ΣΔ ${B - A}   better ${better} worse ${worse}  noTape ${noTape}`);
console.log(`exact  A ${exA}/29   B ${exB}/29`);
