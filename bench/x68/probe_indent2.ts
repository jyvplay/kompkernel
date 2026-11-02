import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode } from '../../src/lib/omega/apographe';
const enc: any = 'o200k_base';
const msg = (r: any) => countTokens((r.contract ? r.contract + '\n' : '') + r.wire, enc);
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split('\n');
  const strippedText = lines.map(l => l.replace(/^[ \t]+/, '')).join('\n');
  const a0 = apographeEncode(t, enc);
  const a1 = apographeEncode(strippedText, enc);
  const m0 = msg(a0), m1 = msg(a1);
  console.log(JSON.stringify({ f, raw: countTokens(t, enc), parentOrig: m0, parentStripped: m1, delta: m0 - m1, ok: true }));
}
