/** X122 — joint search over the two free relabellings of a CHIRON tape.
 *
 *  (a) SERIALIZATION ORDER of the rules, constrained to orders the real parser
 *      accepts (chironParseTape re-cuts the tape at the first unseen in-script
 *      character, and chironDecode rejects a forward reference with `at >= upto`).
 *  (b) The rule -> GLYPH assignment, a bijection into the script's one-token pool.
 *
 *  Neither changes what the wire decodes to; both change what it COSTS, because
 *  the tape is delimiter-free and its glyphs double as token-boundary separators.
 *
 *  Everything is verified with the real decoder: `chironDecode(before) ===
 *  chironDecode(after)` must hold on the actual wire, not on a model of it. */
import * as fs from 'node:fs';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode, chironParseTape } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const BUDGET = Number(process.env.BUDGET ?? 120000);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
let rng = 0x9e3779b9; const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };

for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = m.indexOf(CHIRON_SEP, s0 + 1);
  if (s0 < 0 || p0 < 0) continue;
  const head = m.slice(0, s0 + 1), tape = m.slice(s0 + 1, p0), tail = m.slice(p0);
  const script = scriptOf(tape.codePointAt(0)!); if (!script) continue;
  const inS = (c: string) => chironInScript(script, c.codePointAt(0)!);
  const used = new Set<string>(); const rules: { g: string; v: string }[] = []; let i = 0;
  while (i < tape.length) { const g = tape[i]!; used.add(g); let j = i + 1; while (j < tape.length && !(inS(tape[j]!) && !used.has(tape[j]!))) j++; rules.push({ g, v: tape.slice(i + 1, j) }); i = j; }
  const n = rules.length;
  // oidx: ORIGINAL glyph -> rule id. The stored values and the body both speak in
  // original glyphs, so every re-render must translate through this, never through
  // a map keyed by the CURRENT glyphs.
  const oidx = new Map<string, number>(); rules.forEach((r, k) => oidx.set(r.g, k));
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  const pool: string[] = [];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (encodeIds(ch, enc).length === 1) pool.push(ch); }
  const elsewhere = new Set<string>();
  for (const ch of head) elsewhere.add(ch);
  for (const ch of tail) if (!oidx.has(ch)) elsewhere.add(ch);
  let glyphOf = rules.map((r) => r.g);                  // glyphOf[ruleId] = CURRENT glyph
  const freePool = pool.filter((c) => !oidx.has(c) && !elsewhere.has(c));
  const tapeStr = (o: number[]) => { let t = ''; for (const k of o) { let v = ''; for (const c of rules[k]!.v) { const r = oidx.get(c); v += r === undefined ? c : glyphOf[r]!; } t += glyphOf[k]! + v; } return t; };
  const bodyStr = () => { let out = ''; for (const ch of tail) { const r = oidx.get(ch); out += r === undefined ? ch : glyphOf[r]!; } return out; };
  const render = (o: number[]) => head + tapeStr(o) + bodyStr();
  const expected = (o: number[]) => o.map((k) => { let v = ''; for (const c of rules[k]!.v) { const r = oidx.get(c); v += r === undefined ? c : glyphOf[r]!; } return { glyph: glyphOf[k]!, raw: v }; });
  const valid = (o: number[]) => {
    const ts = tapeStr(o);
    if (!ts.length || !scriptOf(ts.codePointAt(0)!)) return false;
    const pr = chironParseTape(ts, scriptOf(ts.codePointAt(0)!)!);
    if (pr === null || pr.length !== n) return false;
    const ex = expected(o);
    for (let k = 0; k < n; k++) if (pr[k]!.glyph !== ex[k]!.glyph || pr[k]!.raw !== ex[k]!.raw) return false;
    return true;
  };
  let order = rules.map((_, k) => k);
  const base = countTokens(m, enc);
  let cur = base, best = base, bOrder = order.slice(), bGlyph = glyphOf.slice();
  for (let e = 0; e < BUDGET; e++) {
    const T = 2.2 * (1 - e / BUDGET) + 0.02;
    const kind = rnd();
    let undo: () => void;
    if (kind < 0.5) {
      const a = (rnd() * n) | 0, b = (rnd() * n) | 0; if (a === b) continue;
      const t = order[a]!; order[a] = order[b]!; order[b] = t;
      undo = () => { const u = order[a]!; order[a] = order[b]!; order[b] = u; };
    } else if (kind < 0.8) {
      const a = (rnd() * n) | 0, b = (rnd() * n) | 0; if (a === b) continue;
      const ga = glyphOf[a]!, gb = glyphOf[b]!;
      glyphOf[a] = gb; glyphOf[b] = ga;
      undo = () => { glyphOf[a] = ga; glyphOf[b] = gb; };
    } else {
      if (!freePool.length) continue;
      const a = (rnd() * n) | 0;
      const nc = freePool[(rnd() * freePool.length) | 0]!;
      const og = glyphOf[a]!; const fi = freePool.indexOf(nc);
      glyphOf[a] = nc; freePool[fi] = og;
      undo = () => { glyphOf[a] = og; freePool[fi] = nc; };
    }
    if (!valid(order)) { undo(); continue; }
    const v = countTokens(render(order), enc);
    if (v <= cur || rnd() < Math.exp(-(v - cur) / T)) {
      cur = v;
      if (v < best) { best = v; bOrder = order.slice(); bGlyph = glyphOf.slice(); }
    } else undo();
  }
  order = bOrder; glyphOf = bGlyph;
  const wire = render(order);
  let ok = false;
  try { ok = chironDecode(m.slice(s0)) === chironDecode(wire.slice(wire.indexOf(CHIRON_START))); } catch { ok = false; }
  console.log(`${p.split('/').pop()!.padEnd(16)} base ${base} -> ${best} Δ ${best - base} (rules ${n}, pool ${freePool.length}, evals ${BUDGET}, exact ${ok})`);
  if (ok && best < base) fs.writeFileSync('bench/x122/out-' + p.split('/').pop() + '.txt', wire);
}
