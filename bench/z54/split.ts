// z54: where does the frontier's one-chat M go? contract vs wire vs raw, per lane (DAEDALUS, exact).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r: any = daedalusEncode(text, enc);
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: r.inTokens, M: r.messageTokens, wire: r.outTokens, contract: r.contractTokens, exact: r.exact, mode: r.mode, arm: r.winningArm, chars: text.length, ms: Date.now() - t0 }));
}
