/**
 * X26: SECOND-LEVEL GRAMMAR on the post-grammar body.
 *
 * POLYTROPOS builds its rules from the RAW text, so every rule is a literal
 * substring of the source. But the BODY it emits is a different object: a
 * mixture of surviving source characters and glyphs. Adjacent-glyph pairs like
 * "енихя" are common in it, and a rule whose expansion is two other glyphs is
 * NOT a substring the raw-text search can name -- it only exists after the
 * first pass.
 *
 * So the question is whether a second grammar level pays. The candidate moves:
 *   (a) merge an adjacent glyph PAIR Z -> XY, costing 3 tape tokens, saving
 *       M per occurrence where M ~ 0.80 is the measured marginal glyph cost;
 *   (b) merge longer glyph runs.
 *
 * Both are measured on the real rendered body, and the search stops when the
 * exact total stops improving.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const POOL: string[] = [];
for (let c = 0x0410; c < 0x0450; c++) POOL.push(String.fromCodePoint(c));
for (let c = 0x0370; c < 0x0400; c++) POOL.push(String.fromCodePoint(c));
for (let c = 0x05d0; c < 0x05eb; c++) POOL.push(String.fromCodePoint(c));

const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
console.log('lane'.padEnd(38), 'wire'.padStart(6), 'body'.padStart(6), 'glyphRuns'.padStart(10),
  '| L2 best'.padStart(9), 'rules'.padStart(6), 'gain'.padStart(6));
let TW = 0, TG = 0;
for (let i = 0; i < lanes.length; i++) {
  const r: any = polytroposEncode(fs.readFileSync(lanes[i], 'utf8'), enc);
  const wire = String(r.wire);
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  // glyphs = chars in the pool
  const glyphs = new Set(Array.from(tape).filter((c) => POOL.includes(c)));
  // count maximal runs of >=2 glyphs in the body
  let runs = 0;
  for (let k = 0; k < body.length; ) {
    if (glyphs.has(body[k])) { let j = k; while (j < body.length && glyphs.has(body[j])) j++; if (j - k >= 2) runs++; k = j; }
    else k++;
  }
  if (!runs) continue;
  const base = T(wire);
  // greedy: repeatedly merge the most frequent adjacent glyph PAIR
  let cur = body, curTape = tape, best = base, added = 0;
  const newRules: string[] = [];
  for (let step = 0; step < 40 && newRules.length < POOL.length; step++) {
    const cnt = new Map<string, number>();
    for (let k = 0; k + 1 < cur.length; k++) {
      const a = cur[k], b = cur[k + 1];
      if (glyphs.has(a) && glyphs.has(b)) { const key = a + b; cnt.set(key, (cnt.get(key) ?? 0) + 1); }
    }
    let bk: string | null = null, bn = 0;
    for (const [k, n] of cnt) if (n > bn) { bn = n; bk = k; }
    if (!bk || bn < 2) break;
    const g = POOL[POOL.length - 1 - newRules.length];
    if (glyphs.has(g)) break;
    const out = cur.split(bk).join(g);
    const nt = curTape + g + bk;
    const v = T(CHIRON_START + nt + CHIRON_SEP + out);
    if (v >= best) break;
    best = v; cur = out; curTape = nt; newRules.push(g); glyphs.add(g); added++;
  }
  TW += base; TG += base - best;
  console.log(lanes[i].split('/').pop()!.padEnd(38), String(base).padStart(6), String(T(body)).padStart(6),
    String(runs).padStart(10), '|', String(best).padStart(8), String(added).padStart(6), String(base - best).padStart(6));
}
console.log('\nTOTAL wire', TW, '| second-level gain', TG);
