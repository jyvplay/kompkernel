import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironDecoderPrompt, chironOpsUsed } from '@/lib/omega/chiron';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const d: any = daedalusEncode(text, enc);
  const l: any = lakonikosEncode(text, enc);
  console.log('=== ' + f);
  console.log('DAEDALUS message head/contract:');
  console.log(JSON.stringify(d.decoderPrompt.slice(0, 300)));
  console.log('ops:', JSON.stringify(chironOpsUsed(d.wire)));
  console.log('contract tok:', countTokens(d.decoderPrompt, enc), 'wire tok:', countTokens(d.wire, enc), 'msg:', d.messageTokens);
  console.log('LAKONIKOS note:', l.notes, 'msg:', l.messageTokens);
  console.log('LAKONIKOS message head:', JSON.stringify(String(l.decoderPrompt ?? '').slice(0, 300)));
}
