import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { tachygrafiaIsInstruction, tachygrafiaTrace } from '../../src/lib/omega/tachygrafia';
import { perikopiIsLegend } from '../../src/lib/omega/perikopi';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of ['bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-x40/metrics.tsv']){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  console.log(`\n##### ${p}  total ${r.messageTokens}`);
  for(const line of (r.message as string).split('\n')){
    if(tachygrafiaIsInstruction(line)){
      console.log(`  INSTRUCTION len=${line.length} legend=${perikopiIsLegend(line)} steps=${tachygrafiaTrace(line).length}`);
      console.log(`  ${JSON.stringify(line)}`);
    }
  }
}
