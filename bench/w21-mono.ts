/** THE ATTACK AIMED AT THE SECOND PATCH: ANASTROPHE must never lose to PLINTHOS. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens } from '../src/lib/omega/bpe';
import { plinthosEncode } from '../src/lib/omega/plinthos';
import { anastropheEncode } from '../src/lib/omega/anastrophe';
let bad=0,n=0;
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-tab','bench/holdout-tbl','bench/holdout','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>300&&t.length<12000) files.push([d.split('/').pop()!+'/'+f,t]);}
for(const [nm,t] of files){
  const pl=plinthosEncode(t,'o200k_base',{maxConfigs:2,configBudgetMs:40,useIncumbent:false});
  const an=anastropheEncode(t,'o200k_base',{maxConfigs:2,configBudgetMs:40,armBudgetMs:2500,useIncumbent:false});
  n++;
  if(an.decoded!==t){bad++;console.log('  EXACT FAIL',nm);}
  if(an.messageTokens>pl.messageTokens){bad++;console.log('  MONO FAIL',nm,pl.messageTokens,'->',an.messageTokens);}
  if(an.messageTokens>countTokens(t,'o200k_base')){bad++;console.log('  WORSE-THAN-RAW',nm);}
  console.log(`${nm.padEnd(30)} PLI ${String(pl.messageTokens).padStart(5)} ANA ${String(an.messageTokens).padStart(5)} gate=${an.gate.admitted?'Y':'n'} ${an.winner}`);
}
console.log(`\n${n*3-bad}/${n*3} checks pass over ${n} documents`);
