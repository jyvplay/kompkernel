/**
 * Where is the headroom? W = tokens of the source with every whitespace run
 * collapsed to one space: the lexical content only, all layout discarded.
 * No exact in-band codec can beat the word stream by more than its own
 * derivable structure, so frontier/W is a decent headroom ratio.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const W = T(text.replace(/\s+/g, ' ').trim());
  rows.push({ p, raw: T(text), W });
  console.error(`${p}\t${T(text)}\t${W}`);
}
