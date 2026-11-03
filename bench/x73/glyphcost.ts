/**
 * X73 probe 4 — where does the wire's budget actually go?
 *
 * The frontier's ops wires are glyph substitutions: frequent substrings become
 * single foreign letters, and the contract that defines them is ~11 tokens. If any
 * glyph in the alphabet costs TWO OR MORE tokens in o200k, the wire is paying
 * twice for one symbol, and no contract search can see it (the contract is
 * already minimal). This measures, per lane, the exact token cost of every
 * character the winning message actually uses.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  const freq = new Map<string, number>();
  for (const ch of r.message) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let excess = 0;
  const bad: string[] = [];
  for (const [ch, n] of freq) {
    const c = countTokens(ch, enc);
    if (c > 1) { excess += (c - 1) * n; bad.push(`${JSON.stringify(ch)}x${n}=${c}tok`); }
  }
  console.log(`${p.split('/').pop().padEnd(24)} msg ${String(r.messageTokens).padStart(5)} distinctChars ${String(freq.size).padStart(4)} excessFromMultiTokenGlyphs ${String(excess).padStart(4)}  ${bad.slice(0, 8).join(' ')}`);
}
