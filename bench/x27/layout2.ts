/**
 * X27 probe 10: layout search with SWAP moves, not just reassign-to-free.
 *
 * layout.ts only tried "replace rule i's glyph with an unused pool char", which
 * cannot explore the assignment lattice -- once every good char is taken, the
 * only improving move is an EXCHANGE between two rules. This probe adds swaps
 * and a few random restarts, and reports the best found.
 *
 * The relabelling is provably semantics-preserving: chironParseTape requires
 * only that glyphs be distinct and in-script, and the substitution rewrites
 * every occurrence (tape heads, nested references and body) consistently. So
 * the decode is byte exact for ANY assignment, and the search is free to roam.
 */
import fs from 'node:fs';
import { symplokeEncode, symplokeDecode } from '@/lib/omega/symploke';
import { chironParseTape, chironDecode, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

export function bestLayout(wire: string, text: string, restarts = Number(process.env.RESTARTS || 3)) {
  if (!wire.startsWith(CHIRON_START)) return null;
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  const sc = scriptOfChar(tape[0]);
  if (!sc) return null;
  const rules = chironParseTape(tape, sc);
  if (!rules) return null;
  const og = rules.map((x) => x.glyph);
  const payload = new Set(text);
  const pool: string[] = [];
  for (const [a, b] of ((sc as any).ranges ?? [[(sc as any).lo, (sc as any).hi]])) {
    for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (!payload.has(ch) && T(ch) === 1) pool.push(ch); }
  }
  const wireOf = (assign: string[]) => {
    const map = new Map<string, string>(); og.forEach((g, i) => map.set(g, assign[i]));
    const conv = (s: string) => [...s].map((c) => map.get(c) ?? c).join('');
    return CHIRON_START + rules.map((ru, i) => assign[i] + conv(ru.raw)).join('') + CHIRON_SEP + conv(body);
  };
  const spare = pool.length - og.length;
  const free = pool.slice(0, Math.min(pool.length, og.length + Math.min(spare, 30)));

  let best = og.slice(), bestTok = T(wireOf(best));
  let cur = best.slice(), curTok = bestTok;
  for (let restart = 0; restart < restarts; restart++) {
    if (restart > 0) {
      // perturb: shuffle a random window, then hill-climb again
      cur = best.slice();
      for (let k = 0; k < Math.max(2, Math.floor(cur.length / 3)); k++) {
        const i = Math.floor(Math.random() * cur.length);
        const j = Math.floor(Math.random() * free.length);
        if (!cur.includes(free[j])) cur[i] = free[j];
      }
      curTok = T(wireOf(cur));
      if (curTok >= bestTok) continue;
    }
    for (let round = 0; round < 40; round++) {
      let improved = false;
      // swap moves
      for (let i = 0; i < cur.length; i++) {
        for (let j = i + 1; j < cur.length; j++) {
          [cur[i], cur[j]] = [cur[j], cur[i]];
          const t = T(wireOf(cur));
          if (t < curTok) { curTok = t; improved = true; }
          else { [cur[i], cur[j]] = [cur[j], cur[i]]; }
        }
      }
      // reassign-to-free moves
      for (let i = 0; i < cur.length; i++) {
        for (const c of free) {
          if (cur[i] === c || cur.includes(c)) continue;
          const old = cur[i]; cur[i] = c;
          const t = T(wireOf(cur));
          if (t < curTok) { curTok = t; improved = true; } else cur[i] = old;
        }
      }
      if (!improved) break;
    }
    if (curTok < bestTok) { bestTok = curTok; best = cur.slice(); }
  }
  return { wire: wireOf(best), tokens: bestTok, base: T(wire), assign: best, rules: og.length, pool: pool.length };
}

if (true) {
  for (const f of (process.env.F || '').split(',').filter(Boolean)) {
    const text = fs.readFileSync(f, 'utf8');
    const r = symplokeEncode(text, enc);
    const t0 = Date.now();
    const b = bestLayout(r.wire, text);
    if (!b) { console.log(f.split('/').pop(), 'no tape'); continue; }
    const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
    let ok = false;
    try { ok = symplokeDecode(b.wire, { stats: r.stats, order: r.order, undo }) === text; } catch { /* noop */ }
    const newMsg = r.messageTokens - b.base + b.tokens;
    console.log(f.split('/').pop()!.padEnd(38), 'msg', String(r.messageTokens).padStart(5), '->', String(newMsg).padStart(5),
      '| delta', String(newMsg - r.messageTokens).padStart(5),
      '| wire', String(b.base).padStart(5), '->', String(b.tokens).padStart(5),
      '| rules', String(b.rules).padStart(3), '| exact', ok, '|', (Date.now() - t0) + 'ms');
  }
}
