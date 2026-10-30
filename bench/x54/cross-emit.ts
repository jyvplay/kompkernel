// X54: emit (contract, reduced, orig) for ATHROISMOS plan lanes.
import * as fs from 'node:fs';
import { athroismosPlan } from '../../src/lib/omega/athroismos';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x54/tmp-cross', { recursive: true });
for (const [name, path] of [
  ['statement_A', 'bench/x54/fixtures/statement_A.csv'],
  ['mai', 'bench/x54/fixtures/mai-excerpt.csv'],
] as const) {
  const text = fs.readFileSync(path, 'utf8');
  const p = athroismosPlan(text, ENC);
  if (!p) { console.log(name, 'NO PLAN'); continue; }
  fs.writeFileSync(`bench/x54/tmp-cross/${name}.contract`, p.contract + '\n');
  fs.writeFileSync(`bench/x54/tmp-cross/${name}.reduced`, p.reducedText);
  fs.writeFileSync(`bench/x54/tmp-cross/${name}.orig`, text);
  console.log(name, 'emitted');
}
