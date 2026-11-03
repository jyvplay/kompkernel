import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  // collapse every run of 2+ spaces to one space
  const collapsed = lines.map(l => l.replace(/ {2,}/g, ' ')).join('\n');
  const trimmed = lines.map(l => l.split(/ {2,}/).map(x => x.trim()).join(' ')).join('\n');
  console.log(`${p}: raw ${countTokens(t, enc)}  collapse-runs ${countTokens(collapsed, enc)}  field-trim ${countTokens(trimmed, enc)}  spaces=${t.split('').filter(c => c === ' ').length}`);
}
