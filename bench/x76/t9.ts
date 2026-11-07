/**
 * X76 / t9 — PLATOS on the lanes, against the X74 chain, in one process.
 * Reports: did the detector fire, did restore reproduce the source, did it win.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { platosEncode, platosDetect } from '../../src/lib/omega/platos';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const base: any = tagstackEncode(t, enc);
  const det = platosDetect(t.split('\n'));
  let r: any;
  try { r = platosEncode(t, enc, tagstackEncode as any); } catch (e) { r = { applied: false, notes: 'THREW ' + (e as Error).message, messageTokens: base.messageTokens, frontierTokens: base.messageTokens, exact: false, columns: 0, removed: 0, declarationTokens: 0 }; }
  rows.push({ path: p, x74: base.messageTokens, out: r.applied ? r.messageTokens : base.messageTokens,
    applied: r.applied, exact: r.decoded === t, cols: r.columns ?? 0, removed: r.removed ?? 0,
    decl: r.declarationTokens ?? 0, detected: det ? det.length : 0, notes: r.notes });
  console.log(`${p.split('/').pop()!.padEnd(22)} x74 ${String(base.messageTokens).padStart(5)} -> ${String(rows[rows.length - 1].out).padStart(5)} (${rows[rows.length - 1].out - base.messageTokens >= 0 ? '+' : ''}${rows[rows.length - 1].out - base.messageTokens}) applied ${String(r.applied).padEnd(5)} exact ${String(rows[rows.length - 1].exact).padEnd(5)} cols ${String(rows[rows.length - 1].detected).padStart(2)} removed ${String(rows[rows.length - 1].removed).padStart(4)} decl ${String(rows[rows.length - 1].decl).padStart(3)} :: ${String(r.notes).slice(0, 70)}`);
  fs.writeFileSync('bench/x76/receipts/platos-probe.json', JSON.stringify(rows, null, 1) + '\n');
}
const c = rows.reduce((a, b) => a + b.x74, 0), o = rows.reduce((a, b) => a + b.out, 0);
console.log(`\nTOTAL x74 ${c} -> platos ${o}  DELTA ${o - c}  applied ${rows.filter((r) => r.applied).length}/${rows.length} exact ${rows.filter((r) => r.exact).length}/${rows.length}`);
