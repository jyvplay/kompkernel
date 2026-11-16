/** X122 — deterministic local search over the free relabellings of a CHIRON tape.
 *  State = (serialization order of the rules, rule -> glyph bijection).
 *  Neighbourhood = all order transpositions + all glyph transpositions + all
 *  glyph reassignments from the free pool. Full sweeps to a local optimum.
 *  Every accepted state is checked by the REAL parser and the REAL decoder. */
import * as fs from 'node:fs';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode, chironParseTape } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const PASSES = Number(process.env.PASSES ?? 14);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
let sumBase = 0, sumBest = 0;
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
  const oidx = new Map<string, number>(); rules.forEach((r, k) => oidx.set(r.g, k));
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  const pool: string[] = [];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (encodeIds(ch, enc).length === 1) pool.push(ch); }
  const elsewhere = new Set<string>();
  for (const ch of head) elsewhere.add(ch);
  for (const ch of tail) if (!oidx.has(ch)) elsewhere.add(ch);
  for (const r of rules) for (const ch of r.v) if (!oidx.has(ch)) elsewhere.add(ch);
  const glyphOf = rules.map((r) => r.g);
  let freePool = pool.filter((c) => !oidx.has(c) && !elsewhere.has(c));
  const val = (o: number[]) => { let v = ''; for (const c of rules[o]!.v) { const r = oidx.get(c); v += r === undefined ? c : glyphOf[r]!; } return v; };
  const tapeStr = (o: number[]) => { let t = ''; for (const k of o) t += glyphOf[k]! + val(k); return t; };
  const bodyStr = () => { let out = ''; for (const ch of tail) { const r = oidx.get(ch); out += r === undefined ? ch : glyphOf[r]!; } return out; };
  const render = (o: number[]) => head + tapeStr(o) + bodyStr();
  const valid = (o: number[]) => {
    const ts = tapeStr(o);
    if (!ts.length) return false;
    const sc = scriptOf(ts.codePointAt(0)!); if (!sc) return false;
    const pr = chironParseTape(ts, sc);
    if (pr === null || pr.length !== n) return false;
    for (let k = 0; k < n; k++) { const ex = { glyph: glyphOf[o[k]!]!, raw: val(o[k]!) }; if (pr[k]!.glyph !== ex.glyph || pr[k]!.raw !== ex.raw) return false; }
    return true;
  };
  const cost = (o: number[]) => (valid(o) ? countTokens(render(o), enc) : Infinity);
  let order = rules.map((_, k) => k);
  let cur = countTokens(m, enc); const base = cur;
  for (let pass = 0; pass < PASSES; pass++) {
    let improved = false;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const t = order[a]!; order[a] = order[b]!; order[b] = t;
      const v = cost(order);
      if (v < cur) { cur = v; improved = true; } else { const u = order[a]!; order[a] = order[b]!; order[b] = u; }
    }
    // MOVE a rule to another position: valid far more often than a transposition
    // when the dependency DAG is dense, and it is what unlocks the search.
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (a === b) continue;
      const x = order.splice(a, 1)[0]!; order.splice(b, 0, x);
      const v = cost(order);
      if (v < cur) { cur = v; improved = true; } else { order.splice(b, 1); order.splice(a, 0, x); }
    }
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const ga = glyphOf[a]!, gb = glyphOf[b]!; glyphOf[a] = gb; glyphOf[b] = ga;
      const v = cost(order);
      if (v < cur) { cur = v; improved = true; } else { glyphOf[a] = ga; glyphOf[b] = gb; }
    }
    for (let a = 0; a < n && freePool.length; a++) {
      for (let fi = 0; fi < freePool.length; fi++) {
        const og = glyphOf[a]!, nc = freePool[fi]!;
        glyphOf[a] = nc; freePool[fi] = og;
        const v = cost(order);
        if (v < cur) { cur = v; improved = true; break; } else { glyphOf[a] = og; freePool[fi] = nc; }
      }
    }
    if (!improved) break;
  }
  const wire = render(order);
  let ok = false; try { ok = chironDecode(m.slice(s0)) === chironDecode(wire.slice(wire.indexOf(CHIRON_START))); } catch { ok = false; }
  console.log(`${p.split('/').pop()!.padEnd(16)} base ${base} -> ${cur} Δ ${cur - base} (rules ${n}, free ${freePool.length}, exact ${ok})`);
  sumBase += base; sumBest += ok ? cur : base;
  if (ok && cur < base) fs.writeFileSync('bench/x122/opt-' + p.split('/').pop() + '.txt', wire);
}
console.log(`TOTAL ${sumBase} -> ${sumBest} Δ ${sumBest - sumBase}`);
