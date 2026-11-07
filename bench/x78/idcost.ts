/**
 * X78 — how much does an ID COST? Token cost, not character count, is the currency.
 * The o200k pretokenizer has `\p{N}{1,3}`: up to three digits in ONE chunk. If that
 * holds, a 3-digit id is one token and an id alphabet of 1000 becomes available —
 * versus ~2 tokens for a Cyrillic id, which is what priced every X77 interning scheme
 * out of the market.
 */
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows: Array<[string, string]> = [];
const m = (label: string, s: string) => rows.push([label, s]);
m('digit x1', '7'); m('digit x2', '42'); m('digit x3', '137'); m('digit x4', '9042');
for (const c of ['а', 'я', 'щ', 'α', 'ω', '§', '¶', '†', '·', '~', '^', '`', '#', '%', '|']) m(`char ${c}`, c);
for (const s of ['~a', '~1', ' a', 'a ', '|a', 'a|', '.a', 'a.']) m(`pair "${s}"`, s);
// sequences: does an id run stay one-token-per-id?
for (const n of [4, 8, 16]) {
  m(`${n} x 3-digit ids spaced`, Array.from({ length: n }, (_, i) => String(100 + i)).join(' '));
  m(`${n} x 3-digit ids packed`, Array.from({ length: n }, (_, i) => String(100 + i)).join(''));
  m(`${n} x cyr ids packed`, Array.from({ length: n }, (_, i) => 'абвгдежзийклмноп'[i]).join(''));
  m(`${n} x cyr ids spaced`, Array.from({ length: n }, (_, i) => 'абвгдежзийклмноп'[i]).join(' '));
}
// the realistic case: id embedded in surrounding ascii text
for (const n of [4, 8]) {
  m(`"abc " + ${n} packed 3-digit ids`, 'abc ' + Array.from({ length: n }, (_, i) => String(100 + i)).join(''));
  m(`"abc " + ${n} packed cyr ids`, 'abc ' + Array.from({ length: n }, (_, i) => 'абвгдежзийклмноп'[i]).join(''));
}
console.log(`${'label'.padEnd(30)} ${'chars'.padStart(6)} ${'tok'.padStart(5)} ${'tok/id'.padStart(7)}`);
for (const [label, s] of rows) {
  const t = T(s, enc);
  console.log(`${label.padEnd(30)} ${String(s.length).padStart(6)} ${String(t).padStart(5)} ${(t / (label.includes('x') ? Number(label.split('x')[0].trim().split(' ').pop()) : 1)).toFixed(2).padStart(7)}`);
}
// the decisive comparison: replace an N-char literal with an id, n times
console.log('\n--- break-even: literal length L occurring n times, vs id cost ---');
for (const L of [4, 6, 8, 12, 16]) {
  const lit = 'abcdefghijklmnop'.slice(0, L);
  for (const n of [2, 3, 5, 10]) {
    const before = T(Array.from({ length: n }, () => `x ${lit} y`).join('\n'), enc);
    const after3 = T('§M 100=' + lit + '\n' + Array.from({ length: n }, () => `x 100 y`).join('\n'), enc);
    const afterC = T('§M а=' + lit + '\n' + Array.from({ length: n }, () => `x а y`).join('\n'), enc);
    console.log(`L=${String(L).padStart(2)} n=${String(n).padStart(2)}  before ${String(before).padStart(3)}  3digit-id ${String(after3).padStart(3)} (${after3 - before >= 0 ? '+' : ''}${after3 - before})  cyr-id ${String(afterC).padStart(3)} (${afterC - before >= 0 ? '+' : ''}${afterC - before})`);
  }
}
