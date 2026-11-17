/** X130: which Unicode ranges have glyph PAIRS that merge into one token? */
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const RANGES: { n: string; a: number; b: number }[] = [
  { n: 'Greek+Cyr 0386-044f (CURRENT)', a: 0x0386, b: 0x044f },
  { n: 'CJK      4e00-9fff', a: 0x4e00, b: 0x9fff },
  { n: 'Hangul   ac00-d7a3', a: 0xac00, b: 0xd7a3 },
  { n: 'Hiragana 3041-3096', a: 0x3041, b: 0x3096 },
  { n: 'Katakana 30a1-30fa', a: 0x30a1, b: 0x30fa },
  { n: 'Hebrew   05d0-05ea', a: 0x05d0, b: 0x05ea },
  { n: 'Arabic   0621-064a', a: 0x0621, b: 0x064a },
  { n: 'Thai     0e01-0e3a', a: 0x0e01, b: 0x0e3a },
  { n: 'Devanag. 0915-0939', a: 0x0915, b: 0x0939 },
  { n: 'Fullwidth ff01-ff5e', a: 0xff01, b: 0xff5e },
  { n: 'LatinExt 0100-017f', a: 0x0100, b: 0x017f },
  { n: 'Armenian 0531-0556', a: 0x0531, b: 0x0556 },
  { n: 'Georgian 10d0-10fa', a: 0x10d0, b: 0x10fa },
];
const N = 40;
for (const R of RANGES) {
  const pool: string[] = [];
  for (let cp = R.a; cp <= R.b && pool.length < N; cp++) {
    const c = String.fromCodePoint(cp);
    if (countTokens(c, enc) === 1) pool.push(c);
  }
  let merge = 0, tot = 0;
  for (const a of pool) for (const b of pool) { if (a === b) continue; tot++; if (countTokens(a + b, enc) === 1) merge++; }
  let good = 0;
  for (const a of pool) { let k = 0; for (const b of pool) if (a !== b && countTokens(a + b, enc) === 1) k++; if (k >= 10) good++; }
  console.log(`${R.n.padEnd(32)} pool=${String(pool.length).padStart(3)}  pairMerge=${(merge / Math.max(1, tot) * 100).toFixed(1).padStart(5)}%  charsWith>=10partners=${String(good).padStart(3)}/${pool.length}`);
}
