/**
 * X97 — ΜΕΤΑΤΑΞΙΣ SMOKE TEST on the ten authoritative wires.  Must reproduce the −62 that
 * bench/x97/receipts/moves.json measured with the standalone probe, or the codec is not the
 * mechanism that was measured.  Zero frontier calls: the incumbent is the committed wire.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { metataxisEncode, metataxisDisabled } from '../../src/lib/omega/metataxis';

const enc: any = 'o200k_base';
delete process.env.OMEGA_NO_METATAXIS;
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
let g0 = 0, g1 = 0;
const rows: any[] = [];
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const t0 = countTokens(msg, enc);
  const t = Date.now();
  const r = metataxisEncode(fs.readFileSync(srcPath(lane), 'utf8'), enc, { message: msg, messageTokens: t0, decoded: '' });
  const ms = Date.now() - t;
  g0 += t0; g1 += r.messageTokens;
  rows.push({ lane, T0: t0, out: r.messageTokens, delta: r.messageTokens - t0, applied: r.applied, ms, notes: r.notes });
  console.log(`${lane.padEnd(18)} T0=${String(t0).padStart(5)} -> ${String(r.messageTokens).padStart(5)} (${String(r.messageTokens - t0).padStart(3)}) applied=${r.applied} ${String(ms).padStart(6)}ms  ${r.notes}`);
}
function srcPath(lane: string): string {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40']) {
    for (const e of ['.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync('bench/x97/receipts/meta10.json', JSON.stringify({ note: 'X97 METATAXIS smoke test on the ten authoritative wires; incumbent = committed wire; zero frontier calls', rows, totals: { T0: g0, out: g1, delta: g1 - g0 } }, null, 1) + '\n');
console.log(`\nTOTAL T0=${g0} -> ${g1}  delta=${g1 - g0}   (moves.ts standalone probe measured -62)`);
