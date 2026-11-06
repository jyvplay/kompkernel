/**
 * X77 / speed2 — EXACTNESS before speed.
 * The LUT path must return exactly what the reference returns, on every fixture and on
 * fuzz. Run twice: once with the LUT (default) and once with OMEGA_NO_LUT=1.
 */
import * as fs from 'node:fs';
import { countTokens, countTokensExact, verifyChunkAlgebra, chunkCacheStats } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
let bad = 0, n = 0;
const check = (s: string, tag: string) => {
  n++;
  const a = countTokens(s, enc);
  const b = countTokensExact(s, enc);
  if (a !== b) { bad++; if (bad <= 5) console.log(`MISMATCH ${tag}: ${a} vs ${b} :: ${JSON.stringify(s.slice(0, 80))}`); }
};
const files = process.argv.slice(2);
for (const p of files) {
  const t = fs.readFileSync(p, 'utf8');
  check(t, p);
  for (const line of t.split('\n')) check(line, `${p}:line`);
  // every substring window — this is what the frontier actually counts
  for (let i = 0; i + 200 < t.length; i += 37) check(t.slice(i, i + 200), `${p}:win${i}`);
}
// fuzz: random strings with a heavy short-chunk bias (the case the LUT handles)
let seed = 424242;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const POOL = 'ab cd01./-_:\n\t§¶⁺Абв';
for (let i = 0; i < 4000; i++) {
  const L = 1 + Math.floor(rnd() * 120);
  let s = '';
  for (let j = 0; j < L; j++) s += POOL[Math.floor(rnd() * POOL.length)];
  check(s, 'fuzz');
}
// deliberately length-1 and length-2 exhaustive over a wide code-unit range
for (let c = 32; c < 3000; c++) { check(String.fromCharCode(c), 'c1'); }
for (let c = 32; c < 600; c++) for (const d of [32, 46, 47, 97, 48]) { check(String.fromCharCode(c) + String.fromCharCode(d), 'c2'); }
const st = chunkCacheStats();
console.log(`LUT=${process.env.OMEGA_NO_LUT === '1' ? 'OFF' : 'ON '} checked ${n} strings, mismatches ${bad} | hits ${st.hits} misses ${st.misses} fallbacks ${st.fallbacks}`);
