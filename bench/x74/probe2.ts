/** X74 probe: where do prose tokens actually go? */
import * as fs from 'node:fs';
import { countTokens as T, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const toks = tokenStrings(t, enc).map(x => x.s);
  const nl = toks.filter(s => s === '\n').length;
  const nlAny = toks.filter(s => s.includes('\n')).length;
  const words = t.split(/\s+/).filter(Boolean);
  const uniq = new Set(words);
  const longUniq = [...uniq].filter(w => T(w, enc) >= 2);
  // join paragraphs: replace interior newline with space, keep blank lines
  const joined = t.split(/\n{2,}/).map(par => par.replace(/\n/g, ' ')).join('\n\n');
  console.log(`${p.split('/').pop().padEnd(22)} raw ${String(T(t,enc)).padStart(4)} | \n-alone ${String(nl).padStart(3)} \n-in-tok ${String(nlAny).padStart(3)} | words ${String(words.length).padStart(4)} uniq ${String(uniq.size).padStart(4)} longUniq ${String(longUniq.length).padStart(4)} | dewrap ${String(T(joined,enc)).padStart(4)} (${T(joined,enc)-T(t,enc)})`);
}
