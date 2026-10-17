import fs from 'node:fs';
import { stigmeEncode } from '@/lib/omega/stigme';
import { morpheEncode } from '@/lib/omega/morphe';
let A = 0, B = 0, I = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const s = stigmeEncode(t, 'o200k_base');
  const m = morpheEncode(t, 'o200k_base');
  const base = s.identityTokens;
  console.log(`${f.split('/').pop()!.padEnd(20)} ident ${String(base).padStart(5)}  STIGME ${String(s.messageTokens).padStart(5)}  MORPHE ${String(m.messageTokens).padStart(5)}   delta ${String(m.messageTokens - s.messageTokens).padStart(5)}   rules=[${m.rules.join('+')}]`);
  I += base; A += s.messageTokens; B += m.messageTokens;
}
console.log(`TOTAL  ident ${I}  STIGME ${A}  MORPHE ${B}   MORPHE-STIGME ${B - A}   vs identity ${B - I}`);
