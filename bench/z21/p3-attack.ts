// New attacks aimed at the P3 patch (written AFTER the patch, per the repair rule).
// A1: input starts with KOINE's rule line and then has repeated columns (RECALL must still decode it).
// A2: input starts with RECALL's rule line and contains '&k:' look-alike fields and repeated columns.
// A3: repeats at distance exactly 16 and 17 (window edge) inside a larger listing.
// A4: a 3000-line listing with repeated columns and CRLF; full chain must be exact and not larger than identity.
// A5: the P3 identity escape applied to an input that starts with the P3 escape plus RECALL and KOINE headers.
import { KOINE_HEADER } from '@/lib/omega/koine';
import { RECALL_HEADER } from '@/lib/omega/recall';
import { phalanx3Encode, phalanx3Decode, PHALANX3_ESC } from '@/lib/omega/phalanx3';
import { countTokens } from '@/lib/omega/bpe';
const rows = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join('\n');
const cases: [string, string][] = [
  ['A1 KOINE header + repeated columns', KOINE_HEADER + '\n' + rows(40, i => `2026-10-12T01:25:56.${100 + (i % 4)} svc${i % 3} ok`)],
  ['A2 RECALL header + &-lookalikes', RECALL_HEADER + '\n' + rows(40, i => `&${i % 9}:abcdef &9:abcdef &:x${i % 2}`)],
  ['A3 distance 16 and 17 repeats', rows(60, i => (i % 17 === 0 ? 'edgeword' : 'w' + i) + ' ' + (i % 16 === 0 ? 'mid16' : 'x' + i))],
  ['A4 3000-line CRLF listing', rows(3000, i => `-rw-r--r-- 1 user user ${String(1000 + (i % 7)).padStart(6)} 2026-10-12 01:${String(i % 60).padStart(2, '0')}:00.000000000 +0000 f${i % 11}.ts`).replace(/\n/g, '\r\n')],
  ['A5 P3 escape + both headers', PHALANX3_ESC + '\n' + KOINE_HEADER + '\n' + RECALL_HEADER + '\n' + rows(20, i => 'same same ' + (i % 2))],
];
let fail = 0;
for (const [label, x] of cases) {
  const r = phalanx3Encode(x, 'o200k_base');
  const exact = phalanx3Decode(r.wire) === x;
  const notLarger = r.outTokens <= r.inTokens;
  if (!exact || !notLarger) fail++;
  console.log(`${label}: mode=${r.mode} koine=${r.koineKept} recall=${r.recallKept} in=${r.inTokens} out=${r.outTokens} exact=${exact} notLarger=${notLarger}`);
}
console.log(fail === 0 ? 'P3 ATTACKS: ALL EXACT, NOT LARGER THAN IDENTITY' : `P3 ATTACKS FAILED: ${fail}`);
