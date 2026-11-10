/**
 * X96 — IS CHIRON ITSELF A FRONTIER CANDIDATE?
 *
 * chiron.ts owns the only two operators in the whole wire language that the
 * frontier's parents never emit: `×` (REPEAT/FILL over line units with
 * per-column lists) and `…` (integer ranges).  Ten committed wires contain zero
 * of either.  chironEncode is called by twelve other codecs in src/ but by
 * nothing in the tagstack frontier chain, so the block/column machinery has
 * never been priced against the gate on this corpus.
 *
 * This runs it on the same 29 lanes the gate uses and reports its COMPLETE
 * message cost (contract + wire, which is what ChironResult.messageTokens is)
 * against the run J gate (12 639) and the run J shipped total (12 491).
 *
 * CAVEAT, stated up front: chironEncode bounds itself with `budgetMs`, a WALL
 * CLOCK.  Under OMEGA_DET=1 the frontier is supposed to be a pure function of
 * its input, and a wall-clock bound is not.  So this is a HEADROOM MEASUREMENT,
 * not an admission: if it wins, the admission has to be re-cut with a work-unit
 * bound before it can join the chain.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironEncode } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const gate = JSON.parse(fs.readFileSync('bench/x86/receipts/frontier-runJ.json', 'utf8'));
const G = new Map(gate.rows.map((r: any) => [r.path, r]));
const shipped = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runJ.json', 'utf8'));
const S = new Map(shipped.rows.map((r: any) => [r.path, r]));

const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r = chironEncode(text, enc);
  const g: any = G.get(p);
  const s: any = S.get(p);
  rows.push({
    path: p, lane: p.split('/').pop(), raw: countTokens(text, enc),
    chiron: r.messageTokens, exact: r.decoded === text, mode: r.mode,
    rules: r.rules, blocks: r.blocks, lists: r.lists, script: r.script, ops: r.ops,
    gate: g ? g.tokens : null, ship: s ? s.X : null,
    dGate: g ? r.messageTokens - g.tokens : null, dShip: s ? r.messageTokens - s.X : null,
    ms: Date.now() - t1,
  });
  const row = rows[rows.length - 1];
  console.log(`${row.lane!.padEnd(26)} raw=${String(row.raw).padStart(5)} chiron=${String(row.chiron).padStart(5)} ` +
    `gate=${String(row.gate).padStart(5)} ship=${String(row.ship).padStart(5)} dGate=${String(row.dGate).padStart(6)} dShip=${String(row.dShip).padStart(6)} ` +
    `exact=${row.exact} ${row.mode} rules=${row.rules} blocks=${row.blocks} lists=${row.lists} ${row.script} ${row.ms}ms`);
  fs.mkdirSync('bench/x96/receipts', { recursive: true });
  fs.writeFileSync('bench/x96/receipts/chiron29.json', JSON.stringify({
    note: 'X96 chironEncode complete-message cost vs the run J gate and shipped totals; wall-clock-bounded, so a headroom measurement only',
    rows, chironTotal: rows.reduce((a, b) => a + b.chiron, 0),
    gateTotal: rows.reduce((a, b) => a + (b.gate ?? 0), 0), shipTotal: rows.reduce((a, b) => a + (b.ship ?? 0), 0),
  }, null, 1) + '\n');
}
const C = rows.reduce((a, b) => a + b.chiron, 0);
const GT = rows.reduce((a, b) => a + (b.gate ?? 0), 0);
const ST = rows.reduce((a, b) => a + (b.ship ?? 0), 0);
const winG = rows.filter((r) => (r.dGate ?? 1) < 0);
const winS = rows.filter((r) => (r.dShip ?? 1) < 0);
console.log(`\n=== X96 CHIRON vs THE GATE (29 lanes) ===`);
console.log(`gate ${GT}   chiron ${C}   delta ${C - GT} (${(100 * (C - GT) / GT).toFixed(3)}%)`);
console.log(`shipped ${ST}   chiron ${C}   delta ${C - ST} (${(100 * (C - ST) / ST).toFixed(3)}%)`);
console.log(`exact ${rows.filter((r) => r.exact).length}/${rows.length}   beats gate on ${winG.length} lanes   beats shipped on ${winS.length} lanes`);
for (const w of winG.sort((a, b) => a.dGate - b.dGate)) console.log(`  BEATS GATE ${w.lane.padEnd(26)} ${w.gate} -> ${w.chiron}  (${w.dGate})  blocks=${w.blocks} lists=${w.lists}`);
for (const w of winS.sort((a, b) => a.dShip - b.dShip)) console.log(`  BEATS SHIP ${w.lane.padEnd(26)} ${w.ship} -> ${w.chiron}  (${w.dShip})  blocks=${w.blocks} lists=${w.lists}`);
console.log(`\nwrote bench/x96/receipts/chiron29.json`);
