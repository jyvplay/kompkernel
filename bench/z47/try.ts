// quick look: EPAGOGE vs ENTHYMEME vs DAEDALUS on given files (OMEGA_DET=1). SHOW=<n> prints the first n chars of the prompt.
import fs from 'node:fs';
import { epagogeEncode } from '@/lib/omega/epagoge';
import { enthymemeEncode } from '@/lib/omega/enthymeme';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  const e = epagogeEncode(text, enc);
  const t1 = Date.now();
  const n = enthymemeEncode(text, enc);
  const t2 = Date.now();
  console.log(`${f}\n  raw ${raw}  ENTHYMEME ${n.messageTokens} (applied=${n.applied} ${n.rules.join('+')}) ${t2 - t1}ms  EPAGOGE ${e.messageTokens} (applied=${e.applied} ${e.schemas.map((s, i) => `${s}[${e.params[i]}]`).join('+')} elided=${e.elided} sentence=${e.clauseTokens}) ${t1 - t0}ms  exact=${e.decoded === text}  Δ(E−N)=${e.messageTokens - n.messageTokens}`);
  if (process.env.SHOW) console.log(e.decoderPrompt.slice(0, Number(process.env.SHOW)));
}
