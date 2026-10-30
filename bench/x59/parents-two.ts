import * as fs from 'node:fs';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC='o200k_base' as const;
for (const path of process.argv.slice(2)) {
  const text=fs.readFileSync(path,'utf8');
  const out:any={path, chars:text.length, raw:countTokens(text,ENC), legs:[]};
  for (const [name,enc] of [['daedalus',daedalusEncode],['akolouthia2',akolouthia2Encode]] as const) {
    const s=Date.now(); const r:any=(enc as any)(text,ENC);
    out.legs.push({codec:name,tokens:r.messageTokens,exact:r.exact&&r.decoded===text,ms:Date.now()-s});
  }
  console.log(JSON.stringify(out));
}
