// z56: AKOLOUTHIA eligibility with a TWO-term rule (the encoder requires only lines i-1 and i-2; the reader's
// rule is identical). Same contract, same gates (exact expansion, DAEDALUS round trip, one-chat M < plain).
import fs from 'node:fs';
import { akolouthiaExpand, AKOLOUTHIA_MARK, AKOLOUTHIA_CONTRACT } from '@/lib/omega/akolouthia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { countTokensExact } from '@/lib/omega/bpe';
export function twoTermSub(text: string): { out: string; marks: number } {
  const lines = text.split('\n');
  const nums = lines.map(l => [...l.matchAll(/[0-9]+/g)].map(m => ({ s: m[0], v: Number(m[0]), at: m.index ?? 0 })));
  let marks = 0;
  const out = lines.map((line, i) => {
    if (i < 2 || !nums[i].length) return line;
    const edits: { at: number; len: number }[] = [];
    for (let k = 0; k < nums[i].length && k < nums[i - 1].length && k < nums[i - 2].length; k++) {
      const a = nums[i - 1][k], b = nums[i - 2][k];
      const s = a.v - b.v; if (s === 0) continue;
      if (String(a.v) !== a.s || String(b.v) !== b.s) continue;
      const want = String(a.v + s); if (want !== nums[i][k].s || want.length > 15) continue;
      edits.push({ at: nums[i][k].at, len: nums[i][k].s.length }); marks++;
    }
    let r = line; for (const e of edits.reverse()) r = r.slice(0, e.at) + AKOLOUTHIA_MARK + r.slice(e.at + e.len);
    return r;
  });
  return { out: out.join('\n'), marks };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes(AKOLOUTHIA_MARK)) { console.log(JSON.stringify({ lane: f, skip: 'marker in input' })); continue; }
  const plain = daedalusEncode(t, 'o200k_base').messageTokens;
  const s = twoTermSub(t);
  const back = akolouthiaExpand(s.out) === t;
  const d = daedalusEncode(s.out, 'o200k_base');
  const exact = back && daedalusDecode(d.wire) === s.out;
  const M = countTokensExact(AKOLOUTHIA_CONTRACT + '\n' + d.decoderPrompt, 'o200k_base');
  console.log(JSON.stringify({ lane: f.split('/').pop(), plain, twoTermM: M, delta: M - plain, marks: s.marks, exact, identityWins: M >= plain }));
}
