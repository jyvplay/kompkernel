/**
 * X107 — offline measurement of ΠΕΡΙΚΟΠΈ on every legend wording the corpus can emit.
 * The legend strings are known from the live dump, so this is measurable without a
 * 100-minute frontier.
 */
import { countTokens } from '../../src/lib/omega/bpe';
import { perikopiEncode } from '../../src/lib/omega/perikopi';
const enc: any = 'o200k_base';
const L: Array<[string, string]> = [
  ['ΜΕΤΡΟΝ composed (psql-output, cue-sheet)',
    'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.'],
  ['node-help short form',
    'Before ¶ k=v. expand repeatedly; print only.'],
  ['ΑΠΟΓΡΑΦΉ setup1 + above/col/+b families',
    'Line 1 is a header: n, sep, then col=model. Each named column is deleted from the lines and rebuilt at its place; a line with n fields is literal and resets. Drop line 1. col1=above: that column repeats the line above. col2=col3: that column copies column 3 of its own line. col4=+7: that column is the number above plus 7, same digit count.'],
  ['ΑΠΟΓΡΑΦΉ setup2 + clock family',
    'Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. col1=clock:V/i,S: line i reads V; line j reads V+(j-i)*S seconds, same clock format.'],
  ['ΑΠΟΓΡΑΦΉ setup2 + days/workdays/+b',
    'Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. col1=days: dates, one day apart. col2=workdays: next weekday after the date above. col3=+2: number above + 2, same width.'],
  ['ΔΙΑΣΤΗΜΑ (prices.csv)',
    'Before ¶ k=v. expand repeatedly Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded; L: verbatim. Print. print only.'],
  ['ΣΥΝΚΡΙΣΗ (markdown-table)',
    'Before ¶ k=v. expand repeatedly After ~, a number has . before its last 1 digits. print only.'],
];
let tb = 0, ta = 0;
for (const [n, l] of L) {
  const r = perikopiEncode(l, enc, '');
  const b = countTokens(l, enc);
  tb += b; ta += r.applied ? r.messageTokens : b;
  console.log(`${n.padEnd(38)} before ${String(b).padStart(3)}  after ${String(r.applied ? r.messageTokens : b).padStart(3)}  Δ ${(r.applied ? r.messageTokens : b) - b > 0 ? '+' : ''}${(r.applied ? r.messageTokens : b) - b}  via=${r.edits.map((e) => e.via).join(',') || '-'}`);
  if (r.applied) console.log(`    -> ${JSON.stringify(r.message)}`);
  else console.log(`    refused: ${r.notes}`);
}
console.log(`\nTOTAL before ${tb}  after ${ta}  Δ ${ta - tb}`);
