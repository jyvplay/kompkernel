import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { stigmeEncode } from '../../src/lib/omega/stigme';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now(); const f: any = tagstackEncode(text, enc); const fms = Date.now() - t0;
  const t1 = Date.now(); const s: any = stigmeEncode(text, enc); const sms = Date.now() - t1;
  console.error(`${p}\n  raw ${countTokens(text, enc)} | frontier ${f.messageTokens} (${fms}ms) | stigme ${s.messageTokens} (${sms}ms) arm=${s.arm} [${s.notes}]\n  => ${s.messageTokens < f.messageTokens ? 'STIGME WINS ' + (f.messageTokens - s.messageTokens) : 'frontier wins ' + (s.messageTokens - f.messageTokens)}`);
}
