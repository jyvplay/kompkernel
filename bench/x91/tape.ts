// X91 tape anatomy: what exactly occupies the 607 "tape" tokens of a frontier message.
import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);
import * as fs from 'node:fs';

const file = process.argv[2];
const w = fs.readFileSync(file, 'utf8');
const lines = w.split('\n');
console.log(`file=${file} totalChars=${w.length} totalTokens=${ct(w)} lines=${lines.length}`);
let acc = 0;
lines.forEach((l, i) => {
  const t = ct(l);
  acc += t;
  console.log(`\n--- line #${i}: ${t} tok, ${l.length} ch (cumulative ${acc})`);
  console.log(JSON.stringify(l.slice(0, 420)));
});
// glyph census over the whole message: which characters are non-ascii, and how often
const census = new Map<string, number>();
for (const ch of w) if (ch.codePointAt(0)! > 127) census.set(ch, (census.get(ch) ?? 0) + 1);
const sorted = [...census.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\n=== distinct non-ascii chars: ${sorted.length}`);
console.log('top 40:', sorted.slice(0, 40).map(([c, n]) => `${JSON.stringify(c)}x${n}`).join(' '));
// the ¶ declarations
const decls = [...w.matchAll(/¶([^=\n]{1,12})=([^\n]{0,40})/g)];
console.log(`\n=== ¶ k=v declarations found: ${decls.length}`);
decls.slice(0, 25).forEach(d => console.log(`   ${JSON.stringify(d[1])} = ${JSON.stringify(d[2])}`));
