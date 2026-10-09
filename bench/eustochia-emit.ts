/** emit EUSTOCHIA wires for the independent CPython reader (rules-only, generic-wording scope) */
import fs from 'node:fs'; import path from 'node:path';
import { eustochiaEncode } from '../src/lib/omega/eustochia';
import { chironOpsUsed, CHIRON_START } from '../src/lib/omega/chiron';
const out=process.argv[2] ?? 'bench/tmp/eust';
fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(out)) fs.rmSync(path.join(out,f));
let n=0, skipped=0;
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl']){
  if(!fs.existsSync(d)) continue;
  for(const f of fs.readdirSync(d).sort()){
    const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>20000) continue;
    const r=eustochiaEncode(t,'o200k_base',{maxArms:2,armBudgetMs:80,useIncumbent:false});
    if(r.wire===t) continue;
    if(!r.wire.startsWith(CHIRON_START)){skipped++;continue;}
    const u=chironOpsUsed(r.wire);
    if(u.rep||u.range||u.split){skipped++;continue;}
    if(!r.decoderPrompt.includes('foreign letter')){skipped++;continue;}
    const base=path.join(out,(d.split('/').pop()+'_'+f).replace(/[^a-zA-Z0-9]+/g,'_'));
    fs.writeFileSync(base+'.wire', r.wire); fs.writeFileSync(base+'.src', t);
    n++;
  }
}
console.log(`emitted ${n} rules-only generic-contract wires (skipped ${skipped} outside the reader's declared scope)`);
