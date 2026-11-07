import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const out: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const a: any = tagstackFrontier(S, enc);
  const b: any = tagstackFrontier(S, enc);
  const n = p.split('/').pop();
  console.log(`${n!.padEnd(22)} ${String(a.messageTokens).padStart(5)} ${String(b.messageTokens).padStart(5)} ${a.messageTokens === b.messageTokens ? 'stable' : 'UNSTABLE'}`);
  out.push({ lane: n, a: a.messageTokens, b: b.messageTokens });
}
fs.writeFileSync('bench/x81/receipts/front.json', JSON.stringify(out, null, 1) + '\n');
