// Z33: list DAEDALUS rule texts (glyph + text, split at each glyph) for one file, with token cost, and test whether
// each rule text is a candidate in the VERITAS-C search (exact substring of the input).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const r = daedalusEncode(t, 'o200k_base');
const at = r.wire.indexOf('¶');
const head = r.wire.slice(0, at);
const parts = head.split(/([\u0400-\u04FF])/).filter((x) => x.length);
const rules: { g: string; text: string }[] = [];
for (let i = 0; i < parts.length; i++) {
  if (/^[\u0400-\u04FF]$/.test(parts[i])) rules.push({ g: parts[i], text: parts[i + 1] ?? '' });
}
let inText = 0; const stats: string[] = [];
for (const ru of rules) {
  const occ = t.split(ru.text).length - 1;
  if (ru.text.length && occ >= 1) inText++;
  stats.push(`${ru.g} tok=${countTokens(ru.text, 'o200k_base')} occ=${occ} ${JSON.stringify(ru.text.slice(0, 40))}`);
}
console.log(`rules=${rules.length} (first-level glyph splits; text occurring in input: ${inText})`);
console.log(stats.slice(0, 60).join('\n'));
