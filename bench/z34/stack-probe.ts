// Z34: does VXS find gains on the DAEDALUS wire once the baseline gate is fixed? Measures the search before the final gate.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { searchS, wireS } from '@/lib/omega/veritas-s';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const d = daedalusEncode(t, enc);
  const raw = countTokens(d.wire, enc);
  const st = searchS(d.wire, enc);
  const w = countTokens(wireS(st.entries, st.body), enc);
  console.log(JSON.stringify({ file: f.split('/').pop(), daeWire: raw, vxsSearchOnDaeWire: w, entries: st.entries.length, deltaVsDaeWirePct: +((w / raw - 1) * 100).toFixed(2) }));
}
