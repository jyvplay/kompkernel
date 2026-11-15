/** X120: which composition of the local (X119) and global (X120) passes pays? */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { diglossiaEncode } from '../../src/lib/omega/diglossia';
import { veltistosEncode } from '../../src/lib/omega/veltistos';
const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const inc = (m: string) => ({ message: m, messageTokens: T(m), decoded: '' });
const rows: any[] = [];
for (const line of fs.readFileSync('bench/x119/receipts/frontier.jsonl', 'utf8').trim().split('\n')) {
  const r = JSON.parse(line); const m: string = r.message;
  const w = m.indexOf(CHIRON_START);
  const ref = w >= 0 ? chironDecode(m.slice(w)) : null;
  const ok = (x: string) => { if (ref === null) return true; const k = x.indexOf(CHIRON_START); if (k < 0) return false; try { return chironDecode(x.slice(k)) === ref; } catch { return false; } };
  const t0 = performance.now(); const d = diglossiaEncode('', enc, inc(m)); const dMs = performance.now() - t0;
  const t1 = performance.now(); const v = veltistosEncode('', enc, inc(m)); const vMs = performance.now() - t1;
  const t2 = performance.now(); const vd = diglossiaEncode('', enc, inc(v.message)); const vdMs = performance.now() - t2;
  const t3 = performance.now(); const dv = veltistosEncode('', enc, inc(d.message)); const dvMs = performance.now() - t3;
  const row = { path: r.path, base: T(m), d: T(d.message), v: T(v.message), vd: T(vd.message), dv: T(dv.message),
    dMs: Math.round(dMs), vMs: Math.round(vMs), vdMs: Math.round(vdMs), dvMs: Math.round(dvMs),
    exact: ok(d.message) && ok(v.message) && ok(vd.message) && ok(dv.message) };
  rows.push(row);
  console.log(`${r.path.split('/').pop()!.padEnd(22)} base=${row.base} D=${row.d} V=${row.v} V→D=${row.vd} D→V=${row.dv} exact=${row.exact} ms D=${row.dMs} V=${row.vMs} VD=${row.vdMs}`);
}
const sum = (k: string) => rows.reduce((a, r) => a + (r as any)[k], 0);
const totals = { base: sum('base'), d: sum('d'), v: sum('v'), vd: sum('vd'), dv: sum('dv'),
  dMs: sum('dMs'), vMs: sum('vMs'), vdMs: sum('vdMs'), dvMs: sum('dvMs'), inexact: rows.filter(r => !r.exact).length };
console.log('TOTALS', JSON.stringify(totals));
fs.writeFileSync('bench/x120/receipts/screen-order.json', JSON.stringify({ schema: 'kompkernel-x120-order-v1', totals, rows }, null, 2) + '\n');
