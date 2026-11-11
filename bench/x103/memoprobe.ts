/**
 * X103 — WHICH MEMO MOVES THE ANSWER?
 *
 * Three lanes differ between bench/x102/diagraphe29 (arm B = 12 405 total) and
 * bench/x103/settle (arm A = 12 415 total): apt-real 836 -> 843, code-ts
 * 968 -> 970, dpkg-l 667 -> 668.  Both probes set OMEGA_DET=1 and
 * OMEGA_NO_MEMO=1, so the difference is not the flag the protocol names.
 *
 * grep says why: OMEGA_NO_MEMO disables the TAGSTACK memo only (tagstack.ts:501,
 * :538, :564).  Two other process-global memos are still live — ἔγγραμμα
 * (engram.ts, OMEGA_ENGRAM=0) and the X67 OURA memo (oura.ts:494,
 * OMEGA_OURA_MEMO=0) — and both replay counted work into the shared meter, which
 * every later budget decision in the epoch reads.
 *
 * This probe runs the same three lanes under three settings, one process each,
 * and prints the token counts.  A control must be checked against a number the
 * code under test did not produce: the X102 receipt's own numbers are that
 * control here, and they are printed alongside.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const setting = process.argv[2];
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
if (setting === 'engram-off') process.env.OMEGA_ENGRAM = '0';
if (setting === 'oura-off') process.env.OMEGA_OURA_MEMO = '0';
if (setting === 'all-off') { process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; }
const enc: any = 'o200k_base';
const lanes = ['bench/holdout-x41/apt-real.txt', 'bench/holdout/code-ts.txt', 'bench/holdout-x42/dpkg-l.txt'];
const CONTROL: Record<string, number> = { 'bench/holdout-x41/apt-real.txt': 836, 'bench/holdout/code-ts.txt': 968, 'bench/holdout-x42/dpkg-l.txt': 667 };
const out: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const R: any = tagstackEncode(text, enc);
  out.push({ path: p, tokens: R.messageTokens, control: CONTROL[p], delta: R.messageTokens - CONTROL[p] });
  console.log(`${setting!.padEnd(11)} ${p.split('/').pop()!.padEnd(14)} tokens=${String(R.messageTokens).padStart(5)}  x102 receipt=${String(CONTROL[p]).padStart(5)}  Δ=${String(R.messageTokens - CONTROL[p]).padStart(3)}`);
}
fs.writeFileSync(`bench/x103/receipts/memoprobe-${setting}.json`, JSON.stringify({ setting, out }, null, 1));
