// X14: TOON (published library, @toon-format/toon 4.4.0) against plain DAEDALUS and HEMERA on the
// same CSV lanes. One-chat M = contract + decoder prompt. TOON text is produced by toon-conv.mjs
// (kept outside the repo in /home/user/toon-probe; the .toon files are receipts here).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';

const TOON_CONTRACT =
  'TOON: rows[N]{fields}: gives the row count N and the field names; each indented line after it is one row of comma-separated values; a value in double quotes is text.';
const pairs: [string, string][] = [
  ['bench/holdout-tab/aapl-2014.csv', 'bench/z59/receipts/toon-aapl-2014.toon'],
  ['bench/holdout-tab/vix-daily-1990.csv', 'bench/z59/receipts/toon-vix-daily-1990.toon'],
  ['bench/z11/fresh/csv-8.csv', 'bench/z59/receipts/toon-csv-8.toon'],
];
for (const [csv, toon] of pairs) {
  const csvText = fs.readFileSync(csv, 'utf8');
  const toonText = fs.readFileSync(toon, 'utf8');
  const plain = daedalusEncode(csvText, 'o200k_base');                  // identity (DAEDALUS on CSV)
  const toonOnly = countTokens(TOON_CONTRACT + '\n' + toonText, 'o200k_base');   // TOON text, no further codec
  const toonDaed = daedalusEncode(toonText, 'o200k_base');               // DAEDALUS on TOON text
  const toonDaedM = countTokens(TOON_CONTRACT + '\n' + toonDaed.decoderPrompt, 'o200k_base');
  console.log(JSON.stringify({
    csv, csvChars: csvText.length, identityM: plain.messageTokens,
    toonM: toonOnly, toonDaedalusM: toonDaedM, toonDaedalusExact: toonDaed.exact,
  }));
}
