/**
 * X26: RePair as an alternative grammar CONSTRUCTION for the same wire format.
 *
 * POLYTROPOS finds rules by a greedy substring search under a time budget and
 * saturates (bench/x26/budget.ts: 7s and 150s give the identical wire), so the
 * mechanism is not budget-bound -- but the CONSTRUCTION is only one of many.
 *
 * RePair (Larsson & Moffat 1999) is the classic alternative: repeatedly take
 * the currently most frequent adjacent pair, give it a fresh symbol, and
 * replace every non-overlapping occurrence. Unlike a flat n-gram table it
 * builds a HIERARCHY -- a rule's expansion may reference earlier rules -- which
 * is exactly what CHIRON's tape supports (raws may reference earlier glyphs).
 *
 * This probe runs RePair over the token id sequence with the measured cost
 * model (a glyph costs M tokens in the body, a tape entry costs |expansion|+1)
 * and stops when the total stops improving. It is an ORACLE for the achievable
 * total, not a shippable codec: it emits no contract and no real glyph string.
 * It exists to bound how much a different construction alone would buy.
 */
import fs from 'node:fs';
import { countTokens, encodeIds } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const M = +(process.env.M || '0.80');         // measured marginal glyph cost
const MINCOUNT = +(process.env.MINCOUNT || '2');
const MAXRULES = +(process.env.MAXRULES || '4000');

function repair(ids0: number[]) {
  let ids = ids0.slice();
  // rule table: expansion is a list of symbol ids (negative = created rules)
  const rules: number[][] = [];
  let tapeCost = 0;
  const totalAt: number[] = [ids0.length];
  for (let step = 0; step < MAXRULES; step++) {
    // count adjacent pairs
    const cnt = new Map<string, number>();
    for (let i = 0; i + 1 < ids.length; i++) cnt.set(ids[i] + ',' + ids[i + 1], (cnt.get(ids[i] + ',' + ids[i + 1]) ?? 0) + 1);
    let bestKey: string | null = null, bestN = 0;
    for (const [k, n] of cnt) if (n > bestN && n >= MINCOUNT) { bestN = n; bestKey = k; }
    if (!bestKey) break;
    const [a, b] = bestKey.split(',').map(Number);
    const sym = -(rules.length + 1);
    // non-overlapping leftmost replacement
    const out: number[] = [];
    let hits = 0;
    for (let i = 0; i < ids.length; ) {
      if (ids[i] === a && ids[i + 1] === b) { out.push(sym); i += 2; hits++; }
      else { out.push(ids[i]); i++; }
    }
    if (hits < MINCOUNT) break;
    // cost of the new tape entry: expansion is (a,b); if a or b is itself a
    // rule it costs 1 token (its glyph), otherwise it costs its own token count
    const symCost = (x: number) => (x < 0 ? 1 : 1);      // every symbol is 1 token in the tape
    const entryCost = symCost(a) + symCost(b) + 1;       // expansion + the glyph itself
    const newTape = tapeCost + entryCost;
    const newBody = out.length;                          // each symbol ~1 token; refine below
    // refined: body cost = (#non-rule symbols) + M*(#rule symbols)
    let plain = 0, glyphs = 0;
    for (const x of out) if (x < 0) glyphs++; else plain++;
    const bodyCost = plain + M * glyphs;
    const newTotal = newTape + bodyCost;
    const prevTotal = totalAt[totalAt.length - 1];
    if (newTotal >= prevTotal) break;                    // no longer paying
    ids = out;
    rules.push([a, b]);
    tapeCost = newTape;
    totalAt.push(newTotal);
  }
  return { total: totalAt[totalAt.length - 1], rules: rules.length, tape: tapeCost, body: ids.length };
}

for (const f of (process.env.F || 'bench/holdout-work/kb-article.txt').split(',')) {
  const t = fs.readFileSync(f, 'utf8');
  const base = T(t);
  const ids = Array.from(encodeIds(t, enc) as Iterable<number>);
  const t0 = Date.now();
  const r = repair(ids);
  console.log(f.split('/').pop()!.padEnd(38), 'raw', String(base).padStart(5),
    '| RePair total', String(Math.round(r.total)).padStart(5),
    '(rules', String(r.rules).padStart(4), 'tape', String(r.tape).padStart(4), 'body', String(r.body).padStart(5), ')',
    '| saved', String(base - Math.round(r.total)).padStart(5),
    '|', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
