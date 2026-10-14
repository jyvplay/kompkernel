/**
 * Z44 idea sweep: measure |T(text)| vs |T(transposed text)| for exact,
 * model-invertible notational transpositions.  Everything measured here is a
 * bijection on strings; nothing is lossy.  The number printed is the *upside*
 * (markers/flags not yet charged).
 * Run: ./bench/z44/build.sh bench/z44/sweep.ts <file>...
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';

const enc: EncodingName = 'o200k_base';
const files = process.argv.slice(2);
const T = (s: string) => countTokens(s, enc);

/* ---- 1. identifier splitting: snake/kebab/camel/Title runs of words ---- */
function idSplit(text: string): string {
  return text
    .replace(/([A-Za-z0-9])([A-Z][a-z])/g, '$1 $2')      // camelCase -> camel Case
    .replace(/([a-z0-9])([A-Z]{2,})/g, '$1 $2')          // HTTPRequest -> HTTP Request
    .replace(/([A-Za-z])_([A-Za-z])/g, '$1 $2')          // snake_case
    .replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2');         // kebab-case
}
/* ---- 2. JSON/whitespace tightening: collapse \n+indent to one \n ---- */
function jsonTight(text: string): string {
  return text.replace(/\n[ \t]+/g, '\n');
}
/* ---- 3. ISO extended -> basic: 2026-09-15T06:02:11Z -> 20260915T060211Z ---- */
function isoBasic(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/g, '$1$2$3T$4$5$6')
             .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$1$2$3');
}
/* ---- 4. HTML entities -> chars ---- */
function entities(text: string): string {
  return text.replace(/&#(\d{2,5});/g, (_, d: string) => String.fromCodePoint(Number(d)))
             .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' } as Record<string, string>)[n]);
}
/* ---- 5. path separators -> spaces (only inside /a/b/c-like runs) ---- */
function pathElide(text: string): string {
  return text.replace(/(?:\.{0,2}\/)?(?:[A-Za-z0-9._@+-]+\/){1,}[A-Za-z0-9._@+-]+/g, (m) => m.split('/').join(' '));
}
/* ---- 6. url scheme elision ---- */
function urlElide(text: string): string {
  return text.replace(/https?:\/\//g, '');
}
/* ---- 7. thousands separators in numbers ---- */
function numThin(text: string): string {
  return text.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => m.split(',').join(''));
}
/* ---- 8. markdown link/image elision (keep label and url) ---- */
function mdLink(text: string): string {
  return text.replace(/\]\(/g, '] (').replace(/!\[/g, '! [');
}
/* ---- 9. spaces after sentence punctuation elision ---- */
function sentenceSpace(text: string): string {
  return text.replace(/([.!?;:,])\s+(?=\S)/g, '$1' + '\u0001');  // marker stands for the space
}

const transforms: Array<[string, (s: string) => string]> = [
  ['idSplit', idSplit],
  ['jsonTight', jsonTight],
  ['isoBasic', isoBasic],
  ['entities', entities],
  ['pathElide', pathElide],
  ['urlElide', urlElide],
  ['numThin', numThin],
  ['mdLink', mdLink],
  ['sentNoSpace', sentenceSpace],
];

const agg = new Array(transforms.length).fill(0);
let tot = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const I = T(text);
  tot += I;
  const parts: string[] = [];
  transforms.forEach(([name, fn], k) => {
    const out = fn(text);
    const d = I - T(out);
    agg[k] += d;
    if (d !== 0) parts.push(`${name} ${d > 0 ? '−' : '+'}${Math.abs(d)} (${(100 * d / I).toFixed(1)}%)`);
  });
  console.log(`${f.split('/').slice(-2).join('/')} I=${I}  ${parts.join('  ') || 'no transform moved the count'}`);
}
console.log(`\nTOTAL I=${tot}`);
transforms.forEach(([name], k) => console.log(`  ${name.padEnd(12)} ${agg[k] >= 0 ? '−' : '+'}${Math.abs(agg[k])} (${(100 * agg[k] / tot).toFixed(2)}% of all tokens)`));
