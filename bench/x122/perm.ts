/** X122 — is the shipped rule→glyph assignment locally optimal?
 *  Pure re-labelling: rewrites every glyph character in tape+body through a
 *  permutation. The expanded text is bit-identical, so any gain is free. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const BUDGET = Number(process.env.PERM_BUDGET ?? 6000);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
let rng = 0x2f6e2b1;
const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
function pool(script: ChironScript): string[] {
  const out: string[] = []; const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (countTokens(ch, enc) === 1) out.push(ch); }
  return out;
}
for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const prefix = m.slice(0, s0 + 1), tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  if (!script) continue;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const glyphs: string[] = []; const gset = new Set<string>(); let i = 0;
  while (i < tape.length) { const g = tape[i]!; glyphs.push(g); gset.add(g); let j = i + 1; while (j < tape.length && !(inScript(tape[j]!) && !gset.has(tape[j]!))) j++; i = j; }
  const POOL = pool(script).filter((c) => !gset.has(c) || true);
  const avail = POOL.slice(0, Math.max(glyphs.length + 6, Math.min(POOL.length, glyphs.length + 40)));
  if (avail.length < glyphs.length) { console.log(`${p}: pool too small ${avail.length} < ${glyphs.length}`); continue; }
  // assign[i] = character currently standing for rule i
  let assign = glyphs.slice();
  const render = () => {
    const m1 = new Map<string, string>();
    for (let k = 0; k < glyphs.length; k++) m1.set(glyphs[k]!, assign[k]!);
    const rw = (s: string) => { let o = ''; for (const ch of s) o += m1.get(ch) ?? ch; return o; };
    return prefix + rw(tape) + CHIRON_SEP + rw(body);
  };
  const base = countTokens(m, enc);
  let cur = countTokens(render(), enc);
  let best = cur, bestAssign = assign.slice();
  let evals = 1;
  while (evals < BUDGET) {
    const a = (rnd() * assign.length) | 0, b = (rnd() * avail.length) | 0;
    const nc = avail[b]!;
    if (assign.includes(nc)) continue;
    const old = assign[a]!; assign[a] = nc;
    const t = countTokens(render(), enc); evals++;
    if (t < cur) { cur = t; if (t < best) { best = t; bestAssign = assign.slice(); } }
    else assign[a] = old;
  }
  // verify the best wire still decodes identically
  assign = bestAssign;
  const m1 = new Map<string, string>();
  for (let k = 0; k < glyphs.length; k++) m1.set(glyphs[k]!, assign[k]!);
  const rw = (s: string) => { let o = ''; for (const ch of s) o += m1.get(ch) ?? ch; return o; };
  const wire = prefix + rw(tape) + CHIRON_SEP + rw(body);
  let ok = false; try { ok = chironDecode(m.slice(s0)) === chironDecode(wire.slice(wire.indexOf(CHIRON_START))); } catch { ok = false; }
  console.log(`${p.split('/').pop()!.padEnd(16)} base ${base} -> ${best} Δ ${best - base} (evals ${evals}, pool ${avail.length}, decode-ok ${ok})`);
}
