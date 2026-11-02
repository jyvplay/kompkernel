import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const ranges: Array<[number, number]> = [[0x0250,0x02AF],[0x0370,0x03FF],[0x0400,0x045F],[0x0530,0x058F],[0x10A0,0x10FF],[0x1E00,0x1EFF],[0x2C60,0x2C7F],[0xA720,0xA7FF],[0x0460,0x052F],[0x1F00,0x1FFF],[0x2100,0x214F],[0x2200,0x22FF],[0x25A0,0x25FF],[0x2600,0x26FF],[0x0400,0x04FF]];
const cands: string[] = [];
for (const [a,b] of ranges) for (let cp = a; cp <= b; cp++) cands.push(String.fromCodePoint(cp));
const one = cands.filter(c => countTokens(c, enc) === 1);
// also test pair cost of two adjacent glyphs and glyph-after-letter
let pairOne = 0;
for (let i = 0; i < Math.min(one.length, 400); i++) if (countTokens(one[i] + one[(i+1)%one.length], enc) === 1) pairOne++;
console.log(JSON.stringify({ candidates: cands.length, oneToken: one.length, sample: one.slice(0, 40).join(''), pairOfTwoIsOneToken: pairOne }));
// how does fusion behave: word+glyph and glyph+word
for (const g of one.slice(0, 6)) {
  const w = ' document';
  console.log(JSON.stringify({ g, gTok: countTokens(g, enc), word: countTokens(w, enc), fusedAfter: countTokens(w + g, enc), glyphSpaceWord: countTokens(g + w, enc), fusedAfterBare: countTokens('document' + g, enc) }));
}
