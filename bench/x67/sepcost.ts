import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows = JSON.parse(fs.readFileSync('bench/x67/fixtures/gh-labels-50.json', 'utf8'));
const vals: string[] = [];
for (const r of rows) for (const k of Object.keys(r)) vals.push(JSON.stringify(r[k]));
for (const sep of ['\n', ' ', ',', '\t', '\u0001']) {
  const s = vals.join(sep);
  console.log(JSON.stringify(sep), 'tokens=', countTokens(s, enc), 'per-value=', (countTokens(s, enc) / vals.length).toFixed(3));
}
console.log('values', vals.length, 'sum tokens individually', vals.reduce((a, v) => a + countTokens(v, enc), 0));
