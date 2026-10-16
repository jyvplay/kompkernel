// X13: HORA vs plain DAEDALUS on real text. OMEGA_DET=1. One-chat M (o200k), both measured here.
import fs from 'node:fs';
import { horaEncode, horaDecode, horaSubstitute } from '@/lib/omega/hora';
import { daedalusEncode } from '@/lib/omega/daedalus';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const identityM = daedalusEncode(text, 'o200k_base').messageTokens;   // plain DAEDALUS, original text
  const r = horaEncode(text, 'o200k_base');
  const back = horaDecode(r.wire, r.arm);
  console.log(JSON.stringify({
    lane: f, marks: horaSubstitute(text).marks, arm: r.arm, identityM, horaM: r.messageTokens,
    delta: r.messageTokens - identityM, exact: back === text && r.exact, note: r.notes,
  }));
}
