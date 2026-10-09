/** emit rules-only SYNTOMIA wires + sources for the independent CPython reader */
import fs from 'node:fs'; import path from 'node:path';
import { syntomiaEncode } from '../src/lib/omega/syntomia';
import { chironOpsUsed, CHIRON_START } from '../src/lib/omega/chiron';
const out=process.argv[2] ?? 'bench/tmp/synt';
fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(out)) fs.rmSync(path.join(out,f));
let n=0, skipped=0;
const dirs=['bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-tab'];
for(const d of dirs){ if(!fs.existsSync(d)) continue;
  for(const f of fs.readdirSync(d).sort()){
    const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>40000) continue;
    const r=syntomiaEncode(t,'o200k_base',{budgetMs:2000});
    if(r.wire===t) continue;
    if(!r.wire.startsWith(CHIRON_START)) { skipped++; continue; }
    const u=chironOpsUsed(r.wire);
    if(u.rep||u.range||u.split){ skipped++; continue; }   // out of the reader's declared scope
    // the reader implements the GENERIC contract ("a new foreign letter"); a
    // wire whose emitted contract names a specific script is out of its scope
    if(!r.decoderPrompt.includes('foreign letter')){ skipped++; continue; }
    const base=path.join(out,(d.split('/').pop()+'_'+f).replace(/[^a-zA-Z0-9]+/g,'_'));
    fs.writeFileSync(base+'.wire', r.wire);
    fs.writeFileSync(base+'.src', t);
    fs.writeFileSync(base+'.contract', r.decoderPrompt.slice(r.wire.length));
    n++;
  }
}
console.log(`emitted ${n} rules-only wire/src pairs (skipped ${skipped} that use × or … operators, outside the reader's declared scope)`);
