/** Z44: why did a dialect fail its byte-exactness gate?  Show the first differing lines. */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { GRAMMA_DIALECTS } from '../../src/lib/omega/gramma';
const enc: EncodingName = 'o200k_base';
const vis = (s: string) => s.replace(/ /g, '·').replace(/\t/g, '→');
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  console.log(`\n=== ${f} tokens=${countTokens(text, enc)} lines=${text.split('\n').length}`);
  for (const d of GRAMMA_DIALECTS) {
    const cheap = d.canon(text);
    if (cheap === text) { console.log(`  ${d.id.padEnd(10)} no-op`); continue; }
    const back = d.expand(cheap);
    if (back === text) { console.log(`  ${d.id.padEnd(10)} OK  cheap=${countTokens(cheap, enc)} (${countTokens(text, enc) - countTokens(cheap, enc)} raw saved)`); continue; }
    const A = text.split('\n'), B = back.split('\n');
    const diffs: number[] = [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) diffs.push(i);
    console.log(`  ${d.id.padEnd(10)} FAIL cheap=${countTokens(cheap, enc)} difflines=${diffs.length}`);
    for (const i of diffs.slice(0, 3)) console.log(`      L${i}\n        want |${(A[i] ?? '<eof>').slice(0, 78)}\n        got  |${(B[i] ?? '<eof>').slice(0, 78)}`);
  }
}
