/** X90 probe — HOW MUCH CROSS-FIELD TEMPLATE REDUNDANCY IS THERE, AND WHERE?
 *
 *  PROSPHYSIS (X74) is the only arm with a cross-field relation and its trigger is
 *  `ARROW = /^(.* -> )([^\s]+)(.*)$/`: it fires ONLY on lines containing " -> ", and only
 *  ever relates the last whitespace-delimited field before the arrow to the symlink
 *  target, in the suffix direction. GNOMON and SYNARTESIS derive the npm `resolved` URL
 *  from the enclosing key and the sibling version, but both hardcode the npm registry
 *  template. So the GENERAL relation --
 *
 *      cell[j]  =  A + cell[i] + B        (A, B constant across the record set)
 *
 *  -- is fitted nowhere. It is the natural generalisation of all three, and it belongs to
 *  the one class that has historically paid: redundancy the glyph pool CANNOT represent,
 *  because a sibling appearing under a different affix in every row is never a literal
 *  repeat, so no dictionary rule can intern it.
 *
 *  This probe measures the opportunity with raw token counts only -- no frontier call --
 *  and separates the two cases that matter, because they pay very differently:
 *    DELETE  both affixes constant across rows: the target cell carries NO information
 *            the reader does not already hold, so it can be dropped entirely and rebuilt
 *            from the sibling. Pays tokens(cell) per row.
 *    MARKER  one affix varies: only the varying part is new. Pays tokens(cell) -
 *            tokens(varying affix) - 1 per row.
 *  Rule cost is charged once per fitted relation, not per row.
 *
 *  A relation is reported only if it holds on >= MIN_ROWS rows and on >= MIN_FRAC of the
 *  rows that have both cells, so a coincidence on two lines cannot look like a mechanism. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => (s === '' ? 0 : countTokens(s, enc));
const MIN_ROWS = 4, MIN_FRAC = 0.6, MAX_CELLS = 24;

const files: string[] = [];
for (const d of fs.readdirSync('bench').filter((x) => x.startsWith('holdout'))) {
  const dir = 'bench/' + d;
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) files.push(path.join(dir, f));
}
const out: any[] = [];
for (const p of files.sort()) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n');
  const cells = lines.map((l) => (l.trim() === '' ? [] : l.trim().split(/\s+/)));
  const usable = cells.filter((c) => c.length >= 2 && c.length <= MAX_CELLS);
  if (usable.length < MIN_ROWS) { out.push({ lane: p, note: 'too few multi-cell lines', lines: lines.length }); continue; }
  // accumulate per (targetCol, sourceCol, affixShape) with the affix strings seen
  const acc = new Map<string, { rows: number; tTok: number; A: Map<string, number>; B: Map<string, number>; bothCells: number }>();
  for (const c of usable) {
    for (let j = 0; j < c.length; j++) for (let i = 0; i < c.length; i++) {
      if (i === j) continue;
      const t = c[j], s = c[i];
      if (s.length < 2 || t.length <= s.length) continue;
      const at = t.indexOf(s);
      if (at < 0) continue;
      if (t.indexOf(s, at + 1) >= 0) continue;                 // ambiguous placement: skip
      const A = t.slice(0, at), B = t.slice(at + s.length);
      const k = `${j}<-${i}`;
      let e = acc.get(k);
      if (!e) { e = { rows: 0, tTok: 0, A: new Map(), B: new Map(), bothCells: 0 }; acc.set(k, e); }
      e.rows++; e.tTok += T(t);
      e.A.set(A, (e.A.get(A) ?? 0) + 1); e.B.set(B, (e.B.get(B) ?? 0) + 1);
    }
    for (let j = 0; j < c.length; j++) for (let i = 0; i < c.length; i++) if (i !== j) {
      const k = `${j}<-${i}`; const e = acc.get(k); if (e) e.bothCells++;
    }
  }
  const rels: any[] = [];
  for (const [k, e] of acc) {
    if (e.rows < MIN_ROWS || e.rows < MIN_FRAC * e.bothCells) continue;
    const topA = [...e.A.entries()].sort((a, b) => b[1] - a[1])[0];
    const topB = [...e.B.entries()].sort((a, b) => b[1] - a[1])[0];
    const aConst = topA[1] / e.rows, bConst = topB[1] / e.rows;
    // rows where BOTH affixes equal the modal ones -> deletable
    let both = 0;
    for (const [A, n] of e.A) if (A === topA[0]) for (const [B, m] of e.B) if (B === topB[0]) both = Math.min(n, m);
    const kind = (aConst >= 0.9 && bConst >= 0.9) ? 'DELETE' : (aConst >= 0.9 || bConst >= 0.9) ? 'MARKER' : 'WEAK';
    const avgT = e.tTok / e.rows;
    const ruleCost = T(topA[0]) + T(topB[0]) + 14;             // affixes + a printed rule + marker definition
    const deleteRows = (aConst >= 0.9 && bConst >= 0.9) ? e.rows : both;
    const markerRows = e.rows - deleteRows;
    const gain = deleteRows * avgT + markerRows * Math.max(0, avgT - 2) - ruleCost;
    rels.push({ rel: k, kind, rows: e.rows, bothCells: e.bothCells, frac: +(e.rows / e.bothCells).toFixed(2),
      Aconst: +aConst.toFixed(2), Bconst: +bConst.toFixed(2), avgTargetTokens: +avgT.toFixed(1),
      A: topA[0].slice(0, 24), B: topB[0].slice(0, 24), estGain: Math.round(gain) });
  }
  rels.sort((a, b) => b.estGain - a.estGain);
  const total = rels.reduce((a, r) => a + Math.max(0, r.estGain), 0);
  out.push({ lane: p, lines: lines.length, usableRows: usable.length, rawTokens: T(text), relations: rels.length, estTotalGain: total, top: rels.slice(0, 6) });
  if (rels.length) {
    console.log(`\n━━ ${p}  rows=${usable.length} raw=${T(text)}  relations=${rels.length}  EST GAIN=${total}`);
    for (const r of rels.slice(0, 5)) console.log(`   ${r.rel.padEnd(8)} ${r.kind.padEnd(7)} rows=${String(r.rows).padStart(4)}/${String(r.bothCells).padEnd(4)} A=${r.Aconst} B=${r.Bconst} avgT=${String(r.avgTargetTokens).padStart(5)} gain=${String(r.estGain).padStart(5)}  A=${JSON.stringify(r.A)} B=${JSON.stringify(r.B)}`);
  }
  fs.mkdirSync('bench/x90/receipts', { recursive: true });
  fs.writeFileSync('bench/x90/receipts/tmpl.json', JSON.stringify({ note: 'raw-token probe, no frontier call; estGain charges one rule per relation', lanes: out }, null, 1) + '\n');
}
const ranked = out.filter((o) => o.estTotalGain > 0).sort((a, b) => b.estTotalGain - a.estTotalGain);
console.log(`\n=== CROSS-FIELD TEMPLATE OPPORTUNITY, ${out.length} lanes ===`);
for (const r of ranked.slice(0, 16)) console.log(`  ${String(r.estTotalGain).padStart(6)}  ${r.lane}  (raw ${r.rawTokens}, ${r.relations} relations)`);
console.log(`lanes with material: ${ranked.length}/${out.length}   total estimated gain ${ranked.reduce((a, r) => a + r.estTotalGain, 0)}`);
