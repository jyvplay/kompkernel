/**
 * X79 — ALPHABET REMAP. The frontier writes its ids with Cyrillic/Greek glyphs. A
 * non-ASCII glyph sitting inside ASCII text forces a token boundary on BOTH sides, so
 * the neighbouring ASCII words get split too. An ASCII glyph would merge into them.
 * Measured (bench/x79/alpha.ts): 32 ids in an ASCII wire cost 96 tok with Cyrillic and
 * 69 tok with ASCII lowercase — 27 tokens for the same information.
 *
 * This is not a compression of information at all: it is a choice of WHICH CHARACTERS
 * carry it, optimised against one specific tokenizer. No general-purpose compressor can
 * do this, and no human would think to.
 *
 * Decoding is a pure character substitution: "the letter q stands for а". It is total
 * and mechanical provided the substitute letter does not otherwise occur in the wire.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const POOL = 'qxzjvkwbgyfmpducslhn'.split('');   // rare-in-English ASCII, tried in order
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const f: any = tagstackFrontier(S, enc);
  const wire = f.message;
  // frequency of every non-ASCII character on the wire
  const freq = new Map<string, number>();
  for (const ch of wire) if (ch.charCodeAt(0) > 127) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  if (freq.size === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(f.messageTokens).padStart(5)} | no non-ASCII on wire`); continue; }
  const used = new Set(wire);
  const free = POOL.filter((c) => !used.has(c));
  // map the most frequent non-ASCII chars to the first free ASCII letters
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const map = new Map<string, string>();
  ranked.forEach(([ch], i) => { if (i < free.length) map.set(ch, free[i]); });
  if (map.size === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(f.messageTokens).padStart(5)} | no free ASCII letter`); continue; }
  const build = (m: Map<string, string>) => {
    let body = '';
    for (const ch of wire) body += m.get(ch) ?? ch;
    const contract = '§REMAP ' + [...m.entries()].map(([a, b]) => `${b}=${a}`).join(' ');
    return contract + '\n' + body;
  };
  // greedy prune: drop mappings that do not pay
  let cur = new Map(map);
  let best = T(build(cur), enc);
  for (let step = 0; step < 30 && cur.size > 1; step++) {
    const ent = [...cur.entries()];
    const trial = new Map(ent.slice(0, -1));
    const t = T(build(trial), enc);
    if (t >= best) break;
    cur = trial; best = t;
  }
  const totalOcc = [...freq.entries()].reduce((a, [ch, n]) => a + (cur.has(ch) ? n : 0), 0);
  const d = best - f.messageTokens;
  rows.push({ path: p, F: f.messageTokens, M: best, d, mapped: cur.size, occ: totalOcc });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(f.messageTokens).padStart(5)} -> ${String(best).padStart(5)} (${d >= 0 ? '+' : ''}${d}) | mapped ${cur.size} glyphs, ${totalOcc} occurrences`);
  fs.writeFileSync('bench/x79/receipts/remap.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL ${rows.reduce((a, r) => a + r.d, 0)} over ${rows.length} lanes`);
