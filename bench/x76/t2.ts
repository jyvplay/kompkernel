/** X76 / t2 — what does the frontier emit on a lane it actually compresses? */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  const lines = r.message.split('\n');
  console.log(`\n===== ${p} raw ${t.length}ch ${r.messageTokens} tok parent=${r.parentCodec} arm=${r.arm} lines=${lines.length}`);
  console.log('--- first 3 source lines ---');
  t.split('\n').slice(0, 3).forEach((l) => console.log('  S|', JSON.stringify(l.slice(0, 110))));
  console.log('--- first 6 message lines ---');
  lines.slice(0, 6).forEach((l) => console.log('  M|', JSON.stringify(l.slice(0, 130))));
  console.log('--- last 3 message lines ---');
  lines.slice(-3).forEach((l) => console.log('  M|', JSON.stringify(l.slice(0, 130))));
}
