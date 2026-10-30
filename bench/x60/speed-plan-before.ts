import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { diastemaPlan, diastemaWire, diastemaDecode } from '../../src/lib/omega/diastema.before';
import { countTokens } from '../../src/lib/omega/bpe';
const text=fs.readFileSync(process.argv[2]!, 'utf8');
const times:number[]=[]; let last=''; let exact=true;
for(let k=0;k<5;k++){const t=Date.now(); const p=diastemaPlan(text,'o200k_base'); times.push(Date.now()-t); last=JSON.stringify(p); if(p){const w=diastemaWire(p,text); exact=exact && !!w && diastemaDecode(w)===text;}}
console.log(JSON.stringify({version:'before',sha:createHash('sha256').update(last).digest('hex'),exact,plan:JSON.parse(last),times,sourceTokens:countTokens(text,'o200k_base')}));
