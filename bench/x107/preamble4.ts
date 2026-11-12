/** X107 — the preamble contraction must PRESERVE the recursion statement.
 *  ΣΥΜΠΛΟΚΗ already varies the contract between "expand" and "expand repeatedly"
 *  according to whether any rule references an earlier glyph, so dropping the word is
 *  a real semantic loss on a nested tape, not a free saving.  GATE 4 caught it.  Price
 *  candidates that keep it. */
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const L: Array<[string, string]> = [
  ['ΜΕΤΡΟΝ composed', 'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.'],
  ['ΔΙΑΣΤΗΜΑ', 'Before ¶ k=v. expand repeatedly Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded; L: verbatim. Print. print only.'],
  ['ΣΥΝΚΡΙΣΗ', 'Before ¶ k=v. expand repeatedly After ~, a number has . before its last 1 digits. print only.'],
  ['short form', 'Before ¶ k=v. expand repeatedly; print only.'],
  ['v1 output (ΜΕΤΡΟΝ)', '¶ k=v; expand repeatedly. Header n,sep,col=model; named cols drop+rebuild; full n-field line literal,resets,drop. above=prev line, colM=col M same line, days/workdays=next date/weekday, +b=above+b same width print only.'],
];
const PRE: Array<[string, (s: string) => string, boolean]> = [
  ['identity', (s) => s, false],
  ['drop "Before " (keeps repeatedly)', (s) => s.replace(/^Before /, ''), false],
  ['"Before ¶ k=v. expand repeatedly " -> "¶k=v. expand repeatedly "', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v. expand repeatedly '), false],
  ['-> "¶ k=v, expand repeatedly. "', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶ k=v, expand repeatedly. '), false],
  ['-> "¶k=v expand repeatedly "', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand repeatedly '), false],
  ['v1 form -> "¶k=v expand repeatedly "', (s) => s.replace(/^¶ k=v; expand repeatedly\.\s+/, '¶k=v expand repeatedly '), false],
  ['-> "¶k=v expand " (LOSES repeatedly)', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand '), true],
];
for (const [n, l] of L) {
  const b = countTokens(l, enc);
  console.log(`\n### ${n}  (${b} tok)`);
  for (const [pn, f, lossy] of PRE) {
    const c = f(l);
    const t = countTokens(c, enc);
    console.log(`   ${(lossy ? '[LOSSY] ' : '        ') + pn.padEnd(52)} ${String(t).padStart(3)} tok  Δ ${t - b > 0 ? '+' : ''}${t - b}  keepsRepeatedly=${c.includes('repeatedly') || !l.includes('repeatedly')}`);
  }
}
