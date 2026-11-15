/**
 * X115 screen 2: residual NONTERMINAL introduction over the shipped wire.
 * Reads completed baseline messages (no encoder calls). For each CHIRON frame,
 * tries adding one fresh tape rule whose value is a repeated adjacent pair of
 * existing rule glyphs, replacing that pair in the body. Prices the COMPLETE
 * message and verifies chironDecode(candidate) === chironDecode(incumbent).
 * This is a screen, not a shipped codec.
 */
import * as fs from 'node:fs';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const src = process.argv[2] ?? 'bench/x115/receipts/frontier.jsonl';
const lines = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean);
const rows: any[] = [];
for (const line of lines) {
  const r = JSON.parse(line);
  const m: string = r.message;
  const start = m.indexOf(CHIRON_START);
  if (start < 0) { rows.push({ path: r.path, tokens: r.tokens, note: 'no frame' }); continue; }
  const cut = m.indexOf(CHIRON_SEP, start + 1);
  if (cut < 0) { rows.push({ path: r.path, tokens: r.tokens, note: 'no sep' }); continue; }
  const tape = m.slice(start + 1, cut);
  const body = m.slice(cut + 1);
  const first = tape[0];
  const script = CHIRON_SCRIPTS.find(s => first && chironInScript(s, first.codePointAt(0)!));
  if (!script) { rows.push({ path: r.path, tokens: r.tokens, note: 'no script' }); continue; }
  const used = new Set<string>();
  for (const ch of tape) if (chironInScript(script, ch.codePointAt(0)!)) used.add(ch);
  // free glyphs: in script, absent from whole message, single token
  const free: string[] = [];
  const ranges = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  for (const [lo, hi] of ranges) {
    for (let cp = lo; cp < hi && free.length < 8; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!m.includes(ch) && encodeIds(ch, enc).length === 1) free.push(ch);
    }
    if (free.length >= 8) break;
  }
  if (!free.length) { rows.push({ path: r.path, tokens: r.tokens, note: 'no free glyph' }); continue; }
  // count adjacent pairs of used glyphs in body
  const counts = new Map<string, number>();
  const chars = [...body];
  for (let i = 0; i + 1 < chars.length; i++) {
    const a = chars[i]!, b = chars[i + 1]!;
    if (used.has(a) && used.has(b)) counts.set(a + b, (counts.get(a + b) ?? 0) + 1);
  }
  const pairs = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12);
  let best: any = null;
  const incExp = chironDecode(m.slice(start));
  for (const [pair, n] of pairs) {
    const g = free[0]!;
    const newTape = tape + g + pair;
    const newBody = body.split(pair).join(g);
    const wire = CHIRON_START + newTape + CHIRON_SEP + newBody;
    const cand = m.slice(0, start) + wire;
    const tok = T(cand);
    let exact = false;
    try { exact = chironDecode(wire) === incExp; } catch { exact = false; }
    if (exact && tok < r.tokens && (!best || tok < best.tokens)) best = { pair, n, tokens: tok, delta: tok - r.tokens, exact };
  }
  rows.push({ path: r.path, tokens: r.tokens, pairs: pairs.length, best });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${r.tokens} pairs=${pairs.length} best=${best ? `${best.tokens} (${best.delta}) pair=${best.pair} n=${best.n} exact=${best.exact}` : 'none'}`);
}
const wins = rows.filter(r => r.best);
const totalBase = rows.reduce((a, r) => a + r.tokens, 0);
const totalBest = rows.reduce((a, r) => a + (r.best ? r.best.tokens : r.tokens), 0);
console.log(`TOTAL base ${totalBase} best ${totalBest} delta ${totalBest - totalBase} wins ${wins.length}/${rows.length}`);
fs.mkdirSync('bench/x115/receipts', { recursive: true });
fs.writeFileSync('bench/x115/receipts/screen2.json', JSON.stringify({ schema: 'kompkernel-x115-screen2-v1', note: 'residual glyph-pair nonterminal screen on baseline messages; no encoder calls', totals: { base: totalBase, best: totalBest, delta: totalBest - totalBase, wins: wins.length }, rows }, null, 2) + '\n');
