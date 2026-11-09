/**
 * X91 — IS THE GLYPH ASSIGNMENT SATURATED?
 *
 * The accounting harness said 638 adjacent glyph pairs across 10 committed frontier
 * wires do NOT merge into one token, i.e. 638 tokens of apparent headroom. But
 * METATHESIS (X27) already hill-climbs exactly this objective with pairwise swaps
 * and random restarts, and HEURESIS (X31) widens the script-tries budget. So the
 * honest question is not "is there headroom" but "is the shipped search SATURATED".
 *
 * Test: re-run a swap hill-climb OFFLINE on the committed wire, scoring the REAL
 * re-rendered message with the REAL tokenizer, exactly as METATHESIS does. If the
 * committed wire is a local optimum under swaps, the direction is dead and the 638
 * is an unachievable upper bound. If it improves, the shipped search is leaving
 * tokens on the table.
 *
 * Also fixes the earlier usage accounting: a glyph referenced only from INSIDE
 * another entry's value is used (the tape is a straight-line program expanded to a
 * fixed point), so counting body references alone over-reports dead entries.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);

interface Wire { head: string; tape: string; body: string; entries: { g: string; v: string }[] }

function parse(w: string): Wire {
  const sec = w.indexOf('§');
  const pil = sec >= 0 ? w.indexOf('¶', sec) : -1;
  if (sec < 0 || pil < 0) return { head: w, tape: '', body: '', entries: [] };
  const head = w.slice(0, sec);
  const tape = w.slice(sec, pil);
  const body = w.slice(pil + 1);
  const seen = new Set<string>(['§']);
  const entries: { g: string; v: string }[] = [];
  let cur: { g: string; v: string } | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; entries.push(cur); }
    else if (cur) cur.v += ch;
  }
  return { head, tape, body, entries };
}

/** candidate pool: every non-ascii char that appears anywhere, plus the scripts the stack uses */
const POOL_EXTRA = 'абвгдежзийклмнопрстуфхцчшщъыьэюяєіїґёўқғҳҫҷӡөүҧԁԂԃԄԅԆԇԈԉԊԋԌԍԎԏაბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰსწარმეოთიუვხქღყშჩცძწჭ';

function rerender(w: Wire, phi: Map<string, string>): string {
  // apply the permutation to tape glyphs, nested references inside values, and the body
  const map = (s: string) => [...s].map(c => phi.get(c) ?? c).join('');
  const tape = '§' + w.entries.map(e => phi.get(e.g)! + map(e.v)).join('');
  return w.head + tape + '¶' + map(w.body);
}

function hillClimb(w: Wire, restarts: number, seed: number) {
  const glyphs = w.entries.map(e => e.g);
  let best: string[] = glyphs.slice();
  let bestCost = ct(rerender(w, new Map(glyphs.map((g, i) => [g, g]))));
  let s = seed >>> 0;
  const rnd = (n: number) => { s = (s * 1664525 + 1013904223) >>> 0; return s % n; };
  for (let r = 0; r <= restarts; r++) {
    const cur = best.slice();
    if (r > 0) { for (let k = 0; k < 3; k++) { const i = rnd(cur.length), j = rnd(cur.length); [cur[i], cur[j]] = [cur[j], cur[i]]; } }
    let curCost = r === 0 ? bestCost : ct(rerender(w, new Map(glyphs.map((g, i) => [g, cur[i]]))));
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) {
        [cur[i], cur[j]] = [cur[j], cur[i]];
        const c = ct(rerender(w, new Map(glyphs.map((g, k) => [g, cur[k]]))));
        if (c < curCost) { curCost = c; improved = true; } else { [cur[i], cur[j]] = [cur[j], cur[i]]; }
      }
    }
    if (curCost < bestCost) { bestCost = curCost; best = cur.slice(); }
  }
  return { cost: bestCost, phi: new Map(glyphs.map((g, i) => [g, best[i]])) };
}

const files = process.argv.slice(2);
console.log('lane'.padEnd(14), 'shipped  relabelled  Δ   entries  dead  1use  nested-only  glyphCol');
let T = { shipped: 0, best: 0, entries: 0, dead: 0, one: 0, nested: 0, gcol: 0 };
for (const f of files) {
  const w = parse(fs.readFileSync(f, 'utf8'));
  if (!w.entries.length) { console.log(f.split('/').pop(), 'NO TAPE'); continue; }
  const shipped = ct(w.head + w.tape + '¶' + w.body);
  // nesting-aware usage
  const bodyRefs = new Map<string, number>();
  for (const ch of w.body) if (ch.codePointAt(0)! > 127) bodyRefs.set(ch, (bodyRefs.get(ch) ?? 0) + 1);
  const nestedRefs = new Map<string, number>();
  for (const e of w.entries) for (const ch of e.v) if (ch.codePointAt(0)! > 127 && ch !== e.g) nestedRefs.set(ch, (nestedRefs.get(ch) ?? 0) + 1);
  const dead = w.entries.filter(e => !bodyRefs.has(e.g) && !nestedRefs.has(e.g)).length;
  const one = w.entries.filter(e => (bodyRefs.get(e.g) ?? 0) + (nestedRefs.get(e.g) ?? 0) === 1).length;
  const nestedOnly = w.entries.filter(e => !bodyRefs.has(e.g) && nestedRefs.has(e.g)).length;
  // real glyph-column cost: tape minus values-only
  const valuesOnly = w.entries.map(e => e.v).join('');
  const gcol = ct(w.tape) - ct(valuesOnly);
  const { cost } = hillClimb(w, 2, 0x5eed91);
  const d = cost - shipped;
  console.log(f.split('/').pop()!.replace('.wire.txt', '').padEnd(14),
    String(shipped).padStart(7), String(cost).padStart(11), String(d).padStart(4),
    String(w.entries.length).padStart(8), String(dead).padStart(5), String(one).padStart(6),
    String(nestedOnly).padStart(12), String(gcol).padStart(9));
  T.shipped += shipped; T.best += cost; T.entries += w.entries.length; T.dead += dead; T.one += one; T.nested += nestedOnly; T.gcol += gcol;
}
console.log('-'.repeat(92));
console.log('TOTAL'.padEnd(14), String(T.shipped).padStart(7), String(T.best).padStart(11), String(T.best - T.shipped).padStart(4),
  String(T.entries).padStart(8), String(T.dead).padStart(5), String(T.one).padStart(6), String(T.nested).padStart(12), String(T.gcol).padStart(9));
console.log(`\nrelabel hill-climb on the SHIPPED wire recovers ${T.shipped - T.best} tokens over ${files.length} lanes.`);
console.log(`truly dead entries (0 body refs AND 0 nested refs): ${T.dead} of ${T.entries}`);
console.log(`glyph column, measured as ct(tape) - ct(values): ${T.gcol} tokens`);
