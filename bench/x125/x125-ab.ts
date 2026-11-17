/**
 * bench/x125/x125-ab.ts — X125 whole-corpus A/B, the same shape as X124's driver.
 *
 * Arms
 *   OFF = HEAD behaviour (ΑΝΑΓΡΑΦΗ off, ΚΛΉΡΩΣΙΣ off, ἘΠΙΨΉΦΙΣΙΣ off)
 *   ON  = all three X125 arms on
 *
 * Every row is priced with `countTokens` on the message `tagstackEncode`
 * actually returns — never with `tagstackFrontier`, which X124 showed is not the
 * shipped price — and every row checks `decoded === src`.
 *
 * Arm ORDER alternates by lane index, because the first encode in a process is
 * ~4x slower than the second (see the warm-up note in docs/codec-abbreviations.md);
 * the token totals are unaffected by that, only the wall figures are, so this
 * driver reports the MINIMUM wall time seen per (lane, arm) across rounds.
 *
 *   LANES=<comma list, default bench/x109/lanes29.txt>   ROUNDS=<default 1>
 *   CHUNK=<i> PARTS=<n>   to split the lane list across processes
 */
import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { countTokens, chunkCacheClear } from '../../src/lib/omega/bpe';
import { prolepsisReset } from '../../src/lib/omega/prolepsis';

const enc = 'o200k_base' as const;
const lanes = (process.env.LANES ?? fs.readFileSync('bench/x109/lanes29.txt', 'utf8'))
  .split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const ROUNDS = Number(process.env.ROUNDS ?? '1');
const CHUNK = Number(process.env.CHUNK ?? '0');
const PARTS = Number(process.env.PARTS ?? '1');
const mine = lanes.filter((_, i) => i % PARTS === CHUNK);

type Arm = 'OFF' | 'ON';
const setArm = (a: Arm): void => {
  if (a === 'ON') {
    delete process.env.OMEGA_NO_ANAGRAPHE;
    delete process.env.OMEGA_NO_KLEROSIS;
    process.env.OMEGA_EPIPSEPHISIS = '1';
  } else {
    process.env.OMEGA_NO_ANAGRAPHE = '1';
    process.env.OMEGA_NO_KLEROSIS = '1';
    delete process.env.OMEGA_EPIPSEPHISIS;
  }
};

const best = new Map<string, { M: number; ms: number; exact: boolean }>();
for (let r = 0; r < ROUNDS; r++) {
  for (let i = 0; i < mine.length; i++) {
    const p = mine[i]!;
    const src = fs.readFileSync(p, 'utf8');
    const order: Arm[] = (i + r) % 2 === 0 ? ['OFF', 'ON'] : ['ON', 'OFF'];
    for (const a of order) {
      setArm(a);
      tagstackMemoClear(); chunkCacheClear(); prolepsisReset();
      const t0 = Date.now();
      const out = tagstackEncode(src, enc);
      const ms = Date.now() - t0;
      const M = countTokens(out.message, enc);
      const exact = out.decoded === src;
      const k = `${p}|${a}`;
      const prev = best.get(k);
      if (!prev || ms < prev.ms) best.set(k, { M, ms, exact });
      if (!exact) console.log(`!!! INEXACT ${p} ${a}`);
      console.log(`r${r} ${p.split('/').pop()!.padEnd(22)} ${a} [${(ms / 1000).toFixed(1)}s] M=${M}`);
    }
  }
}

console.log('\nlane                     OFF    ON   Δ     OFFms    ONms');
let so = 0, sn = 0, to = 0, tn = 0, worse = 0, better = 0;
const rows: string[] = [];
for (const p of mine) {
  const o = best.get(`${p}|OFF`)!;
  const n = best.get(`${p}|ON`)!;
  const d = n.M - o.M;
  so += o.M; sn += n.M; to += o.ms; tn += n.ms;
  if (d < 0) better++; else if (d > 0) worse++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(o.M).padStart(5)} ${String(n.M).padStart(5)} ${String(d).padStart(4)}   ${String(o.ms).padStart(7)} ${String(n.ms).padStart(7)}   exact=${o.exact && n.exact}`);
  rows.push(JSON.stringify({ path: p, offTokens: o.M, onTokens: n.M, deltaTokens: d, offMs: o.ms, onMs: n.ms, exact: o.exact && n.exact }) + '\n');
}
console.log(`\nΣ OFF ${so}  Σ ON ${sn}  Δ ${sn - so}   (${better} better / ${worse} worse / ${mine.length - better - worse} same)`);
console.log(`Σ wall OFF ${(to / 1000).toFixed(1)}s  ON ${(tn / 1000).toFixed(1)}s  (${((tn / to - 1) * 100).toFixed(1)}%)`);
if (PARTS === 1) fs.appendFileSync('bench/x125/receipts/x125-ab.jsonl', rows.join(''));
