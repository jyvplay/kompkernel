import * as fs from 'node:fs';
import { probolePlan } from '../../src/lib/omega/probole';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const s = Date.now();
  let plan = null as any;
  try { plan = probolePlan(t, enc); } catch (e: any) { console.log(`${p}: THREW ${e.message}`); continue; }
  console.log(JSON.stringify({ p, chars: t.length, raw: countTokens(t, enc),
    plan: plan ? { runs: plan.runs.map((r: any) => [r.id, r.count, r.templateChars]), indent: JSON.stringify(plan.indent), depth: plan.childDepth,
      probeTokens: countTokens(plan.transformed, enc), contractTokens: countTokens(plan.transformed.split('\n')[0], enc), gain: plan.proxyGain } : null,
    ms: Date.now() - s }));
}
