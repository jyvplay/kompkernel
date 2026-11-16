/** X122 — the tape's rule ORDER is free: chironDecode expands "k=v repeatedly",
 *  so no reader depends on it, and the tape's 119 values are adjacent in whatever
 *  order we emit them. Adjacency decides how the 296 tokens of literal content
 *  merge. Hill-climb the order against the LIVE counter. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const BUDGET = Number(process.env.BUDGET ?? 8000);
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
  const base = countTokens(m, enc);
  let order = rules.map((_, k) => k);
  const render = (o: number[]) => { let t = ''; for (const k of o) t += rules[k]!.g + rules[k]!.v; return head + t + tail; };
  let cur = countTokens(render(order), enc); let best = cur, bestO = order.slice();
  for (let e = 0; e < BUDGET; e++) {
    const a = (rnd() * order.length) | 0; let b = (rnd() * order.length) | 0; if (a === b) continue;
    const t = order[a]!; order[a] = order[b]!; order[b] = t;
    const v = countTokens(render(order), enc);
    if (v <= cur) { cur = v; if (v < best) { best = v; bestO = order.slice(); } }
    else { const u = order[a]!; order[a] = order[b]!; order[b] = u; }
  }
  const wire = render(bestO);
  let ok = false; try { ok = chironDecode(m.slice(s0)) === chironDecode(wire.slice(wire.indexOf(CHIRON_START))); } catch { ok = false; }
  console.log(`${p.split('/').pop()!.padEnd(16)} base ${base} -> ${best} Δ ${best - base} (rules ${rules.length}, exact ${ok})`);
}
