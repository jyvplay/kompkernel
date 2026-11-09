import * as fs from 'node:fs';
import { kenonPlanOnly } from '../../src/lib/omega/kenon';
import { countTokens } from '../../src/lib/omega/bpe';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p,'utf8');
  const g = kenonPlanOnly(S,'o200k_base')!;
  if (!g) { console.log(p+': no plan'); continue; }
  console.log('=== '+p+'  cols='+g.plan.cols+' rows='+g.plan.rows+' lit='+g.plan.literals+' clauseRaw='+countTokens(g.clause,'o200k_base')+' wireRaw='+countTokens(g.plan.text,'o200k_base'));
  console.log('CLAUSE: '+g.clause);
  console.log('WIRE head:\n'+g.plan.text.split('\n').slice(0,5).join('\n'));
}
