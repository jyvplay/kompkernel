import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const paths = process.argv.slice(2);
for (const path of paths) {
  const text = fs.readFileSync(path, 'utf8');
  const normalized = text.replace(/\r\n/g, '\n');
  console.log(JSON.stringify({ path, chars: text.length, crlf: (text.match(/\r\n/g) ?? []).length,
    sourceTokens: countTokens(text, 'o200k_base'), normalizedTokens: countTokens(normalized, 'o200k_base'),
    delta: countTokens(text, 'o200k_base') - countTokens(normalized, 'o200k_base'),
    exactRestore: normalized.replace(/\n/g, '\r\n') === text }));
}
