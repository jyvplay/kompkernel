/**
 * X101 — ΚΛΙΜΑΞ (klimax, "the ladder"): WHICH OF ΧΕΙΡΟΝ'S VARIANTS ACTUALLY WINS?
 *
 * ΧΕΙΡΟΝ is 70-96 % of the chain's wall clock (bench/x101/chronos.ts) and it spends that time on a
 * VARIANT SWEEP: `full/<sep>` for every candidate separator, then `macros-only`, then
 * `blocks-only/<sep>` for texts under 24 000 characters.  Each variant is a whole macro/block search
 * with its own budget, and the sweep is capped by one overall deadline that a single long variant can
 * overrun (ls-l-real is budgeted 13 677 ms and actually takes 27 619 ms).
 *
 * A speed claim has to be aimed at the bottleneck, so this probe records which variant wins on each
 * of the ten authoritative lanes.  If a variant never wins anywhere, its budget is dead weight and
 * removing it is a speedup with byte-identical output — the only kind of speedup that is Pareto
 * superior rather than a trade.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const wins = new Map<string, number>();
const rows: any[] = [];
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t = Date.now();
  const R: any = chironEncode(text, enc);
  const ms = Date.now() - t;
  const m = /variant=([^;]*)/.exec(String(R.notes));
  const tag = m ? m[1] : '(none)';
  wins.set(tag, (wins.get(tag) ?? 0) + 1);
  rows.push({ lane, bytes: Buffer.byteLength(text), tokens: R.messageTokens, ms, variant: tag, notes: String(R.notes).slice(0, 260) });
  console.log(`${lane.padEnd(18)} bytes=${String(Buffer.byteLength(text)).padStart(6)} tok=${String(R.messageTokens).padStart(5)} ${String(ms).padStart(7)}ms  WINNER=${tag}`);
  console.log(`    ${String(R.notes).slice(0, 230)}`);
}
fs.writeFileSync('bench/x101/receipts/klimax.json', JSON.stringify({ rows, wins: [...wins.entries()] }, null, 1));
console.log(`\nKLIMAX variant winners over the ten lanes: ${JSON.stringify([...wins.entries()])}`);
