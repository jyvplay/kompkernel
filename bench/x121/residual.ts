/**
 * X121 — is the dictionary axis closed?
 *
 * For each shipped X120 wire, mine the RESIDUAL (the rendered tape + body text,
 * i.e. exactly the characters a reader sees) for substrings that would pay as
 * additional rules, price them with the live tokenizer, and greedily apply the
 * best ones. Reports
 *   · how much value is still on the table, and
 *   · how many free letters the wire's own script has left,
 * which together decide whether "more rules" is a real lever or a closed door.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, type ChironScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const src = process.argv[2] ?? 'bench/x120/receipts/ab-messages.jsonl';
const MAXCAND = Number(process.argv[3] ?? 20);
const rows = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

/** Local re-implementation of chiron.ts's private scriptPool (same rule: keep
 *  the code points of the script that cost exactly one token). */
const poolCache = new Map<string, string[]>();
function localPool(script: ChironScript): string[] {
  const key = script.name;
  const hit = poolCache.get(key); if (hit) return hit;
  const out: string[] = [];
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) {
    const ch = String.fromCodePoint(cp);
    if (countTokens(ch, enc) === 1) out.push(ch);
  }
  poolCache.set(key, out); return out;
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

function mine(text: string, minLen: number, maxLen: number, minFreq: number) {
  const n = text.length; const cnt = new Map<string, number>();
  for (let L = minLen; L <= maxLen; L++) {
    for (let i = 0; i + L <= n; i++) {
      const s = text.slice(i, i + L);
      cnt.set(s, (cnt.get(s) ?? 0) + 1);
    }
  }
  const out: Array<{ s: string; f: number }> = [];
  for (const [s, f] of cnt) if (f >= minFreq) out.push({ s, f });
  return out;
}

const results: any[] = [];
let grandGain = 0, grandTotal = 0;
for (const r of rows) {
  const m: string = r.message;
  const s0 = m.indexOf(CHIRON_START);
  const p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const pt = parseTape(tape);
  if (!pt) continue;
  const pool = localPool(pt.script);
  const free = pool.length - pt.glyphs.length;
  let text = tape + '\u0000' + body;           // sentinel keeps tape/body apart
  const base = countTokens(text, enc);
  let gain = 0; const steps: any[] = [];
  for (let it = 0; it < MAXCAND; it++) {
    const cands = mine(text, 2, 40, 2);
    let best: { s: string; f: number; v: number; g: number } | null = null;
    for (const c of cands) {
      if (c.s.includes('\u0000')) continue;
      const v = countTokens(c.s, enc);
      if (v < 1) continue;
      const g = (c.f - 1) * v - (v + 1);
      if (g > 0 && (!best || g > best.g)) best = { s: c.s, f: c.f, v, g };
    }
    if (!best) break;
    // exact check on the whole residual: replace every occurrence by a fresh glyph
    const probe = pool[pt.glyphs.length + it];
    if (probe === undefined) { steps.push({ note: 'POOL EXHAUSTED' }); break; }
    const after = text.split(best.s).join(probe);
    const before = countTokens(text, enc), post = countTokens(after, enc);
    const real = before - post - (countTokens(probe + best.s, enc)); // minus the tape entry
    if (real <= 0) { steps.push({ s: best.s, f: best.f, est: best.g, real, kept: false }); break; }
    text = after; gain += real;
    steps.push({ s: best.s, f: best.f, est: best.g, real, kept: true });
  }
  grandGain += gain; grandTotal += countTokens(m, enc);
  results.push({ path: r.path, total: countTokens(m, enc), rules: pt.glyphs.length, pool: pool.length,
    free, gained: gain, steps: steps.slice(0, 6) });
}
console.log(JSON.stringify(results.map(({ steps, ...r }) => r), null, 1));
console.log('TOTAL residual-rule value', grandGain, 'on', grandTotal, 'tokens =', (grandGain / grandTotal * 100).toFixed(2) + '%');
for (const r of results) if (r.steps.length) console.log(r.path, JSON.stringify(r.steps.slice(0, 4)));
