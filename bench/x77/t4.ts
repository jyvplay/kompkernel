import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const r: any = tagstackFrontier(fs.readFileSync(p, 'utf8'), enc);
  console.log(`\n########## ${p.split('/').pop()} parent=${r.parentCodec} tok=${r.messageTokens} ##########`);
  console.log(r.message.split('\n').slice(0, 26).join('\n'));
}
