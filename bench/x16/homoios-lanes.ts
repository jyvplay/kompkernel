// X16: HOMOIOS on lanes. One JSON line per file: arm, one-chat M, identity M (DAEDALUS-D plain),
// substitutions, exactness of the end-to-end reader (homoiosDecode(wire) === input), wall ms.
import fs from 'node:fs';
import { homoiosEncode, homoiosDecode } from '@/lib/omega/homoios';

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = homoiosEncode(text, 'o200k_base');
  const exact = homoiosDecode(r.wire) === text;
  const identityM = r.arm === 'identity' ? r.messageTokens : Number(/vs identity (\d+)/.exec(r.notes)?.[1] ?? NaN);
  console.log(JSON.stringify({ file: f, raw: text.length, arm: r.arm, subs: r.subs, M: r.messageTokens, identityM, exact, notes: r.notes, ms: Date.now() - t0 }));
}
