// The winning pair on the ops lanes is SPACE and SLASH, and a clause that
// writes a bare space as one of the two characters is invisible to a reader.
// Price wordings that NAME whitespace instead of emitting it.
import { readFileSync } from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { ouraEncode } from '@/lib/omega/oura';
const enc: any = 'o200k_base';
const text = readFileSync('bench/holdout-ops/git-numstat.txt', 'utf8');
const r: any = ouraEncode(text, enc);
const contract: string = r.contract;
const tail = 'print only.';
const head = contract.slice(0, contract.length - tail.length);
const price = (c: string) => countTokens(head + c + ' ' + tail, enc) - countTokens(contract, enc);
console.log('CONTRACT', JSON.stringify(contract));
const A = ' ', B = '/';   // space and slash
const cands = [
  `Then swap ${A} ${B}.`,                 // invisible space -- UNSAFE
  `Then swap spaces and ${B}.`,
  `Then swap space and ${B}.`,
  `Then swap the space and ${B}.`,
  `Then swap ${B} and space.`,
  `Then swap ${B} and spaces.`,
  `Then exchange space and ${B}.`,
  `Then in the result swap space and ${B}.`,
  `Then swap " " and ${B}.`,
  `Then swap SP and ${B}.`,
  `Then swap sp and ${B}.`,
  `Then swap ␠ and ${B}.`,
  `Then swap _ and ${B}.`,
  `Then, in the result, swap space and ${B}.`,
];
for (const c of cands.sort((x, y) => price(x) - price(y)))
  console.log(String(price(c)).padStart(3), JSON.stringify(head + c + ' ' + tail));
