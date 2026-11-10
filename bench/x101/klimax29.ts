/**
 * X101 — ΚΛΙΜΑΞ on all 29 frontier lanes.  Same question as klimax.ts, wider net: which of ΧΕΙΡΟΝ's
 * sweep variants wins, how long each lane takes, and how much of the shared WORK budget
 * (CHIRON_MAX_TOTAL_WORK_UNITS) is consumed.  A variant that never wins anywhere is dead budget.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const wins = new Map<string, number>();
const rows: any[] = [];
let gMs = 0, gBudget = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const t = Date.now();
  const R: any = chironEncode(text, enc);
  const ms = Date.now() - t;
  const m = /variant=([^;]*)/.exec(String(R.notes));
  const tag = m ? m[1] : '(identity)';
  wins.set(tag, (wins.get(tag) ?? 0) + 1);
  const b = /charged=(\d+)\/(\d+)/.exec(String(R.notes));
  const used = b ? Number(b[1]) : 0, cap = b ? Number(b[2]) : 0;
  gMs += ms; gBudget += used;
  rows.push({ lane: r.lane, path: r.path, bytes: Buffer.byteLength(text), tokens: R.messageTokens, ms, variant: tag, workUsed: used, workCap: cap });
  console.log(`${r.lane.padEnd(22)} bytes=${String(Buffer.byteLength(text)).padStart(6)} tok=${String(R.messageTokens).padStart(5)} ${String(ms).padStart(6)}ms  WINNER=${tag.padEnd(12)} work=${String(used).padStart(9)}/${cap} (${(100 * used / cap).toFixed(0)}%)`);
}
fs.writeFileSync('bench/x101/receipts/klimax29.json', JSON.stringify({ rows, wins: [...wins.entries()], totals: { ms: gMs, workUsed: gBudget } }, null, 1));
console.log(`\nKLIMAX29 variant winners: ${JSON.stringify([...wins.entries()])}`);
console.log(`total ΧΕΙΡΟΝ wall clock over the 29 lanes: ${gMs} ms; total work charged ${gBudget}`);
