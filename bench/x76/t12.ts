import * as fs from 'node:fs';
import { pinaxEncode } from '../../src/lib/omega/pinax';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r = pinaxEncode(t, enc, tagstackEncode as any);
  const b: any = tagstackEncode(t, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} x74 ${String(b.messageTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} (${r.messageTokens - b.messageTokens >= 0 ? '+' : ''}${r.messageTokens - b.messageTokens}) applied ${String(r.applied).padEnd(5)} exact ${r.decoded === t} :: ${r.notes.slice(0, 70)}`);
}
