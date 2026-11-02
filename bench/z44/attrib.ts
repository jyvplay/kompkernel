/**
 * Z44 attribution: where do the raw o200k tokens of a real document actually sit?
 * Classification is on the token *string* (post BPE), one class per token.
 * Run: ./bench/z44/build.sh bench/z44/attrib.ts <file> ...
 */
import fs from 'node:fs';
import { tokenStrings, countTokens } from '../../src/lib/omega/bpe';

const files = process.argv.slice(2);
interface Row { file: string; I: number; ws: number; nl: number; sp: number; word: number; punct: number; digit: number; other: number; chars: number }
const rows: Row[] = [];

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const toks = tokenStrings(text, 'o200k_base').map((x) => x.s);
  const r: Row = { file: f.split('/').slice(-2).join('/'), I: toks.length, ws: 0, nl: 0, sp: 0, word: 0, punct: 0, digit: 0, other: 0, chars: text.length };
  for (const t of toks) {
    if (/^\s+$/.test(t)) {
      r.ws++;
      if (t.includes('\n')) r.nl++;
      else r.sp++;
    } else if (/^[\p{L}]+$/u.test(t) || /^ [\p{L}]+$/u.test(t)) r.word++;
    else if (/^[\p{P}\p{S}]+$/u.test(t)) r.punct++;
    else if (/^[0-9]+$/.test(t) || /^ [0-9]+$/.test(t)) r.digit++;
    else r.other++;
  }
  rows.push(r);
  const pct = (x: number) => ((100 * x) / Math.max(1, r.I)).toFixed(1);
  console.log(`${r.file}  I=${r.I} chars=${r.chars} (${(r.chars / Math.max(1, r.I)).toFixed(2)} chars/tok)  ws=${pct(r.ws)}% (nl ${pct(r.nl)} / sp ${pct(r.sp)})  word=${pct(r.word)}%  punct=${pct(r.punct)}%  digit=${pct(r.digit)}%  other=${pct(r.other)}%`);
}
const sum = (k: keyof Row) => rows.reduce((a, b) => a + (b[k] as number), 0);
console.log(`TOTAL n=${rows.length} I=${sum('I')} ws=${(100 * sum('ws') / sum('I')).toFixed(1)}% (nl ${(100 * sum('nl') / sum('I')).toFixed(1)}%) word=${(100 * sum('word') / sum('I')).toFixed(1)}% punct=${(100 * sum('punct') / sum('I')).toFixed(1)}% digit=${(100 * sum('digit') / sum('I')).toFixed(1)}% other=${(100 * sum('other') / sum('I')).toFixed(1)}%  chars/tok=${(sum('chars') / sum('I')).toFixed(2)}`);
