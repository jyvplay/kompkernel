/**
 * X79 — resolve the contradiction. bench/x79/alpha.ts said 32 ASCII ids cost 69 tok vs
 * 96 for Cyrillic. bench/x79/remap.ts made real wires WORSE. Which is true, and why?
 * Here: take a real wire, and for EACH free ASCII substitute measure the wire's own
 * token count with that one glyph replaced. No contract, no prune - just the effect.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const f: any = tagstackFrontier(fs.readFileSync(p, 'utf8'), enc);
  const wire = f.message;
  const freq = new Map<string, number>();
  for (const ch of wire) if (ch.charCodeAt(0) > 127) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  if (!freq.size) { console.log(`${p.split('/').pop()} no non-ASCII`); continue; }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
  const used = new Set(wire);
  const cands = 'qxzjvkwbgypfmducslhnaeiort'.split('').filter((c) => !used.has(c));
  console.log(`\n${p.split('/').pop()}  F ${f.messageTokens} tok | wire ${wire.length} chars | top glyph '${top[0]}' x${top[1]} | ${freq.size} distinct non-ASCII`);
  const out: string[] = [];
  for (const c of cands.slice(0, 10)) {
    let body = '';
    for (const ch of wire) body += ch === top[0] ? c : ch;
    const t = T(body, enc);
    out.push(`${c}:${t - f.messageTokens >= 0 ? '+' : ''}${t - f.messageTokens}`);
  }
  console.log(`  replace '${top[0]}' -> ` + out.join('  ') + `   (wire only, no contract)`);
  // how much of the wire is non-ASCII, and how isolated are those glyphs?
  let isolated = 0, total = 0;
  for (let i = 0; i < wire.length; i++) {
    const c = wire.charCodeAt(i);
    if (c > 127) { total++; const b = wire.charCodeAt(i - 1), a = wire.charCodeAt(i + 1);
      if ((b <= 127 || b === undefined) && (a <= 127 || isNaN(a))) isolated++; }
  }
  console.log(`  non-ASCII chars ${total}; of those with ASCII on BOTH sides: ${isolated}`);
}
