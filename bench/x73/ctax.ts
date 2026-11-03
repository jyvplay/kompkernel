/**
 * X73 probe 11 — where does the frontier's message actually spend its tokens?
 * Splits every gated lane's winning message into contract and wire and counts each.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
let tc = 0, tw = 0;
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  const msg: string = r.message ?? ((r.contract ? r.contract + '\n' : '') + r.wire);
  const c: string = r.contract ?? '';
  const ct = c ? countTokens(c, enc) : 0;
  tc += ct; tw += r.messageTokens;
  console.log(`${path.basename(p).padEnd(24)} msg ${String(r.messageTokens).padStart(5)} contract ${String(ct).padStart(3)} wire ${String(r.messageTokens - ct).padStart(5)} parent ${r.parentCodec ?? r.parent}`);
  if (process.env.SHOW) console.log('   C:', JSON.stringify(c));
}
console.log(`TOTAL msg ${tw} contract ${tc} (${(100 * tc / tw).toFixed(1)}%)`);
