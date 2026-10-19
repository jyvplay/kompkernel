import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SEP } from '@/lib/omega/chiron';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const S = CHIRON_SEP; // ¶
const heads = [
  `Before ${S} new foreign letters name text to the next. After ${S} `,   // current (baseline)
  `Letters before ${S} name the phrases after them. Then `,
  `Letters before ${S} name the phrases after them. Now `,
  `Letters before ${S} name the phrases after them; `,
  `Letters before ${S} name the phrases after them. `,
  `Letters before ${S} name the phrases after them, so `,
  `Each letter before ${S} names the phrase after it. Then `,
  `Letters before ${S} name the phrases following. Then `,
  `Letters before ${S} name what follows them. Then `,
  `A letter before ${S} names the phrase after it. Then `,
  `Before ${S} letters name the phrases after them. Then `,
  `Before ${S} a letter names the phrase after it. Then `,
];
const tails = [
  ['no shapes, nested', 'expand repeatedly; print result only.'],
  ['no shapes, flat  ', 'expand; print result only.'],
  ['1 shape, nested  ', 'expand repeatedly and 14 digits become dddd-dd-ddTdd:dd:dd; print result only.'],
  ['2 shapes, nested ', 'expand repeatedly and 8 digits become YYYY-MM-DD, 4 digits become dd:dd, where ^ before digits marks them; drop it; print result only.'],
];
for (const [label, tail] of tails) {
  console.log('--- ' + label + ' ---');
  const rows = heads.map(h => [T(h + tail), h] as [number, string]).sort((a,b)=>a[0]-b[0]);
  for (const [n,h] of rows) console.log(String(n).padStart(3), JSON.stringify(h + tail));
}
