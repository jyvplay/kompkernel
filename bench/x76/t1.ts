/** X76 / t1 — what does the frontier ACTUALLY emit? Full message, small lanes. */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  console.log(`\n===== ${p} raw ${t.length}ch -> ${r.messageTokens} tok  parent=${r.parentCodec} arm=${r.arm}`);
  console.log('--- SOURCE ---');
  console.log(JSON.stringify(t.slice(0, 300)));
  console.log('--- MESSAGE ---');
  console.log(JSON.stringify(r.message.slice(0, 700)));
}
