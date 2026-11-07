/**
 * X79 — INDENTATION UNIT SCREEN. o200k charges a chunk for a leading whitespace run,
 * and `\titem` merges to ONE token where `    item` costs two. ANAGNORISIS already
 * ships this at unit 8 (`/^ {8,}/gm`); units 2 (YAML/JSON) and 4 (code) are uncovered.
 * Declare "1 tab = N spaces" once; invert by expansion. Same information, fewer tokens.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const ind = (S: string, unit: number) => {
  if (S.includes('\t')) return null;
  if (!/^ +\S/m.test(S)) return null;
  let n = 0;
  const out = S.split('\n').map((l) => {
    const m = l.match(/^( +)(\S)/);
    if (!m) return l;
    const w = m[1].length;
    if (w % unit !== 0) return l;
    n++;
    return '\t'.repeat(w / unit) + l.slice(w);
  }).join('\n');
  return n < 3 ? null : { out, n };
};
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const raw = T(S, enc);
  const parts: string[] = [];
  for (const unit of [2, 4, 8]) {
    const r = ind(S, unit);
    if (!r) { parts.push(`u${unit} n/a`); continue; }
    const contract = `§INDENT 1 tab = ${unit} spaces`;
    const after = T(contract + '\n' + r.out, enc);
    parts.push(`u${unit} ${after - raw >= 0 ? '+' : ''}${after - raw} (${r.n} lines)`);
  }
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(5)} | ${parts.join('  ')}`);
}
