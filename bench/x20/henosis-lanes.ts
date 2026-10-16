// X20: HENOSIS per lane, one process per lane; rows appended to a JSONL by the shell wrapper.
import fs from 'node:fs';
import { henosisEncode } from '@/lib/omega/henosis';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = henosisEncode(text, enc);
  console.log(JSON.stringify({
    file: f, arm: r.arm, M: r.messageTokens, armAlone: r.armTokens, inTok: r.inTokens,
    exact: r.exact && r.decoded === text,
    arms: r.arms.map(a => ({ arm: a.arm, M: a.messageTokens, before: a.messageTokensBefore, saved: a.saved, ok: a.exact && a.applied, note: a.note })),
    notes: r.notes,
  }));
}
