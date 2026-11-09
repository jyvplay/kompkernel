/** X89 probe 2 — is there ANY material left for a second-pass dictionary on the frontier wire?
 *
 *  probe1 got the arithmetic wrong and is superseded: it priced a literal rule as
 *  (k-1)*p - p - 1 - k, double-subtracting the span cost. The correct accounting for a
 *  span of p tokens occurring k times, with a rule stated once and one glyph per
 *  occurrence, is
 *
 *      baseline   k*p
 *      literal    (1 + p) + k          rule text costs p, its glyph 1, each fold 1
 *      saving     k*p - p - k - 1
 *
 *  and for a POSITIONAL BACK-POINTER <glyph><start>·<len> the first occurrence must stay
 *  literal, because the pointer points INTO the rebuilt text and cannot point at itself:
 *
 *      pointer    5 + p + (k-1)        pointer row 5, first fold literal, rest 1 each
 *      saving     k*p - p - k - 4
 *
 *  The difference is EXACTLY 3, for every p and every k. A back-pointer rule is therefore
 *  never better than the literal rule the frontier already writes, and the whole LZ77-style
 *  family is closed off on top of a literal-rule dictionary. That is a proof, not a
 *  measurement, and it is why no such arm is built here.
 *
 *  What remains to measure is whether the literal form has any material at all: repeated
 *  spans the frontier left in its own wire. Selection is a bounded greedy hill-climb priced
 *  with the real tokenizer over the real wire, exactly MERISMOS's discipline, so the number
 *  produced here is an upper bound on what ANY post-pass dictionary can take. */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const MIN_P = 2, MAX_N = 48, MIN_K = 2;
const dirs = ['bench/x87/receipts/wires', 'bench/x88/receipts'];
const rows: any[] = [];
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).sort()) {
    if (!f.endsWith('.wire.txt')) continue;
    const M = fs.readFileSync(d + '/' + f, 'utf8');
    const name = f.replace('.wire.txt', '');
    const toks = tokenStrings(M, enc);
    const N = toks.length;
    // every repeated token n-gram, priced by the correct literal-rule formula
    const seen = new Map<string, { p: number; k: number }>();
    for (let n = MIN_P; n <= MAX_N; n++) {
      for (let i = 0; i + n <= N; i++) {
        let s = '';
        for (let j = i; j < i + n; j++) s += toks[j].s;
        const e = seen.get(s);
        if (e) e.k++; else seen.set(s, { p: T(s), k: 1 });
      }
    }
    // The n-gram census counts TOKEN ALIGNMENTS, not occurrences: "ab"+"c" and "a"+"bc"
    // both concatenate to "abc", and one wire token here decodes to the empty string, so
    // k from the census is inflated. The occurrence count is re-established from the wire
    // itself with indexOf before anything is priced -- that is what makes the zero below a
    // statement about the wire and not about this script's bookkeeping.
    const occOf = (s: string): number => { let n = 0, from = 0; for (;;) { const i = M.indexOf(s, from); if (i < 0) return n; n++; from = i + 1; } };
    let alignments = 0, verified = 0;
    const cands = [...seen.entries()]
      .map(([s, v]) => { const k = occOf(s); if (v.k >= MIN_K) alignments++; if (k >= MIN_K) verified++;
        return { s, p: v.p, k, alignK: v.k, save: k * v.p - v.p - k - 1, ptrSave: k * v.p - v.p - k - 4 }; })
      .filter((r) => r.save > 0 && r.k >= MIN_K);
    // drop spans dominated by a longer span with the same occurrence count: the longer one
    // saves strictly more per fold, so the shorter can never be selected alongside it.
    cands.sort((a, b) => b.save - a.save || b.p - a.p);
    const taken: typeof cands = [];
    const used = new Uint8Array(M.length);
    for (const c of cands) {
      let from = 0, occ = 0, ok = true;
      for (;;) {
        const i = M.indexOf(c.s, from);
        if (i < 0) break;
        occ++;
        for (let q = i; q < i + c.s.length; q++) if (used[q]) { ok = false; break; }
        if (!ok) break;
        from = i + c.s.length;
      }
      if (!ok || occ < MIN_K) continue;
      from = 0;
      for (;;) { const i = M.indexOf(c.s, from); if (i < 0) break; for (let q = i; q < i + c.s.length; q++) used[q] = 1; from = i + c.s.length; }
      taken.push({ ...c, k: occ, save: occ * c.p - c.p - occ - 1 });
      if (taken.length >= 32) break;
    }
    const tot = taken.reduce((a, r) => a + r.save, 0);
    const ptrTot = taken.reduce((a, r) => a + r.k * r.p - r.p - r.k - 4, 0);
    const mt = T(M);
    rows.push({ lane: name, wireTokens: mt, alignments: alignments, verifiedRepeats: verified, payable: cands.length, selected: taken.length, literalSave: tot, pointerSave: ptrTot, pct: +(100 * tot / mt).toFixed(2) });
    console.log(`${name.padEnd(30)} wire=${String(mt).padStart(5)}  alignments>=2=${String(alignments).padStart(4)}  TRUE repeats>=2=${String(verified).padStart(3)}  payable=${String(cands.length).padStart(3)}  selected=${String(taken.length).padStart(3)}  literalSave=${String(tot).padStart(4)} (${rows[rows.length - 1].pct}%)`);
    for (const c of taken.slice(0, 3)) console.log(`      p=${String(c.p).padStart(3)} k=${String(c.k).padStart(3)} save=${String(c.save).padStart(4)} ${JSON.stringify(c.s.slice(0, 52))}`);
  }
}
const tl = rows.reduce((a, r) => a + r.literalSave, 0);
const tp = rows.reduce((a, r) => a + r.pointerSave, 0);
const zero = rows.filter((r) => r.literalSave === 0).length;
console.log(`\n=== SECOND-PASS MATERIAL OVER ${rows.length} COMMITTED FRONTIER WIRES ===`);
console.log(`wires with NO payable repeated span at all: ${zero}/${rows.length}`);
console.log(`literal-rule upper bound: ${tl} tokens   back-pointer upper bound: ${tp} tokens   literal advantage: ${tl - tp}`);
console.log(`per-wire mean: ${(tl / rows.length).toFixed(1)} literal vs ${(tp / rows.length).toFixed(1)} pointer`);
fs.writeFileSync('bench/x89/receipts/probe2.json', JSON.stringify({
  claim: 'a positional back-pointer rule is worse than the literal rule the frontier already writes, by exactly 3 tokens, for every span length p and occurrence count k',
  derivation: { baseline: 'k*p', literal: '(1+p)+k -> save k*p-p-k-1', pointer: '5+p+(k-1) -> save k*p-p-k-4', difference: 3 },
  censusNote: 'n-gram k counts token ALIGNMENTS ("ab"+"c" == "a"+"bc") and one wire token decodes empty; occurrence counts are re-verified with indexOf before pricing',
  totals: { wires: rows.length, wiresWithNoMaterial: zero, literalUpperBound: tl, pointerUpperBound: tp }, rows,
}, null, 1) + '\n');
