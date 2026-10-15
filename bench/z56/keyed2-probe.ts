// z56: KEYED addressing with the TWO-term eligibility (decoder identical to ONOMASIA). Gross (no contract) and
// one-chat with the 29-token keyed contract. Compare to positional two-term (twoterm-probe) on the same lanes.
import fs from 'node:fs';
import { onomasiaExpand, ONOMASIA_MARK } from '@/lib/omega/onomasia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { countTokensExact } from '@/lib/omega/bpe';
const KEYED = '⁺ = the number after the same key in the line above, plus the change from two lines above (key = text just before it).';
function keyBefore(line: string, at: number) { let b = at; while (b > 0 && line[b - 1] !== ' ' && !(line[b - 1] >= '0' && line[b - 1] <= '9')) b--; return line.slice(b, at); }
export function keyed2Sub(text: string): { out: string; marks: number } {
  const lines = text.split('\n');
  type S = { key: string; j: number; s: string; v: number; at: number };
  const slots = lines.map(line => { const seen = new Map<string, number>(); return [...line.matchAll(/[0-9]+/g)].map(m => { const at = m.index ?? 0; const key = keyBefore(line, at); const j = seen.get(key) ?? 0; seen.set(key, j + 1); return { key, j, s: m[0], v: Number(m[0]), at } as S; }); });
  const find = (sl: S[], key: string, j: number) => sl.find(x => x.key === key && x.j === j);
  let marks = 0;
  const out = lines.map((line, i) => {
    if (i < 2) return line;
    const edits: { at: number; len: number }[] = [];
    for (const c of slots[i]) {
      const a = find(slots[i - 1], c.key, c.j), b = find(slots[i - 2], c.key, c.j);
      if (!a || !b) continue;
      const s = a.v - b.v; if (s === 0) continue;
      if (String(a.v) !== a.s || String(b.v) !== b.s) continue;
      const want = String(a.v + s); if (want !== c.s || want.length > 15) continue;
      edits.push({ at: c.at, len: c.s.length }); marks++;
    }
    let r = line; for (const e of edits.reverse()) r = r.slice(0, e.at) + ONOMASIA_MARK + r.slice(e.at + e.len);
    return r;
  });
  return { out: out.join('\n'), marks };
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes(ONOMASIA_MARK)) { console.log(JSON.stringify({ lane: f, skip: 'marker in input' })); continue; }
  const plain = daedalusEncode(t, 'o200k_base').messageTokens;
  const s = keyed2Sub(t);
  const exact = onomasiaExpand(s.out) === t;
  const d = daedalusEncode(s.out, 'o200k_base');
  const ok = exact && daedalusDecode(d.wire) === s.out;
  const M = countTokensExact(KEYED + '\n' + d.decoderPrompt, 'o200k_base');
  console.log(JSON.stringify({ lane: f.split('/').pop(), plain, keyed2M: M, delta: M - plain, marks: s.marks, exact: ok }));
}
