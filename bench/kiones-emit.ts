import fs from 'node:fs'; import path from 'node:path';
import { kionesEncode } from '../src/lib/omega/kiones';
import { chironOpsUsed, CHIRON_START } from '../src/lib/omega/chiron';
const out=process.argv[2] ?? 'bench/tmp/kio';
fs.mkdirSync(out,{recursive:true}); for(const f of fs.readdirSync(out)) fs.rmSync(path.join(out,f));
let n=0,skipped=0;
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk']){
  if(!fs.existsSync(d)) continue;
  for(const f of fs.readdirSync(d).sort()){
    const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>9000) continue;
    const r=kionesEncode(t,'o200k_base',{maxConfigs:3,configBudgetMs:60,useIncumbent:false});
    if(r.wire===t||!r.wire.startsWith(CHIRON_START)){skipped++;continue;}
    if(r.winner.startsWith('kiones')){skipped++;continue;}   // transposed wires need the extra clause; out of the reader's scope
    const u=chironOpsUsed(r.wire);
    if(u.rep||u.range||u.split){skipped++;continue;}
    if(!r.decoderPrompt.includes('foreign letter')){skipped++;continue;}
    const b=path.join(out,(d.split('/').pop()+'_'+f).replace(/[^a-zA-Z0-9]+/g,'_'));
    fs.writeFileSync(b+'.wire',r.wire); fs.writeFileSync(b+'.src',t); n++;
  }
}
console.log(`emitted ${n} rules-only generic-contract wires (skipped ${skipped} outside the reader's declared scope)`);
