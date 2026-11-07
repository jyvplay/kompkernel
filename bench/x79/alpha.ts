/** X79 — which character class packs most densely as an ID alphabet? */
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const SETS: Array<[string, string[]]> = [
  ['cyrillic lower', 'абвгдежзийклмнопрстуфхцчшщъыьэюя'.split('')],
  ['greek lower', 'αβγδεζηθικλμνξοπρστυφχψω'.split('')],
  ['ascii lower', 'abcdefghijklmnopqrstuvwxyz'.split('')],
  ['ascii upper', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')],
  ['ascii digits', '0123456789'.repeat(3).split('')],
  ['ascii punct', '~!@#$%^&*()-_=+[]{};:,<.>/?'.split('')],
  ['cjk', '的一是不了人我在有他这为之大来以个中上们'.split('')],
  ['armenian', 'աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆ'.split('')],
  ['hiragana', 'あいうえおかきくけこさしすせそたちつてとなにぬねの'.split('')],
];
console.log(`${'alphabet'.padEnd(16)} ${'n=8'.padStart(6)} ${'n=16'.padStart(6)} ${'n=32'.padStart(6)} ${'tok/char@32'.padStart(12)}`);
for (const [name, chars] of SETS) {
  const f = (n: number) => T(chars.slice(0, n).join(''), enc);
  const t32 = f(32);
  console.log(`${name.padEnd(16)} ${String(f(8)).padStart(6)} ${String(f(16)).padStart(6)} ${String(t32).padStart(6)} ${(t32 / 32).toFixed(3).padStart(12)}`);
}
console.log('\n--- realistic: 32 ids embedded in a wire with separators ---');
for (const [name, chars] of SETS) {
  const ids = chars.slice(0, 32);
  const wire = Array.from({ length: 32 }, (_, i) => `x${ids[i]}y`).join(' ');
  console.log(`${name.padEnd(16)} ${String(T(wire, enc)).padStart(4)} tok`);
}
