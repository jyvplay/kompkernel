import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const poolSets: Record<string, string> = {
  cyrillic: Array.from({length: 40}, (_, i) => String.fromCodePoint(0x0430 + i)).join(''),
  greek: Array.from({length: 40}, (_, i) => String.fromCodePoint(0x03B1 + i)).join(''),
  ipa: Array.from({length: 40}, (_, i) => String.fromCodePoint(0x0250 + i)).join(''),
  cjk: Array.from({length: 40}, (_, i) => String.fromCodePoint(0x4E00 + i)).join(''),
  mixed: 'ɑɓɔɗəɛɵρʂʈʊʌʍҳʎʐæøœßðþđłħıŧŋĸƀƃƈƌƒ',
};
for (const [name, pool] of Object.entries(poolSets)) {
  const chars = [...pool].filter(c => countTokens(c, enc) === 1);
  const row: string[] = [];
  for (const k of [1, 2, 3, 4, 5, 6, 8, 10, 16, 24]) {
    const run = chars.slice(0, k).join('');
    row.push(`k${k}=${countTokens(run, enc)}`);
  }
  // repeated same char
  const same = Array.from({length: 8}, () => chars[0]).join('');
  row.push('same8=' + countTokens(same, enc));
  console.log(name, 'charsAvail=' + chars.length, row.join(' '));
}
// how about runs surrounded by spaces / words
const p = 'ɑɓɔɗəɛɵρ';
console.log('run in words: ', countTokens('word ' + p + ' word', enc), 'vs', countTokens('word word', enc));
console.log('run alone:', countTokens(p, enc));
console.log('two runs sep by space:', countTokens(p + ' ' + p, enc));
