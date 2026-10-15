// z56: AKOLOUTHIA with a different marker character. Same rule, same gates (exact expansion, DAEDALUS round trip,
// one-chat M < plain). Only the marker and the contract's marker glyph change. Lanes where the marker is in the text are skipped.
import fs from 'node:fs';
import { akolouthiaSubstitute, akolouthiaExpand, AKOLOUTHIA_MARK } from '@/lib/omega/akolouthia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { countTokensExact } from '@/lib/omega/bpe';
const CONTRACT = (m: string) => `${m} = the number at the same position in the line above, plus the change from the line two above.`;
const markers = (process.env.MARKERS ?? '⁺,¤,×,~').split(',');
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const plain = daedalusEncode(t, 'o200k_base').messageTokens;
  const row: Record<string, unknown> = { lane: f.split('/').pop(), plain };
  for (const m of markers) {
    if (t.includes(m)) { row[m] = 'in-input'; continue; }
    const base = akolouthiaSubstitute(t).out.split(AKOLOUTHIA_MARK).join(m);
    const { marks } = akolouthiaSubstitute(t);
    if (!marks) { row[m] = 'no-marks'; continue; }
    // reader check on the substituted text with this marker
    const back = akolouthiaExpand(base.split(m).join(AKOLOUTHIA_MARK)) === t;
    const d = daedalusEncode(base, 'o200k_base');
    const exact = back && daedalusDecode(d.wire) === base;
    const M = countTokensExact(CONTRACT(m) + '\n' + d.decoderPrompt, 'o200k_base');
    row[m] = exact ? { M, delta: M - plain, marks } : 'INEXACT';
  }
  console.log(JSON.stringify(row));
}
