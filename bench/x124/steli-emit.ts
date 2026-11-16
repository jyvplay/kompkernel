/** Emit the ΣΤΉΛΗ fixture: the complete message and the parent-decoded text. */
import * as fs from 'node:fs';
import { steliEncode } from '../../src/lib/omega/steli';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const [p, tag] of [['bench/holdout-x42/findmnt.txt', 'findmnt'], ['bench/holdout-x42/dpkg-l.txt', 'dpkgl']] as const) {
  const src = fs.readFileSync(p, 'utf8');
  const r = steliEncode(src, enc, { inner: (t: string, e: any) => tagstackEncode(t, e) });
  if (!r.applied) { console.log(tag, 'not applied', r.notes); continue; }
  const parentOut = r.message.split('\n').slice(1).join('\n');   // placeholder, replaced below
  void parentOut;
  // the parent-decoded (depadded) text is what the parent reader returns
  const decodedParent = (r as any).frontier ? (r as any).frontier.decoded : '';
  fs.writeFileSync(`bench/x124/receipts/steli-${tag}.message.txt`, r.message);
  fs.writeFileSync(`bench/x124/receipts/steli-${tag}.parent.txt`, decodedParent);
  console.log(`${tag}: message ${countTokens(r.message, enc)} tok, ${r.message.length} chars; parent-out ${decodedParent.length} chars; undo-of-parent-out === source: ${decodedParent === '' ? 'n/a' : ''}`);
}
