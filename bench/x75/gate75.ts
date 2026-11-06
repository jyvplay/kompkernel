/**
 * X75 TREATMENT GATE — the X74 chain WITH BRACHYLOGIA, against the X74 chain WITHOUT,
 * on the same 29 lanes in one process under OMEGA_DET=1.
 *
 * Both arms are computed per lane in the same process so the wall-clock-budgeted parent
 * search sees the same conditions; the only difference between the arms is the codec.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { brachylogiaEncode } from '../../src/lib/omega/brachylogia';
const enc: any = 'o200k_base';
const mode = typeof process !== 'undefined' && process.env?.OMEGA_DET === '1' ? 'det' : 'wall';
const rows: any[] = [];
const t00 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const base: any = tagstackEncode(text, enc);
  const r = brachylogiaEncode(text, enc, tagstackEncode as any);
  const applied = r.applied;
  const tokens = applied ? r.messageTokens : base.messageTokens;
  rows.push({
    path: p, raw: countTokens(text, enc),
    x74: base.messageTokens, out: tokens, delta: tokens - base.messageTokens,
    applied, clauses: r.clausesRewritten,
    contractBefore: r.contractBefore, contractAfter: r.contractAfter,
    exact: (applied ? r.decoded : base.decoded) === text,
    arm: base.arm, ms: Date.now() - t0,
  });
  fs.writeFileSync(`bench/x75/receipts/gate75-${mode}.json`, JSON.stringify({
    mode, encoding: enc, rows,
    controlTotal: rows.reduce((a, b) => a + b.x74, 0),
    treatmentTotal: rows.reduce((a, b) => a + b.out, 0),
    appliedLanes: rows.filter((r) => r.applied).length,
    exactLanes: rows.filter((r) => r.exact).length, totalMs: Date.now() - t00,
  }, null, 1) + '\n');
  console.error(`  ${p.split('/').pop()!.padEnd(22)} x74 ${String(base.messageTokens).padStart(5)} -> ${String(tokens).padStart(5)} (${tokens - base.messageTokens}) applied ${applied} exact ${rows[rows.length - 1].exact}`);
}
const c = rows.reduce((a, b) => a + b.x74, 0), t = rows.reduce((a, b) => a + b.out, 0);
console.error(`GATE75 ${mode} lanes ${rows.length} X74 ${c} -> X75 ${t} delta ${t - c} applied ${rows.filter((r) => r.applied).length} exact ${rows.filter((r) => r.exact).length}/${rows.length} ms ${Date.now() - t00}`);
