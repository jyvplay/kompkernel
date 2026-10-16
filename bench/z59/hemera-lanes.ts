// X14: HEMERA on real lanes. One JSON line per lane: arm chosen, one-chat M, identity M,
// exact end-to-end round trip (hemeraDecode(wire, arm) === input), and wall time.
// Run under OMEGA_DET=1. Each lane is one hemeraEncode call (identity + up to two arms).
import fs from 'node:fs';
import { hemeraEncode, hemeraDecode } from '@/lib/omega/hemera';

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = hemeraEncode(text, 'o200k_base');
  const exact = hemeraDecode(r.wire, r.arm) === text;
  // identity M: for the identity arm it is M itself; for a delta arm it is in the notes string
  // ("... vs identity <n>"), written by hemeraEncode from its own plain DAEDALUS run.
  const m = /vs identity (\d+)/.exec(r.notes);
  const identityM = r.arm === 'identity' ? r.messageTokens : (m ? Number(m[1]) : null);
  console.log(JSON.stringify({
    file: f, raw: text.length, arm: r.arm, days: r.days, ms: r.ms,
    M: r.messageTokens, identityM, delta: identityM === null ? null : r.messageTokens - identityM,
    exact, ms_wall: Date.now() - t0, notes: r.notes,
  }));
}
