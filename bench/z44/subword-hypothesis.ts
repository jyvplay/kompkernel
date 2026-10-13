// Z44 hypothesis test: is there a sub-word (character-level) dictionary win on NON-LATIN prose?
// The stack rejected character-level candidates on a measurement over English/code lanes only
// (DAEDALUS report D.4: 4918 candidates, 7 tokens). Non-Latin prose was never in that set.
import fs from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';

const GLYPHS = '丁七万千上下中文字保存削除文書保持期間决定承継作成時点解決変更後対象含完全消去適用継';
const files = (process.env.FILES ?? '').split(',').filter(Boolean);
const enc: EncodingName = 'o200k_base';

function countNgrams(s: string, min: number, max: number) {
  const m = new Map<string, number>();
  for (let n = min; n <= max; n++) {
    for (let i = 0; i + n <= s.length; i++) {
      const g = s.slice(i, i + n);
      if (/\s/.test(g)) continue;
      m.set(g, (m.get(g) ?? 0) + 1);
    }
  }
  return m;
}

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, enc);
  let cur = text;
  let dict: string[] = [];
  let gi = 0;
  let best = raw;
  const dictTok = () => dict.reduce((a, d) => a + countTokens(d, enc) + 3, 0);
  for (let step = 0; step < 40; step++) {
    const ng = countNgrams(cur, 4, 18);
    let pick: string | null = null, pickGain = 0;
    for (const [g, c] of ng) {
      if (c < 3) continue;
      const gt = countTokens(g, enc);
      if (gt < 2) continue;
      const save = (c - 1) * (gt - 1) - (gt + 3);
      if (save > pickGain) { pickGain = save; pick = g; }
    }
    if (!pick) break;
    const before = countTokens(cur, enc) + dictTok();
    const trial = cur.split(pick).join(GLYPHS[gi] ?? '◆');
    const after = countTokens(trial, enc) + dictTok() + countTokens(pick, enc) + 3;
    if (after >= before) break;
    cur = trial; dict.push(pick); gi++;
    best = after;
  }
  console.log(`${f.split('/').pop()}: raw=${raw} framed=${best} rules=${dict.length} gain=${raw - best} (${(100 * (raw - best) / raw).toFixed(1)}%)`);
  if (dict.length) console.log(`    dict: ${dict.slice(0, 12).join(' | ')}`);
}
