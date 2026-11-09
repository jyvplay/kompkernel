/** X89 — decompose the ARIADNE/CHIRON tape (the pool) entry by entry.
 *
 *  ⚠ THIS PROBE'S OUTPUT IS INVALID AND ITS RECEIPT WAS DELETED, NOT COMMITTED. It
 *  segments the wire by NEWLINE and treats line 1 as the tape and lines 2+ as the body.
 *  `src/lib/omega/chiron.ts:59-66` is authoritative and says otherwise: the wire is
 *  `§ RULES ¶ BODY`, the tape runs from § to the FIRST ¶ after it, and therefore spans
 *  MULTIPLE lines — on ls-l-real lines 1-5, 1138 characters, 607 tokens, where this
 *  script reported 14. Its `isGlyph` predicate is also unsound, because a rule text may
 *  itself contain earlier glyphs (hierarchical entries). The correct segmentation is
 *  `wire.indexOf('§')` then `wire.indexOf('¶', that + 1)`; do not split on newlines.
 *  The file is kept, with this notice, because the wrong number was reported once and the
 *  reason it is wrong is worth more than its absence. The 607-token tape figure quoted in
 *  `docs/codecs.md` §X87 comes from `bench/x87/receipts/anatomy.log`, not from here.
 *
 *  The tape exists on EVERY lane and is 41% of the biggest one (ls-l-real: 607 of 1476
 *  tokens, 1138 chars). Every arm in the stack competes to shrink the BODY; nothing has
 *  ever priced the tape. An entry costs spanTokens + 1 glyph in the tape and 1 glyph per
 *  use in the body, so its net saving is (uses-1)*spanTokens - uses - 1, and an entry is
 *  worth admitting only if that is positive. This computes it per entry per lane from the
 *  committed wires, and asks the question that decides whether a general mechanism exists:
 *  WHAT KIND OF TEXT is expensive in the tape, and could it be GENERATED instead of stored?
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const dirs = ['bench/x87/receipts/wires', 'bench/x88/receipts'];
const isGlyph = (c: string) => c.codePointAt(0)! > 0x2fff || '§¶‖⁞¦·‡×¤ցסतשոოնาతబ'.includes(c);
const out: any[] = [];
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).sort()) {
    if (!f.endsWith('.wire.txt')) continue;
    const w = fs.readFileSync(d + '/' + f, 'utf8');
    const L = w.split('\n');
    const frame = L[0];
    const tapeLine = L[1] ?? '';
    const body = L.slice(2).join('\n');
    if (!tapeLine.startsWith('§')) { console.log(`${f}: no tape line (got ${JSON.stringify(tapeLine.slice(0, 30))})`); continue; }
    const tape = tapeLine.slice(1);
    // segment: a glyph starts an entry, the span runs to the next glyph
    const entries: { glyph: string; span: string }[] = [];
    let i = 0;
    while (i < tape.length) {
      const g = tape[i];
      let j = i + 1;
      while (j < tape.length && !isGlyph(tape[j])) j++;
      entries.push({ glyph: g, span: tape.slice(i + 1, j) });
      i = j;
    }
    const fTok = T(frame), tTok = T(tapeLine), bTok = T(body), all = T(w);
    const per = entries.map((e) => {
      const uses = body.split(e.glyph).length - 1;
      const st = T(e.span), gt = T(e.glyph);
      return { ...e, uses, spanTok: st, glyphTok: gt, saving: (uses - 1) * st - uses * gt - st - gt, spanChars: e.span.length };
    });
    const totSaving = per.reduce((a, r) => a + r.saving, 0);
    const neg = per.filter((r) => r.saving <= 0);
    out.push({ lane: f.replace('.wire.txt', ''), frame: fTok, tape: tTok, body: bTok, total: all,
      entries: entries.length, tapePct: +(100 * tTok / all).toFixed(1), totalSaving: totSaving,
      negEntries: neg.length, negWaste: neg.reduce((a, r) => a + -r.saving, 0) });
    const o = out[out.length - 1];
    console.log(`\n━━ ${o.lane}  total=${o.total}  frame=${o.frame} TAPE=${o.tape} (${o.tapePct}%)  body=${o.body}  entries=${o.entries}  netSaving=${o.totalSaving}  nonpositive=${o.negEntries} (waste ${o.negWaste})`);
    const bySpan = [...per].sort((a, b) => b.spanTok - a.spanTok);
    console.log('   costliest tape entries (spanTok / uses / net saving):');
    for (const r of bySpan.slice(0, 10)) console.log(`     ${String(r.spanTok).padStart(3)}tok ${String(r.spanChars).padStart(3)}ch u=${String(r.uses).padStart(3)} save=${String(r.saving).padStart(5)}  ${JSON.stringify(r.span.slice(0, 46))}`);
    // classify the expensive spans
    const cls: Record<string, { n: number; tok: number }> = {};
    for (const r of per) {
      let k = 'other-literal';
      if (/^[\s]*$/.test(r.span)) k = 'whitespace';
      else if (/^[-drwxsl+@.]+$/.test(r.span)) k = 'unix-perms';
      else if (/^[0-9]/.test(r.span) && /[0-9]$/.test(r.span) && /[:.\/-]/.test(r.span)) k = 'date/time/num';
      else if (/^[0-9a-f]{8,}$/i.test(r.span)) k = 'hex/hash';
      else if (/^\s/.test(r.span) && /[A-Za-z]{3,}/.test(r.span)) k = 'spaced-word';
      else if (/^[A-Za-z][A-Za-z0-9_.+-]*$/.test(r.span)) k = 'bare-word';
      else if (/[{}\[\]<>()|]/.test(r.span)) k = 'bracket/markup';
      cls[k] = cls[k] ?? { n: 0, tok: 0 }; cls[k].n++; cls[k].tok += r.spanTok;
    }
    console.log('   span classes: ' + Object.entries(cls).sort((a, b) => b[1].tok - a[1].tok).map(([k, v]) => `${k} ${v.n}×/${v.tok}tok`).join('  '));
    fs.writeFileSync('bench/x89/receipts/tape.json', JSON.stringify({ rows: out }, null, 1) + '\n');
  }
}
console.log('\n=== tape share across lanes ===');
for (const r of out.sort((a, b) => b.tapePct - a.tapePct)) console.log(`  ${r.lane.slice(0, 30).padEnd(31)} tape=${String(r.tape).padStart(4)}/${String(r.total).padStart(5)} = ${String(r.tapePct).padStart(4)}%  entries=${String(r.entries).padStart(3)} netSaving=${String(r.totalSaving).padStart(6)} nonpos=${r.negEntries}`);
console.log(`\nTOTAL tape tokens ${out.reduce((a, r) => a + r.tape, 0)} of ${out.reduce((a, r) => a + r.total, 0)} message tokens across ${out.length} lanes`);
console.log(`TOTAL non-positive entries ${out.reduce((a, r) => a + r.negEntries, 0)}, waste ${out.reduce((a, r) => a + r.negWaste, 0)} tokens`);
