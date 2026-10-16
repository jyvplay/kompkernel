// X20: SIGE and HENOSIS on one lane: arm table + winner.
import fs from 'node:fs';
import { sigeEncode } from '@/lib/omega/sige';
import { henosisEncode } from '@/lib/omega/henosis';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const s = sigeEncode(text, enc);
  console.log(JSON.stringify({ file: f, sige: s.messageTokens, sigeOld: s.messageTokensOld, changed: s.changed, missed: s.missed, exact: s.exact && s.decoded === text }));
  const h = henosisEncode(text, enc);
  console.log(JSON.stringify({ file: f, winner: h.arm, M: h.messageTokens, baseM: h.baseM, arms: h.arms.map(a => [a.arm, a.messageTokens, a.saved, a.verified]), notes: h.notes.slice(0, 200) }));
}
