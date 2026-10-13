// Z34: stack VERITAS-S on top of the DAEDALUS wire (composition, not a new reader).
// composed message = DAEDALUS contract + outTokens(VXS(daeWire)). Exactness: VXS decode -> DAE decode == input.
import fs from 'node:fs';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { veritasSEncode, veritasSDecode } from '@/lib/omega/veritas-s';
import { countTokens } from '@/lib/omega/bpe';
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const d = daedalusEncode(t, 'o200k_base');
  const s = veritasSEncode(d.wire);
  const back = daedalusDecode(veritasSDecode(s.wire));
  const exact = back === t;
  const composed = d.contractTokens + s.outTokens;
  console.log(JSON.stringify({ file: f, dae: d.messageTokens, daeWire: countTokens(d.wire, 'o200k_base'), vxsOnDae: s.outTokens, composed, delta: +((composed / d.messageTokens - 1) * 100).toFixed(2), exact, daeExact: d.exact, entries: s.entries }));
}
