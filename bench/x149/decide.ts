// X149 decision measurements (one-shot diagnosis):
//  (1) whitespace-run collapse upper bound on accepted ops messages
//  (2) diff-pair (-X/+Y) census on the unified-diff source with prefix/suffix stats
//  (3) month-name census on raw sources
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const rows = fs.readFileSync('bench/x149/receipts/frontier.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l)) as any[];
let wsTotal = 0;
for (const r of rows) {
  const collapsed = r.message.replace(/ {3,}/g, ' ').replace(/\t+/g, ' ');
  const gain = countTokens(r.message, 'o200k_base') - countTokens(collapsed, 'o200k_base');
  if (gain > 0) wsTotal += gain;
  if (gain > 5) console.log('WS', r.path.split('/').pop(), 'gain<=', gain);
}
console.log('WS_TOTAL_UPPER_BOUND', wsTotal);
const diff = fs.readFileSync('bench/holdout-work/unified-diff.patch', 'utf8');
const lines = diff.split('\n');
const minus: string[] = [], plus: string[] = [], pairs: [string, string][] = [];
let cur: string | null = null;
for (const l of lines) {
  if (l.startsWith('-') && !l.startsWith('---')) cur = l.slice(1);
  else if (l.startsWith('+') && !l.startsWith('+++') && cur !== null) { pairs.push([cur, l.slice(1)]); cur = null; }
  else cur = null;
}
let pairTok = 0, codedTok = 0, stats: string[] = [];
for (const [a, b] of pairs) {
  let p = 0; while (p < Math.min(a.length, b.length) && a[p] === b[p]) p++;
  let s = 0; while (s < Math.min(a.length, b.length) - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const mid1 = a.slice(p, a.length - s), mid2 = b.slice(p, b.length - s);
  const original = '-\n' === '' ? '' : '';
  const orig = countTokens('-' + a + '\n+' + b + '\n', 'o200k_base');
  const coded = mid1.length && mid2.length
    ? countTokens(p + '<' + mid1 + '|' + mid2 + '>' + (a.length - s - p === 0 && b.length - s - p === 0 ? '' : '') + '\n', 'o200k_base')
    : orig;
  pairTok += orig; codedTok += coded;
  stats.push(`${orig}>${coded}`);
}
console.log('DIFF_PAIRS', pairs.length, 'origTok', pairTok, 'codedTok', codedTok, stats.join(' '));
for (const p of ['bench/holdout-x41/ls-l-real.txt', 'bench/holdout-x41/du-real.txt', 'bench/holdout-x41/ps-aux-real.txt', 'bench/holdout-x41/apt-real.txt']) {
  const src = fs.readFileSync(p, 'utf8');
  const months = (src.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g) ?? []).length;
  console.log('MONTHS', p.split('/').pop(), months);
}
