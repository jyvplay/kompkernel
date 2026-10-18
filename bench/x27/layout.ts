/**
 * X27 probe 7: GLYPH LAYOUT OPTIMIZATION.
 *
 * econ.ts found the thing every earlier turn missed. In o200k_base ADJACENT
 * GLYPHS MERGE INTO ONE TOKEN -- the body tokenized to {"ених"} (three glyphs,
 * one token) and {"әм"} (two glyphs, one token). So a glyph's cost is not ~1
 * token; it is ~1 when isolated and ~1/k when it sits in a run of k. Earlier
 * turns modelled a flat 0.801 tokens per occurrence, which is the average of a
 * bimodal distribution and hides the entire effect.
 *
 * Consequence: WHICH pool character stands for WHICH phrase changes the wire
 * cost, because it decides which glyph pairs are adjacent in real text and
 * therefore which runs the tokenizer can swallow. The rule SET is fixed by the
 * parent; only the assignment is free. That is a pure relabelling -- it cannot
 * affect correctness (chironParseTape only needs distinct glyphs) but it can
 * change the token count.
 *
 * This probe hill-climbs the assignment on the exact objective, T(tape)+T(body).
 */
import fs from 'node:fs';
import { symplokeEncode, symplokeDecode } from '@/lib/omega/symploke';
import { chironParseTape, chironDecode, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const files = (process.env.F || '').split(',').filter(Boolean);
const ROUNDS = Number(process.env.ROUNDS || 60);

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const r = symplokeEncode(text, enc);
  const wire = r.wire;
  if (!wire.startsWith(CHIRON_START)) { console.log(f.split('/').pop(), 'no tape'); continue; }
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  const sc = scriptOfChar(tape[0])!;
  const rules = chironParseTape(tape, sc)!;
  const origGlyphs = rules.map((x) => x.glyph);
  // the free pool: every glyph of this script not already in the payload
  const payloadChars = new Set(text);
  // same definition chiron.ts uses: every codepoint in the script whose
  // standalone cost is exactly one token, minus anything in the payload.
  const pool: string[] = [];
  for (const [a, b] of (sc as any).ranges ?? [[(sc as any).lo, (sc as any).hi]]) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!payloadChars.has(ch) && T(ch) === 1) pool.push(ch);
    }
  }
  if (pool.length < origGlyphs.length) { console.log(f.split('/').pop(), 'pool too small'); continue; }

  // Rebuild the wire from an arbitrary assignment: the raws may reference other
  // glyphs, so substitute symbolically via a placeholder alphabet first.
  const PH = pool.slice(0, origGlyphs.length);          // canonical slot alphabet
  const wireOf = (assign: string[]) => {
    const map = new Map<string, string>();
    origGlyphs.forEach((g, i) => map.set(g, assign[i]));
    const conv = (s: string) => [...s].map((c) => map.get(c) ?? c).join('');
    const nt = rules.map((ru, i) => assign[i] + conv(ru.raw)).join('');
    return CHIRON_START + nt + CHIRON_SEP + conv(body);
  };

  // start from the parent's own assignment so the search can only improve it
  let assign = origGlyphs.slice();
  const start = T(wireOf(assign));
  let cur = start;
  if (Math.abs(start - T(wire)) > 0) console.log('  WARNING start != wire', start, T(wire));
  const free = pool.slice(0, Math.min(pool.length, origGlyphs.length + 24));
  for (let round = 0; round < ROUNDS; round++) {
    let improved = false;
    for (let i = 0; i < assign.length; i++) {
      for (const c of free) {
        if (assign[i] === c || assign.includes(c)) continue;
        const old = assign[i];
        assign[i] = c;
        const tok = T(wireOf(assign));
        if (tok < cur) { cur = tok; improved = true; }
        else assign[i] = old;
      }
    }
    if (!improved) break;
  }
  const newWire = wireOf(assign);
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  let ok = false;
  try { ok = symplokeDecode(newWire, { stats: r.stats, order: r.order, undo }) === text; } catch { /* noop */ }
  const newMsg = r.messageTokens - T(wire) + cur;
  console.log(f.split('/').pop()!.padEnd(38),
    'msg', String(r.messageTokens).padStart(5), '->', String(newMsg).padStart(5),
    '| delta', String(newMsg - r.messageTokens).padStart(5),
    '| wire', String(T(wire)).padStart(5), '->', String(cur).padStart(5),
    '| rules', String(rules.length).padStart(3), 'pool', String(free.length).padStart(3),
    '| exact', ok);
}
