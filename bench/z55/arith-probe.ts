// z55: arithmetic-progression probe. Replace the k-th integer of a line by a marker when it equals
// the k-th integer of the previous line plus the step seen between the two previous lines (step 1 if none).
// Measures the DAEDALUS message tokens of the substituted text vs the raw text. Not a codec yet: no contract, no decode.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';

const MARK = '⁺';
const INT = /\d+/g;

function ints(line: string): { v: number; s: string; at: number }[] {
  const out: { v: number; s: string; at: number }[] = [];
  for (const m of line.matchAll(INT)) out.push({ v: Number(m[0]), s: m[0], at: m.index ?? 0 });
  return out;
}

export function progressionSubst(text: string): { out: string; hits: number; cells: number } {
  // A marker is allowed only when the three previous lines form an arithmetic run at this integer position:
  // a = L[i-3][k], b = L[i-2][k], c = L[i-1][k], b-a = c-b = s != 0, and the current value is c + s.
  const lines = text.split('\n');
  const parsed = lines.map(ints);
  let hits = 0, cells = 0;
  const outLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = parsed[i];
    let line = lines[i];
    const p1 = i >= 1 ? parsed[i - 1] : undefined;
    const p2 = i >= 2 ? parsed[i - 2] : undefined;
    const p3 = i >= 3 ? parsed[i - 3] : undefined;
    if (p1 && p2 && p3 && cur.length) {
      const edits: { at: number; len: number; rep: string }[] = [];
      for (let k = 0; k < cur.length && k < p1.length && k < p2.length && k < p3.length; k++) {
        cells++;
        const s = p1[k].v - p2[k].v;
        if (s === 0 || p2[k].v - p3[k].v !== s) continue;
        if (String(p1[k].v + s) === cur[k].s && p1[k].s === String(p1[k].v) && p2[k].s === String(p2[k].v) && p3[k].s === String(p3[k].v)) {
          edits.push({ at: cur[k].at, len: cur[k].s.length, rep: MARK });
          hits++;
        }
      }
      for (const e of edits.reverse()) line = line.slice(0, e.at) + e.rep + line.slice(e.at + e.len);
    }
    outLines.push(line);
  }
  return { out: outLines.join('\n'), hits, cells };
}

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const { out, hits, cells } = progressionSubst(text);
  const raw = daedalusEncode(text, 'o200k_base').messageTokens;
  const sub = daedalusEncode(out, 'o200k_base').messageTokens;
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: raw, substituted: sub, delta: sub - raw, hits, numericCells: cells, markerInInput: text.includes(MARK), rawTokensPlain: countTokens(text, 'o200k_base') }));
}
