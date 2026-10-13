// Z40: which single characters (and 2-char strings) cost ONE token in both o200k_base and cl100k_base?
import { countTokens } from '@/lib/omega/bpe';
const ranges: [string, number, number][] = [['cyrillic', 0x0400, 0x04ff], ['greek', 0x0370, 0x03ff], ['cjk', 0x4e00, 0x9fff], ['hangul', 0xac00, 0xd7af], ['arabic', 0x0600, 0x06ff], ['latin-ext', 0x0100, 0x024f], ['misc-symbols', 0x2500, 0x27bf], ['arrows-math', 0x2190, 0x22ff]];
const out: Record<string, { n: number; o200k1: number; cl1: number; both1: number }> = {};
const both: string[] = [];
for (const [name, a, b] of ranges) {
  let n = 0, o1 = 0, c1 = 0, bo = 0;
  for (let cp = a; cp <= b; cp++) {
    const ch = String.fromCodePoint(cp);
    n++;
    const x = countTokens(ch, 'o200k_base') === 1;
    const y = countTokens(ch, 'cl100k_base') === 1;
    if (x) o1++;
    if (y) c1++;
    if (x && y) { bo++; both.push(ch); }
  }
  out[name] = { n, o200k1: o1, cl1: c1, both1: bo };
}
console.log(JSON.stringify(out));
console.log('dual single-token chars (first 200):', both.slice(0, 200).join(''));
