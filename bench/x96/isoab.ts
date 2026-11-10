/**
 * X96 — INTERLEAVED A/B FOR ἸΣΟΜΟΡΦΊΑ.  Three configurations, one process, one lane
 * at a time, memo bypassed, so the comparison is not cross-process drift.
 *
 * WHY INTERLEAVED.  This box drifts ~1.6x cross-process and ±25 % per lane on
 * identical bytes (X89 §2, X95).  A before/after pair run in two processes is
 * therefore not a measurement of anything.  Here the three arms are run back to
 * back inside one process on the same lane, so load affects them together.
 *
 * WHY THE MEMO IS OFF.  `tagstackEncode`'s memo key is `X\0<text>\0<enc>` and does
 * NOT include the environment, so a second call with a different
 * OMEGA_NO_ISO / OMEGA_ISO_ITERS would return the first arm's cached object.
 * OMEGA_NO_MEMO=1 routes to tagstackX74Chain directly, which is the same chain
 * without the cache.
 *
 * Arms: BASE (pass skipped), ISO250 (the shipped default), ISO900 (the revision
 * RUN K's pass 2 actually measured).  Reported per lane: tokens, exactness, and
 * milliseconds.  The ms column is the only honest speed evidence here, and it is
 * per-lane interleaved rather than a total.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const OUT = 'bench/x96/receipts/isoab.json';

const LANES = process.argv.slice(2);
const rows: any[] = [];
for (const p of LANES) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop();
  const arm: Record<string, { toks: number; exact: boolean; sha: string }> = {};
  const msArm: Record<string, number[]> = {};
  const run = (tag: string, setup: () => void): void => {
    setup();
    const t1 = Date.now();
    const r: any = tagstackEncode(text, enc);
    const ms = Date.now() - t1;
    arm[tag] = { toks: r.messageTokens, exact: r.decoded === text, sha: createHash('sha256').update(r.message, 'utf8').digest('hex').slice(0, 16) };
    (msArm[tag] ??= []).push(ms);
  };
  // three repetitions per arm, interleaved, so ordering and load affect them together
  for (let rep = 0; rep < 3; rep++) {
    run('base', () => { process.env.OMEGA_NO_ISO = '1'; });
    run('iso400', () => { delete process.env.OMEGA_NO_ISO; process.env.OMEGA_ISO_ITERS = '400'; });
    run('iso900', () => { delete process.env.OMEGA_NO_ISO; process.env.OMEGA_ISO_ITERS = '900'; });
  }
  const med = (k: string) => {
    const v = [...(msArm[k] ?? [])].sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };
  rows.push({
    lane, path: p, rawChars: text.length,
    base: arm.base.toks, iso400: arm.iso400.toks, iso900: arm.iso900.toks,
    d400: arm.iso400.toks - arm.base.toks, d900: arm.iso900.toks - arm.base.toks,
    exactBase: arm.base.exact, exact400: arm.iso400.exact, exact900: arm.iso900.exact,
    shaBase: arm.base.sha, sha400: arm.iso400.sha, sha900: arm.iso900.sha,
    msBase: med('base'), ms400: med('iso400'), ms900: med('iso900'),
  });
  const r = rows[rows.length - 1];
  console.log(`${lane!.padEnd(24)} base=${String(r.base).padStart(5)} iso400=${String(r.iso400).padStart(5)}(${String(r.d400).padStart(3)}) ` +
    `iso900=${String(r.iso900).padStart(5)}(${String(r.d900).padStart(3)}) exact=${r.exactBase}/${r.exact400}/${r.exact900} ` +
    `ms ${r.msBase}/${r.ms400}/${r.ms900} sha=${r.shaBase === r.sha400 ? 'SAME' : 'DIFF'}`);
  fs.mkdirSync('bench/x96/receipts', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    note: 'X96 interleaved single-process A/B of ISOMORPHIA; OMEGA_DET=1 OMEGA_NO_MEMO=1; 3 repetitions per arm, median ms',
    rows,
    totals: {
      base: rows.reduce((a, b) => a + b.base, 0),
      iso400: rows.reduce((a, b) => a + b.iso400, 0),
      iso900: rows.reduce((a, b) => a + b.iso900, 0),
      msBase: rows.reduce((a, b) => a + (b.msBase ?? 0), 0),
      ms400: rows.reduce((a, b) => a + (b.ms400 ?? 0), 0),
      ms900: rows.reduce((a, b) => a + (b.ms900 ?? 0), 0),
    },
  }, null, 1) + '\n');
}
const T = rows.reduce((a, b) => a + (b.msBase ?? 0), 0);
const T2 = rows.reduce((a, b) => a + (b.ms400 ?? 0), 0);
const T9 = rows.reduce((a, b) => a + (b.ms900 ?? 0), 0);
console.log(`\n=== X96 ISOMORPHIA INTERLEAVED A/B (${LANES.length} lanes, 3 reps/arm, median ms) ===`);
console.log(`tokens  base ${rows.reduce((a, b) => a + b.base, 0)}  iso400 ${rows.reduce((a, b) => a + b.iso400, 0)} (${rows.reduce((a, b) => a + b.d400, 0)})  iso900 ${rows.reduce((a, b) => a + b.iso900, 0)} (${rows.reduce((a, b) => a + b.d900, 0)})`);
console.log(`ms      base ${T}  iso400 ${T2} (+${T ? (100 * (T2 - T) / T).toFixed(1) : '?'}%)  iso900 ${T9} (+${T ? (100 * (T9 - T) / T).toFixed(1) : '?'}%)`);
console.log(`exact   ${rows.filter((r) => r.exactBase).length}/${rows.filter((r) => r.exact400).length}/${rows.filter((r) => r.exact900).length} of ${LANES.length}`);
console.log(`lanes where iso400 changes the sha: ${rows.filter((r) => r.shaBase !== r.sha400).length} (these are the lanes the pass rewrote)`);
console.log(`\nwrote ${OUT}`);
