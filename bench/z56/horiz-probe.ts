// z56: HORIZONTAL arithmetic predictor probe (gross). For each number slot k >= 3 within a line,
// value = a + (a - b) where a, b are the previous two slots in the same line and c = b - (b - c) holds
// (three-term run in the line). Marker "⁼". Vertical marker "⁺" from AKOLOUTHIA is applied first on
// the same slot if it fires (vertical wins). Measures DAEDALUS one-chat M, substituted vs plain.
import fs from 'node:fs';
import { akolouthiaSubstitute } from '@/lib/omega/akolouthia';
import { daedalusEncode } from '@/lib/omega/daedalus';
export function horizSub(text: string): { out: string; hits: number } {
  const v = akolouthiaSubstitute(text).out; // vertical marks first
  const hits0 = 0;
  const lines = v.split('\n');
  let hits = hits0;
  const out = lines.map(line => {
    // slots = digit runs or ⁺ markers; use only digit runs with numeric value; markers break runs
    const re = /[0-9]+|⁺/g;
    const ms = [...line.matchAll(re)];
    const vals: (number | null)[] = ms.map(m => (m[0] === '⁺' ? null : Number(m[0])));
    let res = line; const edits: { at: number; len: number }[] = [];
    for (let k = 3; k < ms.length; k++) {
      const a = vals[k - 1], b = vals[k - 2], c = vals[k - 3];
      if (a == null || b == null || c == null) continue;
      const s = a - b; if (s === 0 || b - c !== s) continue;
      if (ms[k][0] === '⁺') continue;
      const want = String(a + s);
      if (want !== ms[k][0] || want.length > 15) continue;
      edits.push({ at: ms[k].index ?? 0, len: ms[k][0].length }); hits++;
    }
    for (const e of edits.reverse()) res = res.slice(0, e.at) + '⁼' + res.slice(e.at + e.len);
    return res;
  });
  return { out: out.join('\n'), hits };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes('⁼')) { console.log(JSON.stringify({ lane: f, skip: 'marker in input' })); continue; }
  const h = horizSub(t);
  const a = akolouthiaSubstitute(t).out;
  const m0 = daedalusEncode(t, 'o200k_base').messageTokens;
  const mv = daedalusEncode(a, 'o200k_base').messageTokens;
  const mh = daedalusEncode(h.out, 'o200k_base').messageTokens;
  console.log(JSON.stringify({ lane: f.split('/').pop(), plain: m0, vertical: mv, vert_plus_horiz: mh, horizHits: h.hits, gross_horiz_over_vert: mh - mv }));
}
