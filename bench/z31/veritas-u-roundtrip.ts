// Z31 receipt for VERITAS-U (src/lib/omega/veritas-u.ts): exact round trip on the fresh 111-doc corpus and on edge cases;
// o200k totals against VERITAS-A best-of-3 (veritasABest, the existing tournament), same run, same counter.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasUEncode, veritasUDecode } from '@/lib/omega/veritas-u';
import { veritasABest, VXA_LEGEND_V2, VXA_SENTINEL } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const [listFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
const edges: [string, string][] = [
  ['empty', ''], ['one line', 'hello world'], ['sentinel prefix', VXA_SENTINEL + 'x\n'.repeat(3)],
  ['alias char in input', '¡ alpha beta gamma alpha beta gamma alpha beta gamma\n'],
  ['tilde and newline escapes', 'a~b ~N c~~d\nalpha beta alpha beta alpha beta\n'], ['tabs', 'a\tb\tc\n'.repeat(20)],
  ['CRLF', 'the quick brown fox\r\nthe quick brown fox\r\nthe quick brown fox\r\n'],
  ['unicode', 'Ünïcödé 日本語 текст 日本語 текст 日本語 текст 🚀🚀🚀\n'.repeat(4)],
  ['repeated phrase', 'the cat sat on the mat. '.repeat(40)],
];
let n = 0, fail = 0, sumU = 0, sumA = 0, sumIn = 0, msU = 0, msA = 0;
const perFile: string[] = [];
const check = (name: string, t: string) => {
  n++;
  const t0 = performance.now();
  const r = veritasUEncode(t, enc);
  const ms = performance.now() - t0;
  const ok = veritasUDecode(r.wire) === t && r.decoded === t;
  if (!ok) { fail++; console.log('FAIL', name); }
  const t1 = performance.now();
  const a = veritasABest(t, enc, VXA_LEGEND_V2);
  const msA1 = performance.now() - t1;
  const inT = countTokens(t, enc);
  sumIn += inT; sumU += r.outTokens; sumA += a.outTokens; msU += ms; msA += msA1;
  perFile.push(`${name}\tin=${inT}\tvxa=${a.outTokens}\tvxu=${r.outTokens}\tmode=${r.mode}\tok=${ok}`);
};
for (const [name, t] of edges) check('edge:' + name, t);
for (const f of files) check(f.replace(/^.*\/docs\//, ''), fs.readFileSync(f, 'utf8'));
console.log(perFile.join('\n'));
console.log(`checks ${n}, failures ${fail}`);
console.log(`identity ${sumIn}  VXA-best-of-3 ${sumA}  VERITAS-U ${sumU}  delta ${sumU - sumA} (${(((sumU - sumA) / sumA) * 100).toFixed(2)}%)`);
console.log(`encode ms: VERITAS-U ${Math.round(msU)}  VXA-best-of-3 ${Math.round(msA)}`);
