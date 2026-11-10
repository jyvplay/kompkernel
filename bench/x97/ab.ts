/**
 * X97 — INTERLEAVED SINGLE-PROCESS A/B OF THE TWO POST-PASSES.  Three arms, one process, one lane
 * at a time, memo bypassed, three repetitions each, medians.  Cross-process wall clock on this box
 * drifts ~1.6x and per-lane deltas on identical bytes range -8 % to +36 %, so a before/after pair in
 * two processes is not a measurement of anything (X89 §2, X95).  Interleaving is the only honest form.
 *
 * ARMS.
 *   base — neither post-pass runs.  This is the pre-X96 shipped tier.
 *   iso  — ἸΣΟΜΟΡΦΊΑ only (X96: adjacent swaps + single-letter relabel, 400 probes).
 *   meta — ΜΕΤΑΤΑΞΙΣ only (X97: arbitrary-rank relocation, length-derived budget).
 *
 * WHY THE MEMO IS OFF.  `tagstackEncode`'s memo key is `X\0<text>\0<enc>` and does NOT include the
 * environment, so a second arm would be served the first arm's cached object.  Measured in X96: with
 * the memo on, apt-real printed 850 for both arms; with it off, 850 and 846.  OMEGA_NO_MEMO is
 * load-bearing, not an optimisation.
 *
 * WHY OMEGA_DET=1.  Without it `clock.ts` lets every wall-clock budget fire for real and the searches
 * stop early: X96 measured an A/B revision that omitted it reporting bases 11-17 tokens WORSE than the
 * committed receipts.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const OUT = 'bench/x97/receipts/ab.json';
const REPS = Number(process.env.X97_REPS ?? 3);
const LANES = process.argv.slice(2);

const arms = ['base', 'iso', 'meta'] as const;
const setup: Record<string, () => void> = {
  base: () => { process.env.OMEGA_NO_ISO = '1'; process.env.OMEGA_NO_METATAXIS = '1'; },
  iso: () => { delete process.env.OMEGA_NO_ISO; process.env.OMEGA_NO_METATAXIS = '1'; },
  meta: () => { process.env.OMEGA_NO_ISO = '1'; delete process.env.OMEGA_NO_METATAXIS; },
};

const rows: any[] = [];
for (const p of LANES) {
  const text = fs.readFileSync(p, 'utf8');
  const lane = p.split('/').pop()!;
  const tok: Record<string, number> = {};
  const sha: Record<string, string> = {};
  const ex: Record<string, boolean> = {};
  const ms: Record<string, number[]> = {};
  for (const a of arms) { ms[a] = []; }
  for (let rep = 0; rep < REPS; rep++) {
    for (const a of arms) {
      setup[a]();
      const t1 = Date.now();
      const r: any = tagstackEncode(text, enc);
      ms[a].push(Date.now() - t1);
      tok[a] = r.messageTokens; ex[a] = r.decoded === text;
      sha[a] = createHash('sha256').update(r.message, 'utf8').digest('hex').slice(0, 16);
    }
  }
  const med = (a: string): number => { const v = [...ms[a]].sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
  rows.push({ lane, path: p, rawChars: text.length,
    base: tok.base, iso: tok.iso, meta: tok.meta,
    dIso: tok.iso - tok.base, dMeta: tok.meta - tok.base,
    exactBase: ex.base, exactIso: ex.iso, exactMeta: ex.meta,
    shaBase: sha.base, shaIso: sha.iso, shaMeta: sha.meta,
    msBase: med('base'), msIso: med('iso'), msMeta: med('meta') });
  const r = rows[rows.length - 1];
  console.log(`${lane.padEnd(22)} base=${String(r.base).padStart(5)} iso=${String(r.iso).padStart(5)}(${String(r.dIso).padStart(3)}) ` +
    `meta=${String(r.meta).padStart(5)}(${String(r.dMeta).padStart(3)}) exact=${r.exactBase}/${r.exactIso}/${r.exactMeta} ` +
    `ms ${r.msBase}/${r.msIso}/${r.msMeta} shaBvsM=${r.shaBase === r.shaMeta ? 'SAME' : 'DIFF'}`);
  fs.mkdirSync('bench/x97/receipts', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    note: 'X97 interleaved single-process A/B; OMEGA_DET=1 OMEGA_NO_MEMO=1; 3 arms x ' + REPS + ' reps, median ms',
    arms: { base: 'neither post-pass', iso: 'ISOMORPHIA only (adjacent swap + relabel, 400 probes)', meta: 'METATAXIS only (arbitrary-rank relocation)' },
    rows,
    totals: { base: rows.reduce((a, b) => a + b.base, 0), iso: rows.reduce((a, b) => a + b.iso, 0), meta: rows.reduce((a, b) => a + b.meta, 0),
      msBase: rows.reduce((a, b) => a + b.msBase, 0), msIso: rows.reduce((a, b) => a + b.msIso, 0), msMeta: rows.reduce((a, b) => a + b.msMeta, 0) },
  }, null, 1) + '\n');
}
const T = (k: string): number => rows.reduce((a, b) => a + (b as any)[k], 0);
console.log(`\n=== X97 INTERLEAVED A/B (${LANES.length} lanes, ${REPS} reps/arm, median ms) ===`);
console.log(`tokens  base ${T('base')}  iso ${T('iso')} (${T('dIso')})  meta ${T('meta')} (${T('dMeta')})`);
console.log(`ms      base ${T('msBase')}  iso ${T('msIso')} (${(100 * (T('msIso') - T('msBase')) / T('msBase')).toFixed(1)}%)  meta ${T('msMeta')} (${(100 * (T('msMeta') - T('msBase')) / T('msBase')).toFixed(1)}%)`);
console.log(`exact   ${rows.filter((r) => r.exactBase).length}/${rows.filter((r) => r.exactIso).length}/${rows.filter((r) => r.exactMeta).length} of ${LANES.length}`);
console.log(`meta beats iso on ${rows.filter((r) => r.meta < r.iso).length} of ${LANES.length} lanes; iso beats meta on ${rows.filter((r) => r.iso < r.meta).length}`);
console.log(`\nwrote ${OUT}`);
