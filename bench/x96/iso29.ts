/**
 * X96 — ἸΣΟΜΟΡΦΊΑ on the full 29-lane gate, under OMEGA_DET=1.
 *
 * WHY THIS EXISTS.  The wholeobj probe measured the headroom on the ten
 * authoritative X87 wires (-128 tokens, -1.63%) by relabelling a COMMITTED wire.
 * That is an estimate of what a pass could do; it is not an acceptance test.
 * This runs the shipped encoder over the same 29 lanes the gate uses, with
 * ἸΣΟΜΟΡΦΊΑ admitted as the last X74 candidate, and diffs against the run J
 * shipped receipt (12 491) which was produced by the identical harness without
 * it.  Same process, same OMEGA_DET=1, same lanes, same admission rule.
 *
 * Receipt hygiene: this writes bench/x96/receipts/iso29.json and NOTHING else.
 * The X89 harness writes a fixed path (bench/x89/receipts/front3.json) and the
 * run-J script has to restore it afterwards; this does not participate in that.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

const enc: any = 'o200k_base';
const OUT = 'bench/x96/receipts/iso29.json';
const before = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runJ.json', 'utf8'));
const B = new Map(before.rows.map((r: any) => [r.path, r]));

const rows: any[] = [];
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const b: any = B.get(p);
  const iso = /ISOMORPHIA (\d+) -> (\d+)/.exec(String(r.notes ?? ''));
  rows.push({
    path: p, lane: p.split('/').pop(), raw: countTokens(text, enc),
    X: r.messageTokens, parent: r.parentCodec, exact: r.decoded === text,
    runJ: b ? b.X : null, delta: b ? r.messageTokens - b.X : null,
    isoApplied: !!iso, isoFrom: iso ? Number(iso[1]) : null, isoTo: iso ? Number(iso[2]) : null,
    ms: Date.now() - t1, notes: String(r.notes ?? '').slice(0, 400),
  });
  console.log(`${rows[rows.length - 1].lane!.padEnd(26)} raw=${String(rows[rows.length - 1].raw).padStart(5)} ` +
    `X96=${String(r.messageTokens).padStart(5)}(${String(r.parentCodec).padEnd(13)}) runJ=${String(b ? b.X : '?').padStart(5)} ` +
    `Δ=${String(b ? r.messageTokens - b.X : '?').padStart(5)} exact=${r.decoded === text} ` +
    `iso=${iso ? `${iso[1]}->${iso[2]}` : '-'} ${rows[rows.length - 1].ms}ms`);
  fs.mkdirSync('bench/x96/receipts', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    det: process.env.OMEGA_DET ?? null,
    note: 'X96 shipped chain (tagstackEncode) with ISOMORPHIA admitted, under OMEGA_DET=1, diffed against run J shipped',
    rows, Xtotal: rows.reduce((a, b) => a + b.X, 0), runJtotal: rows.reduce((a, b) => a + (b.runJ ?? 0), 0),
  }, null, 1) + '\n');
}
const X = rows.reduce((a, b) => a + b.X, 0);
const J = rows.reduce((a, b) => a + (b.runJ ?? 0), 0);
const better = rows.filter((r) => (r.delta ?? 0) < 0);
const worse = rows.filter((r) => (r.delta ?? 0) > 0);
console.log(`\n=== X96 ISOMORPHIA 29-LANE (OMEGA_DET=${process.env.OMEGA_DET ?? '0'}) ===`);
console.log(`run J shipped TOTAL ${J}   ->   X96 shipped TOTAL ${X}   delta ${X - J} (${(100 * (X - J) / J).toFixed(3)}%)`);
console.log(`exact ${rows.filter((r) => r.exact).length}/${rows.length}   lanes improved ${better.length}   lanes worse ${worse.length}   ms ${Date.now() - t0}`);
for (const w of better.sort((a, b) => a.delta - b.delta)) console.log(`  IMPROVED ${w.lane.padEnd(26)} ${w.runJ} -> ${w.X}  (${w.delta})  parent ${w.parent}  iso ${w.isoFrom}->${w.isoTo}`);
for (const w of worse) console.log(`  WORSE    ${w.lane.padEnd(26)} ${w.runJ} -> ${w.X}  (+${w.delta})  parent ${w.parent}`);
console.log(`\nwrote ${OUT}`);
