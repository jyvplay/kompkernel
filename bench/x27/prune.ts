/**
 * X27 probe 1: EXACT tape-rule pruning.
 *
 * Central question: does POLYTROPOS ship rules that cost more than they save?
 *
 * Model. A rule `g -> R` costs ~1 token for the glyph plus |R| tokens for its
 * payload in the tape, and converts n body occurrences of R (n*|R| tokens) into
 * n glyphs (n * 0.801 marginal tokens). So
 *
 *     saving(n, |R|) = n * (|R| - 0.801) - (|R| + 1)
 *
 * and a SINGLE-TOKEN payload needs n >= 11 to break even. tapecalc.ts measured
 * that kb-article ships 27 rules of which 24 have a 1-token payload and 16 are
 * at or below break-even; llm-answer ships 34 with 17 lossy. If that model is
 * right, deleting the lossy rules must strictly improve the wire.
 *
 * This probe does not trust the model -- it measures. For each rule it rebuilds
 * the whole wire with that rule deleted and its glyph textually substituted
 * everywhere, then takes the real o200k count. Greedy loop until no removal
 * helps. Nothing is estimated.
 */
import fs from 'node:fs';
import { symplokeEncode, symplokeDecode } from '@/lib/omega/symploke';
import { chironDecode, chironParseTape, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

interface Rule { glyph: string; raw: string }

function splitWire(wire: string) {
  if (!wire.startsWith(CHIRON_START)) return null;
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  if (cut < 0) return null;
  return { tape: wire.slice(CHIRON_START.length, cut), body: wire.slice(cut + CHIRON_SEP.length) };
}

function buildWire(rules: Rule[], body: string): string {
  return CHIRON_START + rules.map((r) => r.glyph + r.raw).join('') + CHIRON_SEP + body;
}

/** Delete rule at index k: substitute its glyph with its raw everywhere else. */
function withoutRule(rules: Rule[], body: string, k: number): { rules: Rule[]; body: string } {
  const { glyph, raw } = rules[k];
  const sub = (s: string) => s.split(glyph).join(raw);
  const out = rules.filter((_, i) => i !== k).map((r) => ({ glyph: r.glyph, raw: sub(r.raw) }));
  return { rules: out, body: sub(body) };
}

export function pruneWire(wire: string, maxRounds = 400): { wire: string; removed: number[]; before: number; after: number } {
  const parts = splitWire(wire);
  if (!parts) return { wire, removed: [], before: T(wire), after: T(wire) };
  const sc = scriptOfChar(parts.tape[0]);
  if (!sc) return { wire, removed: [], before: T(wire), after: T(wire) };
  const parsed = chironParseTape(parts.tape, sc);
  if (!parsed) return { wire, removed: [], before: T(wire), after: T(wire) };

  let rules: Rule[] = parsed.map((r) => ({ glyph: r.glyph, raw: r.raw }));
  let body = parts.body;
  let cur = T(buildWire(rules, body));
  const before = cur;
  const removed: number[] = [];
  const origIndex = rules.map((_, i) => i);

  for (let round = 0; round < maxRounds; round++) {
    let bestK = -1, bestTok = cur, bestState: { rules: Rule[]; body: string } | null = null;
    for (let k = 0; k < rules.length; k++) {
      const cand = withoutRule(rules, body, k);
      // a rule may not delete to a tape whose first char is not a glyph
      if (cand.rules.length && !scriptOfChar(cand.rules[0].glyph)) continue;
      const w = buildWire(cand.rules, cand.body);
      const tok = T(w);
      if (tok < bestTok) { bestTok = tok; bestK = k; bestState = cand; }
    }
    if (bestK < 0 || !bestState) break;
    removed.push(origIndex[bestK]);
    origIndex.splice(bestK, 1);
    rules = bestState.rules; body = bestState.body; cur = bestTok;
  }
  return { wire: buildWire(rules, body), removed, before, after: cur };
}

if (true) {
  const files = (process.env.F || '').split(',').filter(Boolean);
  let totB = 0, totA = 0;
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const r = symplokeEncode(t, enc);
    const base = r.messageTokens;
    const p = pruneWire(r.wire);
    const newMsg = base - T(r.wire) + p.after;
    // round trip on the PRUNED wire
    const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
    let ok = false;
    try { ok = symplokeDecode(p.wire, { stats: r.stats, order: r.order, undo }) === t; } catch { /* noop */ }
    console.log(f.split('/').pop()!.padEnd(38),
      'msg', String(base).padStart(5), '->', String(newMsg).padStart(5),
      '| delta', String(newMsg - base).padStart(5),
      '| rules removed', String(p.removed.length).padStart(3),
      '| wire', String(p.before).padStart(5), '->', String(p.after).padStart(5),
      '| exact', ok);
    totB += base; totA += newMsg;
  }
  console.log('TOTAL', totB, '->', totA, ' delta', totA - totB);
}
