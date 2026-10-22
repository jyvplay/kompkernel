// Price the ANTISTROPHE clause against the EXACT contract it splices into.
// EUTELEIA's lesson: the clause is spliced in front of a sentence that already
// exists, so its price is the price of the JUNCTION, not of the clause alone.
import { readFileSync } from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { ouraEncode } from '@/lib/omega/oura';

const enc: any = 'o200k_base';
const path = process.env.LANES!.split(',')[0];
const text = readFileSync(path, 'utf8');
const r: any = ouraEncode(text, enc);
console.log('CONTRACT >>>', JSON.stringify(r.contract));
console.log('msgTok', r.messageTokens);

const contract: string = r.contract ?? '';
const tail = 'print only.';
if (!contract.endsWith(tail)) {
  console.log('!! contract does not end with the expected tail');
}

const head = contract.slice(0, contract.length - tail.length);

function price(clause: string): number {
  const withClause = `${head}${clause} ${tail}`;
  return countTokens(withClause, enc) - countTokens(contract, enc);
}

const A = '_', B = '/';
const cands: string[] = [
  `In the result swap ${A} and ${B}.`,
  `Then swap ${A} and ${B} in the result.`,
  `In the result, ${A} and ${B} are exchanged.`,
  `Result: swap ${A} ${B}.`,
  `Then swap ${A} ${B}.`,
  `In the result exchange ${A} and ${B}.`,
  `Then in the result exchange ${A} and ${B}.`,
  `Finally swap ${A} and ${B} throughout.`,
  `Swap ${A} and ${B} in the result.`,
  `In the result ${A} means ${B} and ${B} means ${A}.`,
  `Then ${A}<>${B} in the result.`,
  `Then in the result ${A}<>${B}.`,
  `Then swap ${A}<>${B}.`,
  `Then unswap ${A} ${B}.`,
  `Then ${A}/${B} swapped in the result.`,
];
const scored = cands.map((c) => [c, price(c)] as [string, number]).sort((x, y) => x[1] - y[1]);
for (const [c, d] of scored) console.log(String(d).padStart(4), JSON.stringify(head + c + ' ' + tail));
