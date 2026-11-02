/**
 * Z44 word audit: for a prose document, where do the tokens live?
 * Splits on whitespace into "words", counts tokens per word, and reports the
 * composition of the excess (multi-token words, punctuation runs).
 * Run: ./bench/z44/build.sh bench/z44/words.ts <file> [--enc=]
 */
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '../../src/lib/omega/bpe';

const args = process.argv.slice(2);
const enc = (args.find((a) => a.startsWith('--enc='))?.slice(6) ?? 'o200k_base') as EncodingName;
const files = args.filter((a) => !a.startsWith('--'));

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const I = countTokens(text, enc);
  // whitespace words, keeping the newline structure out of it
  const words = text.split(/\s+/).filter((w) => w.length);
  const cnt = new Map<string, number>();
  let excess = 0;
  const hist = [0, 0, 0, 0];
  const multi: Array<[string, number]> = [];
  for (const w of words) {
    const c = cnt.get(w) ?? 0;
    if (c === 0) {
      const t = countTokens(' ' + w, enc);
      multi.push([w, t]);
      excess += t - 1;
      hist[Math.min(t, 3)]++;
    }
    cnt.set(w, c + 1);
  }
  multi.sort((a, b) => b[1] - a[1]);
  // punctuation-only runs contribute 1 token per word already counted; newline/space handling:
  const nl = (text.match(/\n/g) ?? []).length;
  const wordsInTokens = words.length;
  console.log(`\n=== ${f.split('/').slice(-2).join('/')}  chars=${text.length} I=${I}  whitespace-words=${wordsInTokens}  I/word=${(I / wordsInTokens).toFixed(3)}  distinct words=${cnt.size}`);
  console.log(`   words by token cost: 1tok=${hist[0]} 2tok=${hist[1]} 3+tok=${hist[2]}  (excess tokens from multi-token words = ${excess})`);
  console.log(`   newline count = ${nl}`);
  console.log(`   costliest words: ${multi.slice(0, 14).map(([w, t]) => `${JSON.stringify(w)}:${t}`).join(' ')}`);
  // how many of the multi-token words repeat in the document?
  let repExcess = 0, singExcess = 0, repWords = 0, singWords = 0;
  for (const [w, t] of multi) {
    if (t < 2) continue;
    if ((cnt.get(w) ?? 0) > 1) { repExcess += (t - 1) * (cnt.get(w)! - 1); repWords++; }
    else { singExcess += t - 1; singWords++; }
  }
  console.log(`   excess in words that REPEAT (>=2 uses): ${repExcess} tok over ${repWords} word types`);
  console.log(`   excess in words used ONCE:              ${singExcess} tok over ${singWords} word types`);
  // leading-token merge check: is ' word' one token?
  let one = 0;
  for (const w of cnt.keys()) if (countTokens(' ' + w, enc) === 1) one++;
  console.log(`   distinct word types where ' '+word is exactly 1 token: ${one}/${cnt.size}`);
}
