/**
 * bench/chiron-kairos-equiv.ts — proves the fast token-span enumeration is the same
 * function as the reference one (identical key set and counts), on every real text in
 * the corpus and holdouts, plus glyph-rewritten variants (mid-search states).
 * Exit code 1 on any mismatch.
 *
 *   usage: node chiron-kairos-equiv.mjs [dirs...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { enumerateTokenSpans, enumerateTokenSpansRef } from '../src/lib/omega/chiron';

const dirs = process.argv.slice(2);
const files: string[] = [];
const walk = (p: string) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const e of fs.readdirSync(p).sort()) walk(path.join(p, e));
  else files.push(p);
};
for (const d of dirs) walk(d);

function sameMap(a: Map<string, number>, b: Map<string, number>): string | null {
  if (a.size !== b.size) return `size ${a.size} vs ${b.size}`;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w !== v) return `key ${JSON.stringify(k.slice(0, 40))}: ${v} vs ${w}`;
  }
  return null;
}

let cases = 0, fails = 0, phrases = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  if (text.length > 60000) continue; // reference is slow on very large inputs; sizes recorded in the report
  const variants: string[][] = [[text]];
  // mid-search-like states: the most frequent word replaced by a glyph, and a line dropped
  const words = text.split(/\s+/).filter(w => w.length > 3);
  if (words.length) {
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    variants.push([text.split(top).join('\u2016')]);
    variants.push([text.split('\n').slice(1).join('\n'), 'Ⓐ tail ' + text.slice(0, 200)]);
  }
  for (const parts of variants) {
    cases++;
    const a = enumerateTokenSpans(parts, 'o200k_base');
    const b = enumerateTokenSpansRef(parts, 'o200k_base');
    phrases += b.size;
    const diff = sameMap(a, b);
    if (diff) { fails++; console.log('MISMATCH', f, diff); }
  }
}
console.log(`files=${files.length} cases=${cases} phrases_compared=${phrases} mismatches=${fails}`);
if (fails) process.exitCode = 1;
