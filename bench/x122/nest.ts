/**
 * X122 — DAG-SLP over the finished tape: does letting rule VALUES reference
 * glyphs that the miner never created actually pay?
 *
 * bench/x121/residual.ts mined the rendered residual for new substrings and
 * reported 0. It broke out of its loop on the first candidate whose *real*
 * measured delta was <= 0, and it priced a new tape entry as
 * countTokens(glyph + value) with the glyph appended at the END of the pool.
 * This instrument differs in three ways, each of them testable:
 *   1. candidates are ranked by measured gain on the WHOLE wire, not by an
 *      estimate, and a failing candidate does not stop the search;
 *   2. the new rule is inserted at the FRONT of the tape (so every other value
 *      may use it) with a glyph character that occurs nowhere in the wire;
 *   3. the result is checked against `chironDecode`, not just token-counted.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const ROUNDS = Number(process.argv[3] ?? '6');
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l); msgs.set(r.path, r.message);
}
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
function parseTape(tape: string) {
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  if (!script) return null;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const used = new Set<string>(); const out: Array<{ g: string; raw: string }> = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i]!; if (!inScript(g) || used.has(g)) return null;
    used.add(g); let j = i + 1;
    while (j < tape.length && !(inScript(tape[j]!) && !used.has(tape[j]!))) j++;
    out.push({ g, raw: tape.slice(i + 1, j) }); i = j;
  }
  return { script, rules: out, used };
}
function pool(script: ChironScript, wire: string, used: Set<string>): string[] {
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  const out: string[] = [];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) {
    const ch = String.fromCodePoint(cp);
    if (used.has(ch) || wire.includes(ch)) continue;
    if (countTokens(ch, enc) === 1) out.push(ch);
  }
  return out;
}

for (const p of lanes) {
  const m0 = msgs.get(p); if (m0 === undefined) continue;
  const s0 = m0.indexOf(CHIRON_START), p0 = s0 >= 0 ? m0.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const pt0 = parseTape(m0.slice(s0 + 1, p0)); if (!pt0) continue;
  const want = chironDecode(m0.slice(s0));
  const free = pool(pt0.script, m0, pt0.used);
  let wire = m0, gained = 0; const log: string[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    const si = wire.indexOf(CHIRON_START), pi = wire.indexOf(CHIRON_SEP, si + 1);
    const pt = parseTape(wire.slice(si + 1, pi)); if (!pt) break;
    const body = wire.slice(pi + 1);
    const glyphs = new Set(pt.rules.map((r) => r.g));
    // count substrings over (tape values) + (body), skipping anything containing a glyph
    const texts = pt.rules.map((r) => r.raw).concat([body]);
    const occ = new Map<string, number>();
    for (const t of texts) for (let L = 2; L <= 24; L++) for (let i = 0; i + L <= t.length; i++) {
      const s = t.slice(i, i + L);
      if ([...s].some((c) => glyphs.has(c))) continue;
      occ.set(s, (occ.get(s) ?? 0) + 1);
    }
    const cands: Array<{ s: string; f: number }> = [];
    for (const [s, f] of occ) if (f >= 3) cands.push({ s, f });
    cands.sort((a, b) => (b.f - 1) * b.s.length - (a.f - 1) * a.s.length);
    let bestGain = 0, bestWire = '', bestS = '';
    const gch = free[round];
    if (gch === undefined) break;
    const base = countTokens(wire, enc);
    for (const c of cands.slice(0, 400)) {
      const newTape = gch + c.s + pt.rules.map((r) => r.g + r.raw.split(c.s).join(gch)).join('');
      const newBody = body.split(c.s).join(gch);
      const cand = wire.slice(0, si + 1) + newTape + CHIRON_SEP + newBody;
      if (chironDecode(cand.slice(si)) !== want) continue;
      const t = countTokens(cand, enc);
      if (base - t > bestGain) { bestGain = base - t; bestWire = cand; bestS = c.s; }
    }
    if (bestGain <= 0) { log.push(`round ${round}: nothing pays`); break; }
    wire = bestWire; gained += bestGain;
    log.push(`round ${round}: +${bestGain} via ${JSON.stringify(bestS)} -> ${base - bestGain}`);
  }
  console.log(`${p}\n  shipped ${countTokens(m0, enc)} -> ${countTokens(wire, enc)}  (gain ${gained})`);
  for (const l of log) console.log('   ', l);
}
