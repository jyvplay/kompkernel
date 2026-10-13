// Z36 probe: canonical-JSON whitespace removal. If text === JSON.stringify(JSON.parse(text), null, 2) (+ optional final \n),
// encode the minified form and record the indent rule; decoder re-pretty-prints. Measures VXR tokens on minified vs pretty.
import fs from 'node:fs';
import { veritasREncode } from '@/lib/omega/veritas-r';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  let obj: any; try { obj = JSON.parse(text); } catch { console.log(JSON.stringify({ f, parse: false })); continue; }
  const pretty2 = JSON.stringify(obj, null, 2);
  const canon = text === pretty2 || text === pretty2 + '\n';
  const mini = JSON.stringify(obj);
  const pr = veritasREncode(text);
  const mr = veritasREncode(mini);
  console.log(JSON.stringify({ f: f.split('/').slice(-1)[0], canon2: canon, pretty_vxr: pr.outTokens, mini_vxr: mr.outTokens, mini_exact: mr.exact, pct: +(100 * (mr.outTokens - pr.outTokens) / pr.outTokens).toFixed(2), in_pretty: pr.inTokens, in_mini: countTokens(mini, 'o200k_base') }));
}
