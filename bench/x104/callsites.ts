/**
 * X104 — DYNAMIC CENSUS OF GLOBAL-CLOCK CALL SITES ON ONE ENCODE.
 * Patches Date.now/performance.now to record the calling line, runs one encode
 * with the clocks running fast (so every wall-clock gate is blown), and prints
 * each site with the number of times it was hit. A site hit inside a gate is a
 * live gate; a site hit only to fill an `ms:` report field is not.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';

const hits = new Map<string, number>();
const realDateNow = Date.now.bind(Date);
const realPerfNow = typeof performance !== 'undefined' ? performance.now.bind(performance) : () => 0;
let t = 0;
const rec = (kind: string) => {
  t += 1000;
  const st = new Error().stack ?? '';
  // frame 0 = rec, 1 = the patched now(), 2 = the real caller
  const lines = st.split('\n');
  const caller = lines[3] ?? lines[2] ?? '?';
  const m = caller.match(/\(?([^()]*?):(\d+):(\d+)\)?$/) ?? caller.match(/([^()]*?):(\d+):(\d+)/);
  const key = m ? `${m[1].replace(/^.*\/src\//, 'src/')}:${m[2]}` : caller.slice(-90);
  hits.set(`${kind} ${key}`, (hits.get(`${kind} ${key}`) ?? 0) + 1);
};
(Date as any).now = () => rec('Date.now');
if (typeof performance !== 'undefined') (performance as any).now = () => rec('perf.now');

const lane = process.argv[2];
const text = fs.readFileSync(lane, 'utf8');
const R: any = tagstackEncode(text, 'o200k_base' as any);
(Date as any).now = realDateNow;
if (typeof performance !== 'undefined') (performance as any).now = realPerfNow;

console.log(`lane=${lane.split('/').pop()} tokens=${R.messageTokens} bytes=${R.wire.length}`);
const rows = [...hits.entries()].sort((a, b) => b[1] - a[1]);
console.log(`distinct call sites: ${rows.length}, total calls: ${rows.reduce((n, r) => n + r[1], 0)}`);
for (const [k, n] of rows) console.log(`  ${String(n).padStart(7)}  ${k}`);
