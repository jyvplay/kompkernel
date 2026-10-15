// z50 harness: SYNARTESIS vs PARADEIGMA vs DAEDALUS on real files (OMEGA_DET=1, o200k, one-chat M = contract + wire).
// usage: bench/tmp/run.sh bench/z50/bench-syn.ts file[:lines] ...   (each row round-trip checked)
import fs from 'node:fs';
import { synartesisEncode, synDecode } from '@/lib/omega/synartesis';
import { paradeigmaEncode } from '@/lib/omega/paradeigma';
import { daedalusEncode } from '@/lib/omega/daedalus';
const enc = 'o200k_base' as const;
for (const arg of process.argv.slice(2)) {
  const [f, nStr] = arg.split(/:(?=\d+$)/);
  let text = fs.readFileSync(f, 'utf8');
  if (nStr) text = text.split('\n').slice(0, Number(nStr)).join('\n') + '\n';
  const t0 = Date.now();
  const dae = daedalusEncode(text, enc, {});
  const par = paradeigmaEncode(text, enc, {});
  const syn = synartesisEncode(text, enc, {});
  const decoded = synDecode(syn.wire);
  const row = {
    file: arg, raw: dae.inTokens, DAEDALUS: dae.messageTokens, PARADEIGMA: par.messageTokens, SYNARTESIS: syn.messageTokens,
    dSYN_vs_PAR: syn.messageTokens - par.messageTokens, dSYN_vs_DAE: syn.messageTokens - dae.messageTokens,
    pctSYN_vs_DAE: +(100 * (syn.messageTokens - dae.messageTokens) / dae.messageTokens).toFixed(2),
    elided: syn.elidedResolved, reducedArm: syn.reducedArm, exact_syn: decoded === text && syn.exact,
    exact_dae: dae.exact, exact_par: par.exact, ms: Date.now() - t0,
  };
  console.log(JSON.stringify(row));
}
