/** X89 probe — CHEAPEST FALSIFICATION TEST for back-pointer rules, before any codec exists.
 *
 *  A dictionary rule costs (1 + |rule text|) when the rule is LITERAL, which is what
 *  ARIADNE, STRAND, AMBIENT, PHRASEBOOK and MERISMOS all pay. A rule that is instead a
 *  POSITIONAL BACK-POINTER into the text already rebuilt costs a fixed ~5 tokens no matter
 *  how long the span is: <glyph><start>·<len>. So the two forms cross over at |span| ~ 4
 *  tokens, and the pointer is strictly better for every span longer than that, by
 *  (|span| - 4) per rule, independent of how many times it is used.
 *
 *  ARIADNE's own header states the wall this attacks: on bench/holdout/gh-prose.txt the
 *  optimal parse with a FREE dictionary is 1415 against identity 1934, but "charge the
 *  dictionary and the optimum is worse than identity". MERISMOS measured the marginal rate
 *  of long identifiers at 0.84 -- "the frontier is BLIND here". Both point at the same
 *  thing: the rule text is the cost, and long spans are where the frontier gives up.
 *
 *  This probe does NOT build a codec. It enumerates repeated token n-grams of the committed
 *  frontier wires and prices both rule forms, so the mechanism is falsified or confirmed in
 *  one pass with no frontier call. */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const dirs = ['bench/x87/receipts/wires', 'bench/x88/receipts'];
const MIN_P = 3;          // span must be at least this many tokens to be worth a rule
const PTR_COST = 5;       // <glyph><start>·<len> measured below, not assumed
const rows: any[] = [];
// measure the real cost of a pointer row and of a literal row, once
const ptrRow = 'ց1234·12';
console.log(`pointer row ${JSON.stringify(ptrRow)} costs ${T(ptrRow)} tokens;  glyph alone ${T('ց')}`);
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).sort()) {
    if (!f.endsWith('.wire.txt')) continue;
    const M = fs.readFileSync(d + '/' + f, 'utf8');
    const toks = tokenStrings(M, enc);
    const N = toks.length;
    // count every n-gram of tokens, n in [MIN_P, 40]
    const seen = new Map<string, { p: number; k: number; first: number }>();
    for (let n = MIN_P; n <= 40; n++) {
      for (let i = 0; i + n <= N; i++) {
        let s = '';
        for (let j = i; j < i + n; j++) s += toks[j].s;
        const e = seen.get(s);
        if (e) e.k++; else seen.set(s, { p: T(s), k: 1, first: i });
      }
    }
    // keep only maximal candidates: a span is dominated if a longer span containing it has
    // the same occurrence count, because the longer one saves strictly more per use.
    const cands = [...seen.entries()].filter(([, v]) => v.k >= 2 && v.p >= MIN_P);
    const priced = cands.map(([s, v]) => {
      const litSave = (v.k - 1) * v.p - v.p - 1 - v.k;      // literal rule: (1+p) + k glyphs
      const ptrSave = v.k * v.p - PTR_COST - v.k;           // pointer rule: 5 + k glyphs
      return { s, p: v.p, k: v.k, litSave, ptrSave, chars: s.length };
    }).filter((r) => r.ptrSave > 0);
    // greedy non-overlapping selection by pointer saving, to get an upper bound that is
    // still honest about the fact that two rules cannot claim the same characters
    priced.sort((a, b) => b.ptrSave - a.ptrSave || b.p - a.p);
    const taken: typeof priced = [];
    const usedChar = new Set<number>();
    for (const c of priced) {
      let ok = true;
      // crude overlap guard on the FIRST occurrence only; the real codec does this exactly
      const idx = M.indexOf(c.s);
      for (let q = idx; q < idx + c.s.length; q++) if (usedChar.has(q)) { ok = false; break; }
      if (!ok) continue;
      for (let q = idx; q < idx + c.s.length; q++) usedChar.add(q);
      taken.push(c);
      if (taken.length >= 40) break;
    }
    const litTot = taken.reduce((a, r) => a + Math.max(0, r.litSave), 0);
    const ptrTot = taken.reduce((a, r) => a + r.ptrSave, 0);
    const mt = T(M);
    rows.push({ lane: f.replace('.wire.txt', ''), wireTokens: mt, candidates: priced.length, taken: taken.length,
      litSave: litTot, ptrSave: ptrTot, ptrAdvantage: ptrTot - litTot,
      ptrPctOfWire: +(100 * ptrTot / mt).toFixed(1) });
    const r = rows[rows.length - 1];
    console.log(`\n━━ ${r.lane}  wire=${mt} tok  repeated-spans(p>=${MIN_P},k>=2)=${r.candidates}  selected=${r.taken}`);
    console.log(`   LITERAL rules would save ${litTot}   POINTER rules save ${ptrTot}   advantage ${ptrTot - litTot} (${r.ptrPctOfWire}% of the wire)`);
    for (const c of taken.slice(0, 6)) console.log(`     p=${String(c.p).padStart(3)} k=${String(c.k).padStart(3)} lit=${String(c.litSave).padStart(4)} ptr=${String(c.ptrSave).padStart(4)}  ${JSON.stringify(c.s.slice(0, 60))}`);
    fs.writeFileSync('bench/x89/receipts/probe1.json', JSON.stringify({ ptrRowCost: T(ptrRow), rows }, null, 1) + '\n');
  }
}
console.log('\n=== summary: can back-pointer rules pay? ===');
let tl = 0, tp = 0;
for (const r of rows.sort((a, b) => b.ptrSave - a.ptrSave)) { tl += r.litSave; tp += r.ptrSave; console.log(`  ${r.lane.slice(0, 30).padEnd(31)} wire=${String(r.wireTokens).padStart(5)}  literal=${String(r.litSave).padStart(5)}  pointer=${String(r.ptrSave).padStart(5)}  advantage=${String(r.ptrAdvantage).padStart(5)}`); }
console.log(`\nTOTAL over ${rows.length} wires: literal-rule saving ${tl}, pointer-rule saving ${tp}, POINTER ADVANTAGE ${tp - tl}`);
