import fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as any;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const toks = tokenStrings(t, enc);
  const h = new Map<string, number>();
  let punct = 0;
  for (const { s } of toks) {
    if (/\p{L}|\p{N}/u.test(s)) continue;
    if (/^\s+$/.test(s)) continue;
    punct++;
    h.set(s, (h.get(s) || 0) + 1);
  }
  const top = [...h.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);
  console.log(`\n${f}  total=${toks.length} punct=${punct}`);
  console.log(top.map(([k, v]) => `${JSON.stringify(k)}:${v}`).join(' '));
}
