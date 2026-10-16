import fs from 'node:fs';
import { henosisEncode } from '@/lib/omega/henosis';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = henosisEncode(text, enc);
  console.log(JSON.stringify({ file: f, arm: r.arm, M: r.messageTokens, armAlone: r.armTokens, inTok: r.inTokens,
    exact: r.exact && r.decoded === text, savedVsIdentity: r.inTokens - r.messageTokens,
    arms: r.arms.map(a => [a.arm, a.messageTokens, a.messageTokensBefore, a.exact && a.applied]) , notes: r.notes }));
}
