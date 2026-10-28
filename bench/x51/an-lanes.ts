import fs from 'node:fs';
import { anagennesisEncode } from '../../src/lib/omega/anagennesis';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const lanes = process.argv.slice(2);
let out = '';
for (const f of lanes) {
  if (!fs.existsSync(f)) { out += f + ' MISSING\n'; continue; }
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = anagennesisEncode(text, enc);
  out += `${f.padEnd(46)} raw ${String(r.inTokens).padStart(6)} M ${String(r.messageTokens).padStart(6)} (frontier ${r.frontierM}) exact ${r.exact} ms ${Date.now() - t0} | ${r.notes}\n`;
  fs.writeFileSync('/tmp/an-lanes.txt', out);
}
