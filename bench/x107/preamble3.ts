/** X107 — the preamble is on EVERY lane. ΠΕΡΙΚΟΠΈ v1 already replaces
 *  "Before ¶ k=v. expand repeatedly " when a header clause follows, so the remaining
 *  opportunity is (a) the lanes whose legend ΠΕΡΙΚΟΠΈ refuses, and (b) the follow-up
 *  contraction of the already-emitted form.  Price every candidate on the complete
 *  message-equivalent line and keep the cheapest. */
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const L: Array<[string, string]> = [
  ['ΔΙΑΣΤΗΜΑ (prices.csv) — refused by v1', 'Before ¶ k=v. expand repeatedly Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded; L: verbatim. Print. print only.'],
  ['ΣΥΝΚΡΙΣΗ (markdown-table) — refused by v1', 'Before ¶ k=v. expand repeatedly After ~, a number has . before its last 1 digits. print only.'],
  ['short form (node-help)', 'Before ¶ k=v. expand repeatedly; print only.'],
  ['v1 output on ΜΕΤΡΟΝ (psql/cue)', '¶ k=v; expand repeatedly. Header n,sep,col=model; named cols drop+rebuild; full n-field line literal,resets,drop. above=prev line, colM=col M same line, days/workdays=next date/weekday, +b=above+b same width print only.'],
  ['v1 output on ΑΠΟΓΡΑΦΗ setup1', 'Header n,sep,col=model; named cols drop+rebuild; n-field line literal,resets; drop line1. col1=above=prev line. col2=col3: copy col 3. col4=+7:above+7 same width.'],
];
const PRE: Array<[string, (s: string) => string]> = [
  ['identity', (s) => s],
  ['A: drop "Before "', (s) => s.replace(/^Before /, '')],
  ['B: "Before ¶ k=v. expand repeatedly " -> "¶k=v expand "', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand ')],
  ['C: v1 form -> "¶k=v expand "', (s) => s.replace(/^¶ k=v; expand repeatedly\.\s+/, '¶k=v expand ')],
  ['D: A+C combined', (s) => s.replace(/^Before /, '').replace(/^¶ k=v; expand repeatedly\.\s+/, '¶k=v expand ')],
];
for (const [n, l] of L) {
  const b = countTokens(l, enc);
  console.log(`\n### ${n}  (${b} tok)`);
  for (const [pn, f] of PRE) {
    const c = f(l);
    const t = countTokens(c, enc);
    console.log(`   ${pn.padEnd(56)} ${String(t).padStart(3)} tok  Δ ${t - b > 0 ? '+' : ''}${t - b}`);
  }
}
