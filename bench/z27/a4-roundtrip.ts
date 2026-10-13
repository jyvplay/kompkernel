// PHALANX-A4 vs PHALANX-A3 over the corpus groups (real files) + adversarial edge cases. Every A4 wire is decoded and compared byte-for-byte.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
import { phalanxA4Encode, phalanxA4Decode } from '@/lib/omega/phalanx-a4';
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
const enc = 'o200k_base' as const;
let fail = 0, n = 0;
const tot: Record<string, [number, number, number]> = {};
const check = (label: string, t: string) => {
  const r = phalanxA4Encode(t, enc);
  n++;
  if (phalanxA4Decode(r.wire) !== t) { fail++; console.log(`FAIL ${label}`); }
  return r;
};
for (const [g, fl] of Object.entries(groups)) {
  let id = 0, a3 = 0, a4 = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    const r = check(f, t);
    const a = phalanxA3Encode(t, enc).outTokens;
    id += countTokens(t, enc); a3 += a; a4 += r.outTokens;
    if (r.layer === 'tpl') console.log(`  tpl layer used: ${f} A3=${a} A4=${r.outTokens}`);
  }
  tot[g] = [id, a3, a4];
  console.log(`${g}: identity=${id} A3=${a3} A4=${a4} (A4-A3=${a4 - a3})`);
}
const sum = (k: number) => Object.values(tot).reduce((s, v) => s + v[k], 0);
console.log(`ALL: identity=${sum(0)} A3=${sum(1)} A4=${sum(2)} (A4-A3=${sum(2) - sum(1)}, ${(((sum(2) - sum(1)) / sum(1)) * 100).toFixed(2)}%)`);
const edge: [string, string][] = [
  ['empty', ''], ['newline only', '\n'], ['prefixed', '[[TPL\n1 2 3\n'], ['prefixed-plain', '[[TPL\nhello'],
  ['tab lines', 'a\t1\nb 22\t33\n'], ['placeholder char', 'x\u0001 7\n8\n'], ['digits only', '1\n2\n3\n'],
  ['crlf logs', 'INFO 12:00:01 a=1\r\nINFO 12:00:02 a=2\r\n'], ['at-sign line', '@\n5\n@\n'],
  ['all placeholders present', '¤ § ¦ » ◊ • ∎ ¬ 1\n2\n3\n'],
  ['vxa prefixed', '[[VXA\nfoo\n]]\nbar 1'], ['a3 prefixed', 'PHALANX-A3 json indent=2 newline=0: {"a":1}'],
  ['repeated shapes', Array.from({ length: 200 }, (_, i) => `2026-10-11 12:00:${String(i % 60).padStart(2, '0')} req-${i} took ${i * 3}ms`).join('\n') + '\n'],
];
for (const [label, t] of edge) {
  const r = check(label, t);
  console.log(`edge ${label}: layer=${r.layer} A3=${phalanxA3Encode(t, enc).outTokens} A4=${r.outTokens} exact=${r.exact}`);
}
console.log(`decode/round-trip checks run: ${n}; failures: ${fail}`);
