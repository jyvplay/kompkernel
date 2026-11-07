/** X81 — does the space-before-digit asymmetry exist in the FRONTIER OUTPUT (post-frontier)? */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(S, enc);
  const W = r.message;
  const spaced = new Map<string, number>(), tight = new Map<string, number>();
  for (const m of W.matchAll(/(\S) (?=\p{N})/gu)) { const c = m[1]; if (!/\p{N}/u.test(c)) spaced.set(c, (spaced.get(c) ?? 0) + 1); }
  for (const m of W.matchAll(/(\S)(?=\p{N})/gu)) { const c = m[1]; if (!/\p{N}/u.test(c) && W[m.index! + 1] !== ' ') tight.set(c, (tight.get(c) ?? 0) + 1); }
  const usable = [...spaced.keys()].filter((c) => (tight.get(c) ?? 0) === 0);
  const sites = usable.reduce((a, c) => a + (spaced.get(c) ?? 0), 0);
  const set = new Set(usable);
  const T = W.replace(/(\S) (?=\p{N})/gu, (w, c: string) => (set.has(c) ? c : w));
  const ct = `§SYNALOEPHE put a space between [${usable.join('')}] and a following digit`;
  const gain = sites > 0 ? countTokens(W, enc) - countTokens(ct + '\n' + T, enc) : 0;
  rows.push({ lane: p.split('/').pop(), F: r.messageTokens, sites, gain });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(r.messageTokens).padStart(5)} | sites ${String(sites).padStart(4)} | net gain ${gain >= 0 ? '+' : ''}${gain}`);
}
fs.writeFileSync('bench/x81/receipts/post.json', JSON.stringify(rows, null, 1) + '\n');
