/**
 * X107 — offline legend contraction. The legend strings are known (dumped this turn
 * from the live frontier), so the contraction can be measured without re-running a
 * 100-minute 29-lane frontier.
 *
 * The question: PINAX (X76) has TWO substitution rules, both matching METRON's exact
 * wording. APOGRAPHE emits a FAMILY of wordings (3 setups x 2 per family + combined),
 * none of which those rules match. How much would a GENERAL connective-stripping
 * contraction recover across the family?
 */
import { countTokens } from '../../src/lib/omega/bpe';
import { PINAX_RULES, pinaxCovers } from '../../src/lib/omega/pinax';

const enc: any = 'o200k_base';

const LEGENDS: Array<[string, string]> = [
  ['cue-sheet.md / psql-output.txt — APOGRAPHE+METRON composed legend (measured 73 tok on the lane)',
    'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.'],
  ['node-help.txt — short form (measured 11 tok on the lane)',
    'Before ¶ k=v. expand repeatedly; print only.'],
  ['APOGRAPHE setup variant 1 + per-family wordings',
    'Line 1 is a header: n, sep, then col=model. Each named column is deleted from the lines and rebuilt at its place; a line with n fields is literal and resets. Drop line 1. col1=above: that column repeats the line above. col2=col3: that column copies column 3 of its own line. col4=+7: that column is the number above plus 7, same digit count.'],
  ['APOGRAPHE setup variant 3 + combined2 wording',
    'Line 1: n|sep|col=model. Rebuild each named column (it is missing from the lines); a full n-field line is literal and resets. Drop line 1. above=line above, colM=column M of its own line, days/workdays=next date/weekday, +b=number above+b, lin:V/i,S=line i is V and line j is V+(j-i)*S'],
  ['APOGRAPHE with clock family',
    'Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. col1=clock:V/i,S: line i reads V; line j reads V+(j-i)*S seconds, same clock format.'],
];

function pinax(l: string): string {
  let n = l;
  for (const r of PINAX_RULES) {
    const c = n.replace(r.re, r.rep);
    if (c === n) continue;
    if (!pinaxCovers(r.rep, r.requires)) continue;
    n = c; break;
  }
  return n;
}

/**
 * GENERAL connective stripping. Operator-set preserving by construction: every
 * `name=` pair survives verbatim on its left-hand side, and every definition keeps
 * the tokens that name the operation. Only the filler between them goes.
 */
function general(l: string): string {
  let c = l;
  c = c.replace(/^Before ¶ k=v\. expand repeatedly\s*/, '¶ k=v; expand repeatedly. ');
  c = c.replace(/\s*=\s*/g, '=');
  // the three APOGRAPHE setup wordings -> one canonical header clause
  c = c
    .replace(/Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets\. Drop it\./g,
      'Header n,sep,col=model; named cols drop+rebuild; full n-field line literal,resets,drop.')
    .replace(/Line 1 is a header: n, sep, then col=model\. Each named column is deleted from the lines and rebuilt at its place; a line with n fields is literal and resets\. Drop line 1\./g,
      'Header n,sep,col=model; named cols drop+rebuild; n-field line literal,resets; drop line1.')
    .replace(/Line 1: n\|sep\|col=model\. Rebuild each named column \(it is missing from the lines\); a full n-field line is literal and resets\. Drop line 1\./g,
      'Header n,sep,col=model; named cols missing,rebuild; n-field line literal,resets; drop line1.');
  // the per-family wordings
  c = c
    .replace(/colN=above: that column repeats the line above\./g, 'colN=above=prev line.')
    .replace(/colN=above: same as the line above\./g, 'colN=above=prev line.')
    .replace(/colN=colM: that column copies column M of its own line\./g, 'colN=colM: copy col M.')
    .replace(/colN=colM: same line, column M\./g, 'colN=colM: copy col M.')
    .replace(/colN=days: dates, one day apart\./g, 'colN=days:+1d.')
    .replace(/colN=days: the date above plus one day\./g, 'colN=days:above+1d.')
    .replace(/colN=workdays: dates, next weekday \(skip Sat\/Sun\)\./g, 'colN=workdays:next weekday.')
    .replace(/colN=workdays: next weekday after the date above\./g, 'colN=workdays:next weekday.')
    .replace(/colN=\+b: that column is the number above plus b, same digit count\./g, 'colN=+b:above+b same width.')
    .replace(/colN=\+b: number above \+ b, same width\./g, 'colN=+b:above+b same width.')
    .replace(/colN=lin:V\/i,S: V is line i; every line j has V\+\(j-i\)\*S in V's exact format\./g, 'colN=lin:V/i,S: line i=V, line j=V+(j-i)*S, V format.')
    .replace(/colN=lin:V\/i,S: line i is V, each line j is V\+\(j-i\)\*S, written like V\./g, 'colN=lin:V/i,S: line i=V, line j=V+(j-i)*S, V format.')
    .replace(/colN=clock:V\/i,S: line i reads V; line j reads V\+\(j-i\)\*S seconds, same clock format\./g, 'colN=clock:V/i,S: line i=V, line j=V+(j-i)*S sec, V shape.')
    .replace(/colN=clock:V\/i,S: V at line i, plus S seconds per line after, same shape\./g, 'colN=clock:V/i,S: line i=V, +S sec/line, V shape.');
  // the two combined wordings
  c = c
    .replace(/above=line above, colM=column M of the same line, days\/workdays=next date\/weekday, \+b=number above\+b same width/g,
      'above=prev line, colM=col M same line, days/workdays=next date/weekday, +b=above+b same width')
    .replace(/above=line above, colM=column M of its own line, days\/workdays=next date\/weekday, \+b=number above\+b, lin:V\/i,S=line i is V and line j is V\+\(j-i\)\*S/g,
      'above=prev line, colM=col M own line, days/workdays=next date/weekday, +b=above+b, lin:V/i,S=line i=V line j=V+(j-i)*S');
  c = c.replace(/ print only\.$/, '. print only.').replace(/\s{2,}/g, ' ').trim();
  return c;
}

let tb = 0, tp = 0, tg = 0;
for (const [name, l] of LEGENDS) {
  const b = countTokens(l, enc), p = countTokens(pinax(l), enc), g = countTokens(general(l), enc);
  tb += b; tp += p; tg += g;
  console.log(`\n### ${name}`);
  console.log(`  before  ${String(b).padStart(3)} tok  ${String(l.length).padStart(4)} chars`);
  console.log(`  PINAX   ${String(p).padStart(3)} tok  (${p - b > 0 ? '+' : ''}${p - b})   fired=${pinax(l) !== l}`);
  console.log(`  GENERAL ${String(g).padStart(3)} tok  (${g - b > 0 ? '+' : ''}${g - b})   chars ${general(l).length}`);
  console.log(`  -> ${JSON.stringify(general(l))}`);
}
console.log(`\nTOTAL before ${tb}  PINAX ${tp} (Δ ${tp - tb})  GENERAL ${tg} (Δ ${tg - tb})`);
