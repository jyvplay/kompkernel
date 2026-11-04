/** path-prefix entailment over TAB or run-of-spaces cells that look like paths */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n').filter(l => l && !l.startsWith('#'));
  let saved = 0, n = 0, tot = 0;
  let prev = '';
  for (const l of lines) {
    // last token that contains a '/' or '.' and no spaces
    const m = /\t(\S+)$|  +(\S+)$/.exec(l);
    const cell = m ? (m[1] ?? m[2]) : null;
    if (!cell) continue;
    tot++;
    let k = 0;
    while (k < cell.length && k < prev.length && cell[k] === prev[k]) k++;
    if (k >= 5) { saved += k; n++; }
    prev = cell;
  }
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(5)} cells ${tot} prefix-entailed ${n} chars ${saved} (~${(saved/3.2).toFixed(0)} tok)`);
}
