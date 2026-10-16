import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironDecoderPrompt } from '@/lib/omega/chiron';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const d: any = daedalusDualEncode(text, enc);
  const full = chironDecoderPrompt(d.wire);
  const tail = full.slice(d.wire.length);
  console.log('===', f, 'msg', d.messageTokens, 'wireTok', d.outTokens, 'contract', d.contractTokens);
  console.log('CONTRACT:', JSON.stringify(tail));
  const L = 'Cyrillic';
  const cands: Record<string,string> = {
    A: `New ${L} letter before ¶ starts a rule to the next new ${L} letter or ¶; after ¶ expand recursively; print the expansion.`,
    B: `New ${L} letter = rule running to the next new ${L} letter or ¶; after ¶ expand recursively; print the expansion.`,
    C: `New ${L} letters start rules ending at the next new one or ¶; after ¶ expand recursively; print the expansion.`,
    D: `Rules: new ${L} letter = text to next new ${L} letter or ¶. After ¶ expand; print expansion.`,
    E: `Expand: new ${L} letter = rule to next new ${L} letter or ¶; print the expansion of the text after ¶.`,
    F: `New ${L} letter starts a rule to the next new one or ¶; expand after ¶; print the expansion.`,
    G: `Each new ${L} letter defines a rule to the next new letter or ¶; expand after ¶; print the expansion.`,
  };
  for (const [k, c] of Object.entries(cands)) console.log(' ', k, String(countTokens(c, enc)).padStart(3), c);
}
