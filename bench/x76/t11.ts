/** X76 / t11 — cost of SOUND contractions of the composed METRON legend (73 tok on psql). */
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const ORIG = 'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.';
const cands: [string, string][] = [
  ['ORIGINAL', ORIG],
  ['A keep all ops', 'Before ¶ k=v, expand repeatedly. Header: n, sep, col=model. Named columns are dropped from lines, then rebuilt. A full n-field line is literal, it resets, then drop it. above=line above; colM=column M of this line; days/workdays=next date/weekday; +b=number above+b, same width. print only.'],
  ['B terse', 'Before ¶ k=v, expand repeatedly. Header: n,sep,col=model. Named cols dropped then rebuilt. Full n-field line = literal, resets, dropped. above=line above; colM=col M this line; days/workdays=next date/weekday; +b=number above+b same width. print only.'],
  ['C notation', 'Before ¶ k=v, expand repeatedly. Header: n,sep,col=model. Named: drop+rebuild. Full n-field line: literal, resets, drop. above=line above. colM=col M, same line. days/workdays=next date/weekday. +b=above+b, same width. print only.'],
  ['D minimal', 'Before ¶ k=v, expand repeatedly. Header n,sep,col=model. Named cols: drop, rebuild. Full n-field line: literal, resets, drop. above=line above. colM=col M same line. days/workdays=next date/weekday. +b=above+b same width. print only.'],
];
for (const [n, s] of cands) console.log(`${n.padEnd(16)} ${String(T(s, enc)).padStart(3)}  ${s.slice(0, 100)}`);
