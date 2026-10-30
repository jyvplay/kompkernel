import * as fs from 'node:fs';
import { syllogismosPlan, syllogismosRestore } from '../../src/lib/omega/syllogismos';
import { countTokens } from '../../src/lib/omega/bpe';
for(const path of process.argv.slice(2)){const text=fs.readFileSync(path,'utf8'); const s=Date.now(); const p=syllogismosPlan(text,'o200k_base'); console.log(JSON.stringify({path,ms:Date.now()-s,applied:!!p,exact:p?syllogismosRestore(p.reducedText,p.spec)===text:null,contractTokens:p?countTokens(p.contract,'o200k_base'):null,drops:p?.spec.drops.map((d:any)=>({name:d.name,kind:d.kind,parts:d.parts,exceptions:d.exceptions.length}))}));}
