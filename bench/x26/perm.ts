/**
 * X26: PERMUTATION-TO-CANONICAL-ORDER -- is there supply?
 *
 * Every codec in the stack is order-preserving: the wire is the source text
 * with substrings renamed. But the decoder is an LLM that can execute a
 * PROGRAM, and one program an LLM executes exactly and trivially is
 * "emit these lines in this order".
 *
 * So the wire could be
 *      §<grammar tape>¶<lines sorted into compressible order> + "emit in order <perm>"
 *
 * Sorting puts similar lines adjacent, so the grammar finds much longer shared
 * spans. The cost is transmitting the permutation.
 *
 * This probe measures ONLY THE GAIN SIDE first: sort the lines (by several
 * keys) and measure how much smaller the POLYTROPOS wire gets. If the gain does
 * not comfortably exceed the permutation cost, the mechanism is dead and we
 * stop here rather than build it.
 *
 * Sign convention: positive "gain" = sorted wire is SMALLER.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const KEYS: Array<{ id: string; f: (lines: string[]) => string[] }> = [
  { id: 'sort',       f: (l) => l.slice().sort() },
  { id: 'sortByTail', f: (l) => l.slice().sort((a, b) => (a.slice(20) < b.slice(20) ? -1 : a.slice(20) < b.slice(20) ? 0 : 1)) },
  { id: 'sortByWord2',f: (l) => l.slice().sort((a, b) => { const ka = a.split(/\s+/)[1] ?? '', kb = b.split(/\s+/)[1] ?? ''; return ka < kb ? -1 : ka > kb ? 1 : 0; }) },
];

const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
const ONLY = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
console.log('lane'.padEnd(38), 'lines'.padStart(6), 'wire'.padStart(6),
  ...KEYS.map((k) => k.id.padStart(10)), '  permCost(est)');
for (let i = 0; i < lanes.length; i++) {
  if (ONLY && !ONLY.includes(i)) continue;
  const f = lanes[i];
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split('\n');
  if (lines.length < 12) continue;
  const r: any = polytroposEncode(t, enc);
  const base = T(String(r.wire));
  const cells: string[] = [];
  for (const k of KEYS) {
    const s = k.f(lines).join('\n');
    const rs: any = polytroposEncode(s, enc);
    const v = T(String(rs.wire));
    cells.push(((base - v > 0 ? '+' : '') + (base - v)).padStart(10));
  }
  // permutation cost: one index per line. small ints are ~1 token each, and a
  // run of consecutive indices can be a CHIRON range (a..b) at ~2 tokens.
  const permCost = lines.length;
  console.log(f.split('/').pop()!.padEnd(38), String(lines.length).padStart(6), String(base).padStart(6),
    ...cells, String(permCost).padStart(10));
}
