/** X67 probe: does ROW-major value order beat SLOT-major for the envelope? */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { probolePlan } from '../../src/lib/omega/probole';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8').replace(/\n$/, '');
  const plan = probolePlan(t + '\n', enc) ?? probolePlan(t, enc);
  if (!plan) { console.log(`${p}: no plan`); continue; }
  const head = plan.transformed.split('\n').slice(0, 3); // contract, ^S, ^O
  const tpl = /^\^T0 (.*)$/m.exec(plan.transformed)?.[1] ?? '';
  const rows: string[] = [];
  for (let r = 0; r < plan.runs[0].count; r++) for (const col of plan.runs[0].values) rows.push(col[r]);
  const rowEnv = [...head, `^T0 ${tpl}`, `^V0 ${plan.runs[0].count}`, ...rows].join('\n');
  const colEnv = [...head, `^T0 ${tpl}`, `^V0 ${plan.runs[0].count}`,
    ...plan.runs[0].values.flat()].join('\n');
  const s = Date.now();
  const a = tagstackEncode(rowEnv, enc);
  const b = tagstackEncode(colEnv, enc);
  console.log(JSON.stringify({ p, rowEnvTokens: countTokens(rowEnv, enc), rowFrontier: a.messageTokens,
    colEnvTokens: countTokens(colEnv, enc), colFrontier: b.messageTokens, contract: countTokens(head[0], enc),
    candidateRow: a.messageTokens + countTokens(head[0], enc), candidateCol: b.messageTokens + countTokens(head[0], enc),
    frontierSource: null, ms: Date.now() - s }));
}
