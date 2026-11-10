/**
 * X97 — RUN-PACKING HEADROOM.  The question this answers is the one ἸΣΟΜΟΡΦΊΑ structurally cannot:
 *
 *   ἸΣΟΜΟΡΦΊΑ relabels ONE rule at a time.  A body run of L consecutive reference glyphs becomes a
 *   single vocabulary token only if ALL L of its letters change together, so no single-letter move
 *   can ever discover it.  X95's run-curve measured the vocabulary's CAPACITY (8 785 two-char tokens
 *   with distinct characters, 6 821 three-char, 3 217 four-char, 986 five, 327 six, 94 seven, 39
 *   eight, 7 nine, 5 ten, 3 eleven, 0 at twelve) and then declared the bound unreachable because
 *   "a run's glyph sequence is fixed by the rule assignment".  That last clause is exactly the free
 *   parameter this probe prices: the assignment is ours to choose.
 *
 * UPPER BOUND, stated so it can only over-promise: for every maximal run of L>=2 consecutive
 * reference glyphs in the body, assume the L letters can be rearranged into a vocabulary token at no
 * cost elsewhere, so the run costs 1 token instead of L.  Sum (L-1) x occurrences.  This is an
 * ESTIMATE: it ranks, it never accepts.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_START } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const rows: any[] = [];
let grandBound = 0, grandRefTok = 0, grandBody = 0;
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  // a glyph is a KEY on first appearance in the tape, a REFERENCE thereafter
  const keyOf = new Map<string, string>();
  const seen = new Set<string>();
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { seen.add(ch); keyOf.set(ch, ch); }
  }
  const keys = new Set(keyOf.keys());
  // maximal runs of consecutive reference glyphs in the body
  const runs = new Map<string, number>();
  let cur = '';
  let refTok = 0;
  const flush = (): void => { if (cur.length >= 2) runs.set(cur, (runs.get(cur) ?? 0) + 1); cur = ''; };
  for (const ch of body) {
    if (keys.has(ch)) { cur += ch; refTok += 1; } else { flush(); }
  }
  flush();
  let bound = 0;
  const byLen = new Map<number, { runs: number; occ: number; save: number }>();
  for (const [r, n] of runs) {
    const save = (r.length - 1) * n;
    bound += save;
    const e = byLen.get(r.length) ?? { runs: 0, occ: 0, save: 0 };
    e.runs++; e.occ += n; e.save += save;
    byLen.set(r.length, e);
  }
  const bodyTok = countTokensExact(body, enc);
  grandBound += bound; grandRefTok += refTok; grandBody += bodyTok;
  rows.push({ lane, bodyTok, refTok, refFrac: +(refTok / Math.max(1, bodyTok)).toFixed(4),
    distinctRuns: runs.size, runOcc: [...runs.values()].reduce((a, b) => a + b, 0), bound,
    byLen: [...byLen.entries()].sort((a, b) => a[0] - b[0]).map(([L, e]) => ({ L, ...e })) });
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync('bench/x97/receipts/runpack.json', JSON.stringify({ note: 'X97 run-packing upper bound; ESTIMATE, ranks only', rows }, null, 1) + '\n');
console.log(`lane                bodyTok  refTok  ref%  distinctRuns  runOcc  UPPER-BOUND  bound/body`);
for (const r of rows) console.log(`${r.lane.padEnd(18)} ${String(r.bodyTok).padStart(7)} ${String(r.refTok).padStart(7)} ${(100 * r.refFrac).toFixed(1).padStart(5)}% ${String(r.distinctRuns).padStart(13)} ${String(r.runOcc).padStart(8)} ${String(r.bound).padStart(12)} ${(100 * r.bound / r.bodyTok).toFixed(1).padStart(10)}%`);
console.log(`\nTOTAL body ${grandBody}  reference tokens ${grandRefTok} (${(100 * grandRefTok / grandBody).toFixed(1)}% of body)  RUN-PACKING UPPER BOUND ${grandBound} (${(100 * grandBound / grandBody).toFixed(1)}% of body)`);
console.log(`\nrun-length histogram (all lanes):`);
const H = new Map<number, { runs: number; occ: number; save: number }>();
for (const r of rows) for (const e of r.byLen) { const h = H.get(e.L) ?? { runs: 0, occ: 0, save: 0 }; h.runs += e.runs; h.occ += e.occ; h.save += e.save; H.set(e.L, h); }
for (const [L, e] of [...H.entries()].sort((a, b) => a[0] - b[0])) console.log(`  L=${String(L).padStart(2)}  distinct ${String(e.runs).padStart(5)}  occurrences ${String(e.occ).padStart(6)}  bound ${String(e.save).padStart(5)}`);
console.log(`\nwrote bench/x97/receipts/runpack.json`);
