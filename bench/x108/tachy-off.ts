/**
 * X108 — offline measurement of ΤΑΧΥΓΡΑΦΊΑ on every legend wording the corpus emits,
 * including the three ΠΕΡΙΚΟΠΈ cannot reach.  Message-level, so no frontier run.
 */
import { countTokens } from '../../src/lib/omega/bpe';
import { tachygrafiaRewrite, tachygrafiaInvertEdits } from '../../src/lib/omega/tachygrafia';
const enc: any = 'o200k_base';
const L: Array<[string, string]> = [
  ['ΣΤΙΧΟΜΥΘΪΑ spec (cue-sheet) — NOTHING covers it',
    'spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.'],
  ['ΑΚΟΛΟΥΘΪΑ2 delta (kubectl, metrics)',
    '⁺ = the number at the same position in the line above, plus the change from the line two above.'],
  ['ΜΕΤΡΟΝ composed (psql)',
    'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.'],
  ['ΜΕΤΡΟΝ already ΠΕΡΙΚΟΠΈ-contracted',
    '¶k=v expand repeatedly Header n,sep,col=model; named cols drop+rebuild; full n-field line literal,resets,drop. above=prev line, colM=col M same line, days/workdays=next date/weekday, +b=above+b same width print only.'],
  ['ΔΙΑΣΤΗΜΑ mask (prices.csv)',
    'Before ¶ k=v. expand repeatedly Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded; L: verbatim. Print. print only.'],
  ['ΔΙΑΣΤΗΜΑ already ΠΕΡΙΚΟΠΈ-contracted',
    '¶k=v expand repeatedly Δ: mask=# per digit shape. R: first space-token (signed int)+sum from 0 into #s, 0-padded; L: verbatim. print only.'],
  ['ΣΥΝΚΡΙΣΗ (markdown-table)',
    'Before ¶ k=v. expand repeatedly After ~, a number has . before its last 1 digits. print only.'],
  ['ΣΥΝΚΡΙΣΗ already ΠΕΡΙΚΟΠΈ-contracted',
    '¶k=v expand repeatedly After ~, a number has . before its last 1 digits. print only.'],
  ['node-help short form',
    'Before ¶ k=v. expand repeatedly; print only.'],
];
let tb = 0, ta = 0, badInv = 0;
for (const [n, l] of L) {
  const b = countTokens(l, enc);
  const rw = tachygrafiaRewrite(l, enc, '');
  const inv = tachygrafiaInvertEdits(rw.message, rw.edits);
  const ok = inv === l;
  if (!ok) badInv++;
  const a = ok ? countTokens(rw.message, enc) : b;
  tb += b; ta += a;
  console.log(`${n.padEnd(44)} ${String(b).padStart(3)} -> ${String(a).padStart(3)}  Δ ${a - b > 0 ? '+' : ''}${a - b}  invert=${ok ? 'y' : 'N'}  via=${rw.edits.map((e) => e.via).join(',') || '-'}`);
  if (rw.edits.length > 0) console.log(`     -> ${JSON.stringify(rw.message)}`);
}
console.log(`\nTOTAL ${tb} -> ${ta}  Δ ${ta - tb}   invertibility failures ${badInv}`);
