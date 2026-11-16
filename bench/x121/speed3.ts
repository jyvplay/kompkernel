/**
 * X121 — three-way whole-lane timing harness.
 *
 *   bash bench/x15/run.sh bench/x121/speed3.ts [laneFile] [reps]
 *
 * Prints, per lane, the minimum and median wall time of `tagstackEncode` over
 * `reps` repetitions inside ONE process, plus the ΠΡΟΛΗΨΙΣ counters. Minimum is
 * reported because the box is shared: the fastest rep is the one least
 * contaminated by other tenants, and medians on a 2-vCPU shared host move by
 * tens of percent between runs (see bench/x121/research/protocol.md).
 *
 * The same script is copied byte-for-byte into a pristine `git archive HEAD`
 * checkout so that the three arms differ only in `src/lib/omega`:
 *   arm A  pristine HEAD              (X120 as merged)
 *   arm B  HEAD + refactor, ΠΡΟΛΗΨΙΣ off
 *   arm C  HEAD + refactor, ΠΡΟΛΗΨΙΣ on
 * B − A isolates the cost of the refactor; C − B isolates the mechanism.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { prolepsisStats, prolepsisDisabled } from '../../src/lib/omega/prolepsis';

const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0',
  OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1',
  OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1', OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' };
Object.assign(process.env, env);

const enc = 'o200k_base' as const;
const laneFile = process.argv[2] ?? 'bench/x121/lanes-speed.txt';
const reps = Number(process.argv[3] ?? '3');
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);

console.log(`ΠΡΟΛΗΨΙΣ ${prolepsisDisabled() ? 'OFF' : 'ON'}  reps=${reps}  node=${process.version}`);
let totalMin = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const times: number[] = [];
  const cpus: number[] = [];
  let tokens = 0;
  for (let r = 0; r < reps; r++) {
    tagstackMemoClear();
    synedriaReset();
    const t = performance.now(), c = process.cpuUsage();
    const out = tagstackEncode(text, enc);
    const d = process.cpuUsage(c);
    times.push(performance.now() - t);
    cpus.push((d.user + d.system) / 1000);
    tokens = countTokens(out.message, enc);
  }
  const srt = (a: number[]) => a.slice().sort((x, y) => x - y);
  const st = srt(times), sc = srt(cpus);
  const min = st[0]!, med = st[Math.floor(st.length / 2)]!;
  const cmin = sc[0]!, cmed = sc[Math.floor(sc.length / 2)]!;
  totalMin += min;
  console.log(`${p.padEnd(40)} tok=${String(tokens).padStart(5)} min=${min.toFixed(0).padStart(7)}ms med=${med.toFixed(0).padStart(7)}ms cpuMin=${cmin.toFixed(0).padStart(7)} cpuMed=${cmed.toFixed(0).padStart(7)}  reps=[${times.map((t) => t.toFixed(0)).join(', ')}]`);
}
console.log(`TOTAL min ${totalMin.toFixed(0)}ms`);
console.log('prolepsis ' + JSON.stringify(prolepsisStats()));
