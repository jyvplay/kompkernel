/**
 * X121 — ALLOGRAPHOS feasibility probe.
 *
 * One rule currently has exactly one glyph. The body therefore spells a given
 * rule the same way at every occurrence, and SEQUOYAH's tabu search can only
 * pick ONE character per rule — it cannot satisfy two different neighbourhoods
 * at once. But the wire language already lets a rule's text be a reference to an
 * earlier rule, so `gA g1` in the tape declares gA as a second name for g1 at
 * the cost of two characters and ZERO contract tokens (the reader already
 * expands repeatedly).
 *
 * That makes the glyph at an occurrence a free per-position choice. This probe
 * measures the size of that prize: for every glyph occurrence in the body, the
 * marginal tokenizer cost of the character actually used, against the cheapest
 * character in the same script, in the same local window.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, type ChironScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const W = Number(process.argv[3] ?? 10);
const rows = fs.readFileSync(process.argv[2] ?? 'bench/x120/receipts/ab-messages.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

const poolCache = new Map<string, string[]>();
function localPool(script: ChironScript): string[] {
  const hit = poolCache.get(script.name); if (hit) return hit;
  const out: string[] = [];
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) {
    const ch = String.fromCodePoint(cp);
    if (countTokens(ch, enc) === 1) out.push(ch);
  }
  poolCache.set(script.name, out); return out;
}
function scriptOf(cp: number) {
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}
function parseTape(tape: string) {
  const first = tape.codePointAt(0);
  const script = first === undefined ? null : scriptOf(first);
  if (!script) return null;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const used = new Set<string>(); const glyphs: string[] = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i];
    if (!inScript(g) || used.has(g)) return null;
    used.add(g); glyphs.push(g);
    let j = i + 1;
    while (j < tape.length && !(inScript(tape[j]) && !used.has(tape[j]))) j++;
    i = j;
  }
  return { script, glyphs, used };
}

let grand = 0, grandSites = 0, grandImprove = 0;
for (const r of rows) {
  const m: string = r.message;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const pt = parseTape(tape);
  if (!pt) continue;
  const pool = localPool(pt.script);
  const free = pool.filter((c) => !pt.used.has(c));
  let headroom = 0, sites = 0, improving = 0;
  const hist: Record<string, number> = {};
  for (let i = 0; i < body.length; i++) {
    const g = body[i];
    if (!pt.used.has(g)) continue;
    sites++;
    const L = body.slice(Math.max(0, i - W), i);
    const R = body.slice(i + 1, i + 1 + W);
    const cur = countTokens(L + g + R, enc);
    let best = cur, bestChar = g;
    for (const c of free) {
      const t = countTokens(L + c + R, enc);
      if (t < best) { best = t; bestChar = c; }
    }
    const d = cur - best;
    if (d > 0) { headroom += d; improving++; }
    const key = String(d); hist[key] = (hist[key] ?? 0) + 1;
  }
  grand += headroom; grandSites += sites; grandImprove += improving;
  console.log(`${r.path.padEnd(46)} sites=${String(sites).padStart(4)} improving=${String(improving).padStart(4)} headroom=${String(headroom).padStart(4)} free=${free.length} hist=${JSON.stringify(hist)}`);
}
console.log('TOTAL headroom', grand, 'over', grandSites, 'glyph sites; improving sites', grandImprove);
