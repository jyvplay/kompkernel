/** path-prefix entailment: cell shares a prefix with the PREVIOUS cell of the same column */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  // candidate cells: last whitespace-separated field per line
  const cells = lines.map(l => { const m = /^(\S+) +(\S+)$/.exec(l); return m ? [m[1], m[2]] : null; });
  if (cells.every(c => c)) {
    const col = cells.map(c => c![1]);
    let saved = 0, n = 0;
    for (let i = 1; i < col.length; i++) {
      let k = 0;
      while (k < col[i].length && k < col[i-1].length && col[i][k] === col[i-1][k]) k++;
      if (k >= 4) { saved += k; n++; }
    }
    console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(5)} prefix-entailed ${n}/${col.length} lines, ${saved} chars (~${(saved/3.2).toFixed(0)} tok)`);
  } else console.log(`${p.split('/').pop()} not 2-field`);
}
