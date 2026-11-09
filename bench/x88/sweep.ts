/** X88 probe 3 — a broad, cheap, honest sweep.
 *  Twenty invertible-by-declared-rule transformations, applied to real lanes, measured
 *  GROSS (raw o200k tokens, no frontier). The frontier absorbs some of every gross
 *  saving, so a gross number is an upper bound — but a transform whose gross saving is
 *  near zero is dead on arrival and can be discarded for one token of compute instead
 *  of a 400-second frontier run. Anything with a large gross delta gets gated for real.
 *  Each transform prints the rule a reader would have to apply, because a saving that
 *  cannot be inverted by a declared rule is not a codec. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);

type Tr = { name: string; rule: string; fn: (s: string) => string };
const TRS: Tr[] = [
  { name: 'case-fold', rule: 'all letters were lowercased; a bitmask restores case', fn: s => s.toLowerCase() },
  { name: 'space-after-punct', rule: 'a space follows every , ; : ! ?', fn: s => s.replace(/([,;:!?]) /g, '$1') },
  { name: 'space-before-punct-none', rule: 'no space precedes , . ; :', fn: s => s.replace(/ ([,.;:])/g, '$1') },
  { name: 'collapse-2space', rule: 'every run of 2+ spaces was one space', fn: s => s.replace(/ {2,}/g, ' ') },
  { name: 'strip-trailing-ws', rule: 'no line ended in whitespace', fn: s => s.replace(/[ \t]+$/gm, '') },
  { name: 'tab-to-1space', rule: 'every tab was one space', fn: s => s.replace(/\t/g, ' ') },
  { name: 'eol-normalise', rule: 'the file ended with exactly one \\n', fn: s => s.replace(/\n+$/, '\n') },
  { name: 'dbl-newline-to-par', rule: 'a blank line was the paragraph mark ¶', fn: s => s.replace(/\n\n+/g, ' ¶ ') },
  { name: 'quote-strip-dq', rule: 'every " was deleted', fn: s => s.replace(/"/g, '') },
  { name: 'bracket-strip', rule: 'every ( ) [ ] { } was deleted', fn: s => s.replace(/[()\[\]{}]/g, '') },
  { name: 'tree-draw-to-depth', rule: 'a leading depth digit replaces the tree drawing', fn: s => s.replace(/^[| `+\\\-]{2,}(?=\S)/gm, m => String(Math.floor((m.length - 1) / 3)) + ' ') },
  { name: 'indent-to-depth', rule: 'leading whitespace was 2 spaces per level', fn: s => s.replace(/^( +)/gm, m => String(Math.round(m.length / 2)) + '|') },
  { name: 'drop-decimal-trailing0', rule: 'a trailing .0 was dropped from every number', fn: s => s.replace(/(\d)\.0(?![.\d])/g, '$1') },
  { name: 'drop-leading-zeros', rule: 'leading zeros were dropped from every number', fn: s => s.replace(/\b0+(\d)/g, '$1') },
  { name: 'thousands-sep-strip', rule: 'every , inside a number was deleted', fn: s => s.replace(/(\d),(\d{3})\b/g, '$1$2') },
  { name: 'hex-lower', rule: 'hex letters were lowercased', fn: s => s.replace(/[0-9A-F]{6,}/g, m => m.toLowerCase()) },
  { name: 'uri-scheme-strip', rule: 'https:// was deleted', fn: s => s.replace(/https?:\/\//g, '') },
  { name: 'path-root-strip', rule: 'the longest constant path prefix was deleted', fn: s => { const L = s.split('\n').filter(Boolean); if (!L.length) return s; let p = 0; const first = L[0]; while (p < first.length && L.every(l => l[p] === first[p])) p++; const cut = first.lastIndexOf('/', p); return cut > 8 ? s.split(first.slice(0, cut + 1)).join('') : s; } },
  { name: 'dup-line-run', rule: 'a repeated line was written once with a ×count', fn: s => { const L = s.split('\n'); const o: string[] = []; for (let i = 0; i < L.length;) { let j = i; while (j + 1 < L.length && L[j + 1] === L[i]) j++; o.push(j > i ? `×${j - i + 1} ${L[i]}` : L[i]); i = j + 1; } return o.join('\n'); } },
  { name: 'ascii-fold', rule: 'non-ASCII letters were folded to ASCII', fn: s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7f]/g, '?') },
];

const LANES = [
  ['prose', 'bench/holdout-work/kb-article.txt'], ['prose', 'bench/holdout-work/llm-answer.md'],
  ['prose', 'bench/holdout-work/email-thread.txt'], ['prose', 'bench/holdout-x41/node-help.txt'],
  ['ops', 'bench/holdout-x41/apt-real.txt'], ['ops', 'bench/holdout-x42/dpkg-l.txt'],
  ['ops', 'bench/holdout-x41/ls-real.txt'], ['ops', 'bench/holdout-x42/findmnt.txt'],
  ['ops', 'bench/holdout-x86/npm-ls-all.txt'], ['ops', 'bench/holdout-ops/find-listing.txt'],
  ['ops', 'bench/holdout-x86/ls-la-usrbin.txt'], ['ops', 'bench/holdout-x86/dpkg-l-full.txt'],
  ['other', 'bench/holdout/code-ts.txt'], ['other', 'bench/holdout/json-pkg.txt'],
  ['other', 'bench/holdout-x40/metrics.tsv'], ['other', 'bench/holdout-tbl/psql-output.txt'],
  ['other', 'bench/holdout-work/unified-diff.patch'], ['other', 'bench/holdout-ops/git-numstat.txt'],
  ['other', 'bench/holdout-x40/cue-sheet.md'], ['other', 'bench/holdout-tbl/markdown-table.md'],
] as const;

const rows: any[] = [];
for (const [cat, p] of LANES) {
  if (!fs.existsSync(p)) { console.log('missing', p); continue; }
  const S = fs.readFileSync(p, 'utf8');
  const base = T(S);
  const lane = p.split('/').pop()!;
  const res: any[] = [];
  for (const tr of TRS) {
    let v: string; try { v = tr.fn(S); } catch { continue; }
    if (v === S) continue;
    const d = T(v) - base;
    res.push({ t: tr.name, d, pct: +(100 * d / base).toFixed(2) });
  }
  res.sort((a, b) => a.d - b.d);
  rows.push({ cat, lane, path: p, raw: base, best: res.slice(0, 6) });
  console.log(`\n[${cat}] ${lane}  raw=${base}`);
  for (const r of res.slice(0, 6)) console.log(`    ${r.t.padEnd(24)} ${String(r.d).padStart(7)}  ${r.pct}%`);
  fs.writeFileSync('bench/x88/receipts/sweep.json', JSON.stringify({ transforms: TRS.map(t => ({ name: t.name, rule: t.rule })), rows }, null, 1) + '\n');
}
console.log('\n=== which transforms are ever in a lane\'s top 3, and their total gross delta ===');
const agg: Record<string, { n: number; d: number }> = {};
for (const r of rows) for (const b of r.best.slice(0, 3)) { agg[b.t] ??= { n: 0, d: 0 }; agg[b.t].n++; agg[b.t].d += b.d; }
for (const [k, v] of Object.entries(agg).sort((a, b) => a[1].d - b[1].d)) console.log(`  ${k.padEnd(24)} top3-on ${String(v.n).padStart(2)} lanes  total gross ${v.d}`);
