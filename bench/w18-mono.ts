import fs from 'node:fs'; import path from 'node:path';
import { countTokens } from '../src/lib/omega/bpe';
import { polytroposEncode } from '../src/lib/omega/polytropos';
let bad=0,n=0;
const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<9000) corpus.push([d+'/'+f,t]);}
for(const [nm,t] of corpus){
  const a=polytroposEncode(t,'o200k_base',{maxConfigs:3,configBudgetMs:50,useIncumbent:false,sweepSeparators:false});
  const b=polytroposEncode(t,'o200k_base',{maxConfigs:3,configBudgetMs:50,useIncumbent:false,sweepSeparators:true});
  const c=polytroposEncode(t,'o200k_base',{maxConfigs:1,configBudgetMs:50,useIncumbent:false,sweepSeparators:false});
  const d2=polytroposEncode(t,'o200k_base',{maxConfigs:5,configBudgetMs:50,useIncumbent:false,sweepSeparators:false});
  n+=2;
  if(b.messageTokens>a.messageTokens){bad++;console.log('  SEP-MONO FAIL',nm,a.messageTokens,'->',b.messageTokens);}
  if(d2.messageTokens>c.messageTokens){bad++;console.log('  CFG-MONO FAIL',nm,c.messageTokens,'->',d2.messageTokens);}
  if(b.decoded!==t||d2.decoded!==t){bad++;console.log('  EXACT FAIL',nm);}
}
console.log(`monotonicity after repair: ${n-bad}/${n} checks pass over ${corpus.length} documents`);
