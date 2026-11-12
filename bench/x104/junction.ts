/**
 * X105 — DOES A PAIRWISE JUNCTION MODEL PRICE A PERMUTED TAPE EXACTLY?
 *
 * A permutation of ΜΕΤΑΤΑΞΙΣ's tape changes only which blocks are adjacent. If
 *   price(o) = head + tail + sum_i t_i + sum_j junction(B_j, B_{j+1})
 * with junction(i,j) = countTokens(B_i + B_j) - t_i - t_j precomputable for all
 * n^2 ordered pairs, then a probe costs O(n) integer lookups instead of an
 * O(message) string rebuild plus a full re-tokenisation -- and ΜΕΤΑΤΑΞΙΣ, which
 * bench/x97 measured as still improving at its 16 000-probe cap, could afford
 * orders of magnitude more probes in the same time.
 *
 * The model is an approximation in principle: a token that SPANS a junction
 * shifts where the scan resumes inside the next block, which can change that
 * block's interior tokenisation. So the model is tested against the exact price
 * on many random permutations and the WORST absolute error is reported. A model
 * that is not exact is still usable as a ranking function, but it must not be
 * presented as the price.
 */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';

const enc: any = 'o200k_base';
const lane = process.argv[2];
const TRIALS = Number(process.argv[3] ?? 200);
const text = fs.readFileSync(lane, 'utf8');
const r: any = tagstackFrontier(text, enc);
const msg: string = r.message ?? '';
const w = msg.indexOf(CHIRON_START), tEnd = msg.indexOf(CHIRON_SEP, w);
const head = msg.slice(0, w + CHIRON_START.length), tape = msg.slice(w + CHIRON_START.length, tEnd), tail = msg.slice(tEnd);
const keys: string[] = [], values: string[] = []; const seen = new Set<string>();
let ck = '', cv = '';
for (const ch of tape) {
  if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
  else cv += ch;
}
if (ck !== '') { keys.push(ck); values.push(cv); }
const blocks = keys.map((k, i) => k + values[i]);
const n = blocks.length;
const t = blocks.map(b => countTokens(b, enc));
const headT = countTokens(head, enc), tailT = countTokens(tail, enc);
const base = headT + tailT + t.reduce((a, b) => a + b, 0);

const tm0 = Date.now();
// junction[i*n+j] = countTokens(B_i + B_j) - t_i - t_j  (symmetric in practice, computed both ways)
const J = new Int32Array(n * n);
for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
  if (i === j) { J[i * n + j] = 0; continue; }
  J[i * n + j] = countTokens(blocks[i] + blocks[j], enc) - t[i] - t[j];
}
const buildMs = Date.now() - tm0;

const serialise = (o: number[]) => { let s = ''; for (const i of o) s += blocks[i]; return s; };
const exactPrice = (o: number[]) => countTokens(head + serialise(o) + tail, enc);
const modelPrice = (o: number[]) => { let s = base; for (let k = 0; k + 1 < n; k++) s += J[o[k] * n + o[k + 1]]; return s; };

// deterministic PRNG so the trial set is reproducible
let seed = 0x51ed; const rnd = () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };

let worst = 0, sumErr = 0, exactMs = 0, modelMs = 0;
const idOrder = blocks.map((_, i) => i);
const e0 = exactPrice(idOrder), m0 = modelPrice(idOrder);
for (let tr = 0; tr < TRIALS; tr++) {
  const o = idOrder.slice();
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = o[i]; o[i] = o[j]; o[j] = tmp; }
  const a = Date.now(); const ep = exactPrice(o); exactMs += Date.now() - a;
  const b = Date.now(); const mp = modelPrice(o); modelMs += Date.now() - b;
  const err = mp - ep;
  if (Math.abs(err) > Math.abs(worst)) worst = err;
  sumErr += Math.abs(err);
}
console.log(`${lane.split('/').pop()!.padEnd(20)} rules=${String(n).padStart(4)} identity: exact=${e0} model=${m0} err=${m0 - e0}`);
console.log(`${''.padEnd(20)} trials=${TRIALS} worstErr=${worst} meanAbsErr=${(sumErr / TRIALS).toFixed(2)}  matrixBuild=${buildMs}ms  exactTotal=${exactMs}ms modelTotal=${modelMs}ms  speedup=${(exactMs / Math.max(1, modelMs)).toFixed(1)}x`);
