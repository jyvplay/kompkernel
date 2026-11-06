/**
 * X77 / speed3 — end-to-end A/B of the direct-index chunk LUT.
 * Same lanes, same flags, back-to-back: OMEGA_NO_LUT=1 arm then default arm, then
 * default arm again to show ordering drift. Reports wall ms per lane.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const ENC: any = 'o200k_base';
const files = process.argv.slice(2);
const rows: any[] = [];
const ON = process.env.OMEGA_NO_LUT !== '1';
for (const p of files) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = process.hrtime.bigint();
  const res: any = tagstackEncode(text, ENC);
  const t1 = process.hrtime.bigint();
  rows.push({ path: p, ms: Math.round(Number(t1 - t0) / 1e6), tokens: res.messageTokens, exact: res.exact === true });
  console.log(`${ON ? 'LUT-ON ' : 'LUT-OFF'} ${p.split('/').pop()!.padEnd(22)} ${String(rows.at(-1).ms).padStart(7)} ms  ${String(rows.at(-1)!.tokens).padStart(5)} tok  exact=${res.exact}`);
}
fs.writeFileSync(`bench/x77/receipts/speed-ab-${ON ? 'on' : 'off'}.json`, JSON.stringify(rows, null, 2));
