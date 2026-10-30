import * as fs from 'node:fs';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { countTokens } from '../../src/lib/omega/bpe';
for (const path of process.argv.slice(2)) { const text=fs.readFileSync(path,'utf8'); const s=Date.now(); const r:any=akolouthia2Encode(text,'o200k_base'); console.log(JSON.stringify({path,raw:countTokens(text,'o200k_base'),ako2:r.messageTokens,exact:r.exact&&r.decoded===text,ms:Date.now()-s})); }
