/** X118 frontier screen for the unified-diff derived-header candidate.
 * Measures the COMPLETE message both ways in one process; no claim until the
 * strict gate clears. Run: bash bench/x15/run.sh bench/x118/diff-screen.ts
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const MARKS = ['¤', '†', '‡', '¦', '¬', '÷', '¡', '¿', '¥', '£', '€', '©', '®', '♦', '♥', '♪', '♫', '★', '☆', '☎', '✓', '✔', '✨'];
const text = fs.readFileSync(process.argv[2] ?? 'bench/holdout-work/unified-diff.patch', 'utf8');
const m = MARKS.find(c => !text.includes(c) && T(c) === 1)!;
function rewrite(text: string, m: string): { wire: string; hits: number } {
  let hits = 0, cur = '';
  const wire = text.split('\n').map(l => {
    let h = /^diff --git a\/(.+) b\/(.+)$/.exec(l);
    if (h && h[1] === h[2]) { cur = h[1]!; hits++; return `diff --git a/${cur}`; }
    h = /^--- a\/(.+)$/.exec(l); if (h && cur && h[1] === cur) { hits++; return `${m}---`; }
    h = /^\+\+\+ b\/(.+)$/.exec(l); if (h && cur && h[1] === cur) { hits++; return `${m}+++`; }
    return l;
  }).join('\n');
  return { wire, hits };
}
function inverse(body: string, m: string): string {
  let cur = '';
  return body.split('\n').map(l => {
    const h = /^diff --git a\/(.+)$/.exec(l);
    if (h) { cur = h[1]!; return `diff --git a/${cur} b/${cur}`; }
    if (l === m + '---') return `--- a/${cur}`;
    if (l === m + '+++') return `+++ b/${cur}`;
    return l;
  }).join('\n');
}
const KEY = (m: string) => `X118. Body first. diff --git a/P gains " b/P"; ${m}---/${m}+++ become --- a/P / +++ b/P with the last P. Print only.`;
const t0 = Date.now();
const base = tagstackEncode(text, enc);
const t1 = Date.now();
const rw = rewrite(text, m);
const own = inverse(rw.wire, m) === text;
const inner = tagstackFrontier(rw.wire, enc);
const t2 = Date.now();
const message = KEY(m) + '\n' + inner.message;
const tokens = T(message);
const decoded = inverse(inner.decoded, m);
const row = {
  path: process.argv[2] ?? 'bench/holdout-work/unified-diff.patch',
  marker: m, hits: rw.hits, keyTokens: T(KEY(m)),
  baseTokens: base.messageTokens, baseExact: base.decoded === text, baseParent: base.parentCodec, baseMs: t1 - t0,
  innerTokens: inner.messageTokens, innerExact: inner.decoded === rw.wire, innerParent: inner.parentCodec, innerMs: t2 - t1,
  ownInverse: own, composedExact: decoded === text,
  candidateTokens: tokens, delta: tokens - base.messageTokens,
  admitted: own && inner.decoded === rw.wire && decoded === text && tokens < base.messageTokens,
};
fs.mkdirSync('bench/x118/receipts', { recursive: true });
fs.writeFileSync('bench/x118/receipts/diff-screen.json', JSON.stringify(row, null, 2) + '\n');
fs.writeFileSync('bench/x118/receipts/diff-screen.candidate.txt', message);
console.log(JSON.stringify(row, null, 2));
