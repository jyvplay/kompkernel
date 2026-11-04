import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, 'o200k_base' as any);
  console.log(`===== ${p}  tokens=${r.messageTokens} parent=${r.parentCodec} arm=${r.arm} note=${(r.notes||'').slice(0,200)}`);
  console.log(r.message.length > 2500 ? r.message.slice(0, 2500) + '\n...[truncated]' : r.message);
}
