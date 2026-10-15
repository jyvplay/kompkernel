// z56: token-priced selection of AKOLOUTHIA marks (gross, DAEDALUS message, no contract change).
// Eligibility is exactly AKOLOUTHIA's three-term rule. A mark is kept only if it lowers the o200k count of its
// line (given the marks already kept in that line). The reader rule is unchanged, so any subset is decodable.
import fs from 'node:fs';
import { akolouthiaSubstitute, akolouthiaExpand, AKOLOUTHIA_MARK } from '@/lib/omega/akolouthia';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { countTokensExact } from '@/lib/omega/bpe';
export function selectMarks(text: string): string {
  const full = akolouthiaSubstitute(text).out.split('\n');
  const orig = text.split('\n');
  // per line: which slots got a mark in the full substitution = positions where full has ⁺ and orig has digits
  const out: string[] = [];
  for (let i = 0; i < orig.length; i++) {
    const want = full[i];
    if (want === orig[i]) { out.push(orig[i]); continue; }
    // rebuild by applying marks one at a time, keeping only those that lower the line's token count
    const idx: number[] = []; // char positions of ⁺ in `want`
    for (let p = 0; p < want.length; p++) if (want[p] === AKOLOUTHIA_MARK) idx.push(p);
    // map each ⁺ to the digit run it replaces in orig[i] (in order of occurrence)
    const runs = [...orig[i].matchAll(/[0-9]+/g)];
    const slots = idx.map((_, k) => runs[k]); // marks replace digit runs in order of appearance, one-for-one
    let cur = orig[i]; let curCount = countTokensExact(cur, 'o200k_base');
    // build a line where marker k is applied iff accepted; process in order
    let chosen = orig[i];
    const markerAt = new Set<number>();
    for (let k = 0; k < slots.length; k++) {
      const r = slots[k]; if (!r) continue;
      // candidate: current line with run k replaced by ⁺ (earlier accepted marks already applied)
      const build = (applied: Set<number>) => {
        let s = ''; let last = 0;
        for (let q = 0; q < runs.length; q++) {
          const m = runs[q];
          s += orig[i].slice(last, m.index ?? 0);
          s += applied.has(q) ? AKOLOUTHIA_MARK : m[0];
          last = (m.index ?? 0) + m[0].length;
        }
        return s + orig[i].slice(last);
      };
      const withK = new Set([...markerAt, k]);
      const cand = build(withK); const cc = countTokensExact(cand, 'o200k_base');
      if (cc < curCount) { markerAt.add(k); curCount = cc; }
    }
    // final line
    let s = ''; let last = 0;
    for (let q = 0; q < runs.length; q++) {
      const m = runs[q];
      s += orig[i].slice(last, m.index ?? 0);
      s += markerAt.has(q) ? AKOLOUTHIA_MARK : m[0];
      last = (m.index ?? 0) + m[0].length;
    }
    out.push(s + orig[i].slice(last));
  }
  return out.join('\n');
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.includes(AKOLOUTHIA_MARK)) { console.log(JSON.stringify({ lane: f, skip: 'marker in input' })); continue; }
  const sel = selectMarks(t);
  const plain = daedalusEncode(t, 'o200k_base').messageTokens;
  const full = daedalusEncode(akolouthiaSubstitute(t).out, 'o200k_base').messageTokens;
  const dsel = daedalusEncode(sel, 'o200k_base');
  const exact = akolouthiaExpand(sel) === t && daedalusDecode(dsel.wire) === sel;
  const marksSel = (sel.match(new RegExp(AKOLOUTHIA_MARK, 'g')) ?? []).length;
  console.log(JSON.stringify({ lane: f.split('/').pop(), plain, allMarks: full, selected: dsel.messageTokens, marksSel, exact }));
}
