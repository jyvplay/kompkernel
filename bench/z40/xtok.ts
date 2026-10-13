// Z40: cross-tokenizer check. Counts raw input and saved DAEDALUS wires under o200k_base and cl100k_base.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const pairs = process.argv.slice(2);
for (let i = 0; i < pairs.length; i += 2) {
  const src = fs.readFileSync(pairs[i], 'utf8');
  const wire = fs.readFileSync(pairs[i + 1], 'utf8');
  const r: any = {};
  for (const enc of ['o200k_base', 'cl100k_base'] as const) {
    const a = countTokens(src, enc);
    const b = countTokens(wire, enc);
    r[enc] = { raw: a, wire: b, ratio: +(b / a).toFixed(3) };
  }
  console.log(JSON.stringify({ f: pairs[i].split('/').slice(-1)[0], o200k: r.o200k_base, cl100k: r.cl100k_base }));
}
