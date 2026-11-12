import { tachygrafiaIsInstruction, tachygrafiaTrace, tachygrafiaApply, tachygrafiaCovers, tachygrafiaLine } from '../../src/lib/omega/tachygrafia';
import { perikopiIsLegend } from '../../src/lib/omega/perikopi';
import { countTokens } from '../../src/lib/omega/bpe';
const enc:any='o200k_base';
const lines=[
 'spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.',
 '⁺ = the number at the same position in the line above, plus the change from the line two above.',
 'Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it. above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width print only.',
];
for(const l of lines){
  console.log(`\n--- ${JSON.stringify(l.slice(0,50))} len=${l.length} ends.=${/\.$/.test(l.trim())}`);
  console.log(`  tachygrafiaIsInstruction=${tachygrafiaIsInstruction(l)}  perikopiIsLegend=${perikopiIsLegend(l)}  steps=${tachygrafiaTrace(l).length}`);
  const a=tachygrafiaApply(l);
  console.log(`  applied: ${JSON.stringify(a.slice(0,90))}`);
  console.log(`  covers=${tachygrafiaCovers(l,a)}  changed=${a!==l}`);
  const t=tachygrafiaLine(l,enc);
  console.log(`  tachygrafiaLine -> ${t===null?'null':`${t.via} ${t.before}->${t.after2}`}`);
}
