import * as fs from 'node:fs';
import { taxisPlan, taxisRestore } from '../../src/lib/omega/taxis';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, 'utf8');
  const p = taxisPlan(s, ENC);
  if (!p) { console.log(f, 'NO PLAN'); continue; }
  const ok = taxisRestore(p.reducedText, p.spec) === s;
  console.log(f, `rows=${p.rows} cols=${p.cols} restore=${ok} raw=${countTokens(s, ENC)} redRaw=${countTokens(p.reducedText, ENC)} contract=${countTokens(p.contract, ENC)}`);
  console.log('  rules:', JSON.stringify(p.spec.rules));
  console.log('  contract:', p.contract);
}
