// X20: one-file diagnostic: per-family net at source level, then the real M comparison.
import fs from 'node:fs';
import { ndProbe, ndForward, anadesmosEncode } from '@/lib/omega/anadesmos';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  console.log(f, 'in=' + countTokens(t, 'o200k_base'));
  console.log('  probe: ' + ndProbe(t).filter((x) => x.applies).map((x) => `${x.name} saved=${x.saved} cost=${x.cost} net=${x.net} exact=${x.exact}`).join(' | '));
  const sel = ndForward(t);
  console.log('  selected: ' + (sel ? sel.applied.join('+') + ' desc=' + sel.descTokens + '\n    ' + sel.text.slice(0, 90).replace(/\n/g, '⏎') : 'none'));
  const r = anadesmosEncode(t, 'o200k_base');
  console.log('  M: LAKONIKOS-D ' + r.baseTokens.o200k_base + ' -> ANADESMOS ' + r.messageTokens.o200k_base + '  mode=' + r.mode + ' exact=' + (r.decoded === t) + ' ms=' + r.ms);
  console.log('  ' + r.notes);
}
