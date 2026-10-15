// z56: KEYED progression probe (gross). A digit run is a slot. Its KEY is the maximal run of
// non-space, non-digit characters immediately before it (e.g. 'x="', 'id=', 'W', ''), plus j = the
// occurrence index of that key within the line. The slot is marked ⁺ when the same (key,j) slot in
// line i-1 and i-2 and i-3 form an equal-step run (the three-term gate). Decoder rule (the reader):
// value = v(i-1, key, j) + (v(i-1,key,j) - v(i-2,key,j)). Measures DAEDALUS one-chat M of the marked text.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
export function keyedSub(text: string): { out: string; marks: number } {
  const lines = text.split('\n');
  type Slot = { key: string; j: number; s: string; v: number; at: number };
  const slotsOf = (line: string): Slot[] => {
    const out: Slot[] = []; const seen = new Map<string, number>();
    for (const m of line.matchAll(/[0-9]+/g)) {
      const at = m.index ?? 0;
      let b = at; while (b > 0 && !/[\s0-9]/.test(line[b - 1])) b--;
      const key = line.slice(b, at);
      const j = seen.get(key) ?? 0; seen.set(key, j + 1);
      out.push({ key, j, s: m[0], v: Number(m[0]), at });
    }
    return out;
  };
  const slots = lines.map(slotsOf);
  const find = (sl: Slot[], key: string, j: number) => sl.find(x => x.key === key && x.j === j);
  let marks = 0;
  const out = lines.map((line, i) => {
    if (i < 3) return line;
    const cur = slots[i]; const edits: { at: number; len: number }[] = [];
    for (const c of cur) {
      const a = find(slots[i - 1], c.key, c.j), b = find(slots[i - 2], c.key, c.j), d = find(slots[i - 3], c.key, c.j);
      if (!a || !b || !d) continue;
      const s = a.v - b.v; if (s === 0 || b.v - d.v !== s) continue;
      if (String(a.v) !== a.s || String(b.v) !== b.s || String(d.v) !== d.s) continue;
      const want = String(a.v + s); if (want !== c.s || want.length > 15) continue;
      edits.push({ at: c.at, len: c.s.length }); marks++;
    }
    let r = line; for (const e of edits.reverse()) r = r.slice(0, e.at) + '⁺' + r.slice(e.at + e.len);
    return r;
  });
  return { out: out.join('\n'), marks };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes('⁺')) { console.log(JSON.stringify({ lane: f, skip: 'marker in input' })); continue; }
  const k = keyedSub(t);
  const m0 = daedalusEncode(t, 'o200k_base').messageTokens;
  const m1 = daedalusEncode(k.out, 'o200k_base').messageTokens;
  console.log(JSON.stringify({ lane: f.split('/').pop(), plain: m0, keyed: m1, marks: k.marks, gross: m1 - m0 }));
}
