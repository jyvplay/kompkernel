import fs from 'node:fs'; import path from 'node:path';
import { plinthosEncodeText, plinthosDecodeText } from '../src/lib/omega/plinthos';
const out=process.argv[2] ?? 'bench/tmp/pli';
fs.mkdirSync(out,{recursive:true}); for(const f of fs.readdirSync(out)) fs.rmSync(path.join(out,f));
let n=0,skipped=0;
for(const d of ['bench/holdout-tab','bench/holdout-tbl','bench/holdout-work','bench/holdout','bench/holdout-mk','bench/holdout-ops']){
  if(!fs.existsSync(d)) continue;
  for(const f of fs.readdirSync(d).sort()){
    const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>40000) continue;
    const r=plinthosEncodeText(t,'o200k_base');
    if(!r){skipped++;continue;}
    if(plinthosDecodeText(r.out)!==t){console.error('TS INVERSE FAIL '+f);process.exit(1);}
    const b=path.join(out,(d.split('/').pop()+'_'+f).replace(/[^a-zA-Z0-9]+/g,'_'));
    fs.writeFileSync(b+'.wire',r.out); fs.writeFileSync(b+'.src',t); n++;
  }
}
console.log(`emitted ${n} transposed wires (skipped ${skipped} with no table)`);
