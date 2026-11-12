/** X107 — the preamble is a FIXED 34-char prefix on every lane's contract.  It is paid
 *  on all 29 lanes, so even one token per lane is a 29-token general win.  Measure the
 *  candidates on the complete contract lines the corpus actually emits. */
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const L: Array<[string, string]> = [
  ['short form (node-help)', 'Before ¶ k=v. expand repeatedly; print only.'],
  ['long form (psql/cue)', 'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.'],
  ['diastema (prices.csv)', 'Before ¶ k=v. expand repeatedly Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded; L: verbatim. Print. print only.'],
  ['synkrisis (markdown-table)', 'Before ¶ k=v. expand repeatedly After ~, a number has . before its last 1 digits. print only.'],
  ['metron short', 'Before ¶ k=v. expand repeatedly'],
];
const PRE: Array<[string, (s: string) => string]> = [
  ['identity', (s) => s],
  ['drop "Before "', (s) => s.replace(/^Before /, '')],
  ['drop "Before ", no space before ;', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s*;/, '¶ k=v; expand repeatedly;')],
  ['¶ k=v; expand repeatedly. ', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶ k=v; expand repeatedly. ')],
  ['¶k=v;expand repeatedly ', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v;expand repeatedly ')],
  ['¶k=v expand ', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand ')],
];
for (const [n, l] of L) {
  console.log(`\n### ${n}  (${countTokens(l, enc)} tok baseline)`);
  for (const [pn, f] of PRE) {
    const c = f(l);
    console.log(`   ${pn.padEnd(34)} ${String(countTokens(c, enc)).padStart(3)} tok  Δ ${countTokens(c, enc) - countTokens(l, enc) > 0 ? '+' : ''}${countTokens(c, enc) - countTokens(l, enc)}  :: ${JSON.stringify(c.slice(0, 60))}`);
  }
}
