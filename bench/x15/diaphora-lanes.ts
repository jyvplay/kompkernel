// X15: DIAPHORA on lanes. One JSON line per lane: arm, one-chat M, identity M, exact round trip
// (diaphoraDecode(wire) === input, and the library reader on the arm used), subs count, wall time.
import fs from 'node:fs';
import { diaphoraEncode, diaphoraDecode } from '@/lib/omega/diaphora';

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = diaphoraEncode(text, 'o200k_base');
  const exact = diaphoraDecode(r.wire) === text;
  console.log(JSON.stringify({
    file: f, raw: text.length, arm: r.arm, subs: r.subs, M: r.messageTokens,
    identityM: r.arm === 'identity' ? r.messageTokens : Number(/vs identity (\d+)/.exec(r.notes)?.[1] ?? NaN),
    exact, ms_wall: Date.now() - t0,
  }));
}
