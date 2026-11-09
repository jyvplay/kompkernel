/** X86 verify — the ΚΕΝΟΝ gate, measured end to end.
 *
 *  Every number below comes from `kenonEncode`, which pays for BOTH frontier
 *  encodes (identity and contract+wire) and checks the two-stage round trip before
 *  it will report a win. Nothing is estimated, and a lane that loses is printed as
 *  a loss with its real token counts.
 *
 *  Usage: node bench/x86/verify.mjs <lane> [<lane> ...]
 */
import * as fs from 'node:fs';
import { kenonEncode } from '../../src/lib/omega/kenon';

const lanes = process.argv.slice(2);
fs.mkdirSync('bench/x86/receipts', { recursive: true });
const rows: any[] = [];
console.log('lane'.padEnd(26) + 'F(src)'.padStart(7) + 'F(clause+wire)'.padStart(15) + 'delta'.padStart(7) +
  '  cols rows lit  clause wire  applied  secs  notes');
for (const p of lanes) {
  let S: string;
  try { S = fs.readFileSync(p, 'utf8'); } catch { console.log(p + ' MISSING'); continue; }
  const t0 = Date.now();
  const r = kenonEncode(S, 'o200k_base');
  const secs = (Date.now() - t0) / 1000;
  rows.push({ path: p, lane: p.split('/').pop(), bytes: S.length, ...r, secs });
  console.log(
    p.split('/').pop()!.padEnd(26) + String(r.frontierTokens).padStart(7) + String(r.messageTokens).padStart(15) +
    String(r.delta ?? 0).padStart(7) +
    `  ${String(r.cols ?? '-').padStart(4)} ${String(r.rows ?? '-').padStart(4)} ${String(r.literals ?? '-').padStart(3)}` +
    `  ${String(r.clauseTokens ?? '-').padStart(6)} ${String(r.wireTokens ?? '-').padStart(4)}` +
    `  ${r.applied ? 'YES' : 'no '}  ${secs.toFixed(1).padStart(6)}  ${r.notes}`,
  );
  fs.writeFileSync('bench/x86/receipts/kenon.json', JSON.stringify({
    generated: new Date().toISOString(), det: process.env.OMEGA_DET ?? null, rows,
  }, null, 1) + '\n');
}
const wins = rows.filter((r) => r.applied);
console.log(`\nlanes=${rows.length} wins=${wins.length} totalDelta=${wins.reduce((s, r) => s + r.delta, 0)}`);
for (const r of wins) console.log(`  WIN ${r.lane.padEnd(26)} ${r.frontierTokens} -> ${r.messageTokens} (${r.delta})`);
for (const r of rows.filter((x) => !x.applied)) console.log(`  --- ${r.lane.padEnd(26)} ${r.frontierTokens} vs ${r.messageTokens}  ${r.notes}`);
