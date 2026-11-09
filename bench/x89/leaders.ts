/** X89 — LEADERS, RECOMPUTED AGAINST THE STACK THAT SHIPS.
 *
 *  bench/x88/leaders.ts ranked 34 lanes by category against `tagstackFrontier`, which is
 *  the pre-X74 GATE. bench/x89/front3.ts establishes that the encoder the stack actually
 *  ships is `tagstackEncode`, and that on the 29-lane gate it totals 12 495 against the
 *  gate's 12 639, winning ls-l-real 1476 -> 1394 (PROSPHYSIS) and cue-sheet 163 -> 101
 *  (STICHOMYTHIA). Both of those lanes change category ranking, and cue-sheet changes
 *  category LEADER: at 101 it is no longer the weakest lane in the corpus, it is one of the
 *  strongest ratios on it. So the leaders list has to be regenerated against the shipped
 *  number or it reports the wrong winner on two lanes.
 *
 *  This is a pure join of two committed receipts -- leaders.json for the brotli-q11 floor
 *  and the category, front3.json for the shipped token count -- so it costs no frontier
 *  call and cannot drift. Lanes that front3 does not cover (the five logfront extras) keep
 *  their gate figure and are marked as such. */
import * as fs from 'node:fs';
const lead = JSON.parse(fs.readFileSync('bench/x88/receipts/leaders.json', 'utf8'));
const f3 = JSON.parse(fs.readFileSync('bench/x89/receipts/front3.json', 'utf8'));
const shipped = new Map(f3.rows.map((r: any) => [r.path, r]));
const rows = lead.rows.map((r: any) => {
  const s: any = shipped.get(r.path);
  const M = s ? s.X : r.F;
  return { ...r, gate: r.F, shipped: M, shippedParent: s ? s.parent : r.parent,
    src: s ? 'front3' : 'gate-only',
    delta: s ? s.X - r.F : 0,
    ratioShipped: +(M / r.raw).toFixed(4),
    floorVsShipped: +(r.floor / M).toFixed(3) };
});
const byCat = new Map<string, any[]>();
for (const r of rows) { if (!byCat.has(r.cat)) byCat.set(r.cat, []); byCat.get(r.cat)!.push(r); }
console.log('=== LEADERS BY CATEGORY, against the SHIPPED encoder (tagstackEncode) ===');
console.log('cat'.padEnd(14), 'lanes', '  sumRaw', ' sumGate', 'sumShipped', ' ratio', ' floor/stack', ' leaders(parent:count)');
const summary: any[] = [];
for (const [cat, rs] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const raw = rs.reduce((a, r) => a + r.raw, 0), g = rs.reduce((a, r) => a + r.gate, 0), m = rs.reduce((a, r) => a + r.shipped, 0);
  const fl = rs.reduce((a, r) => a + r.floor, 0);
  const wins = new Map<string, number>();
  for (const r of rs) wins.set(r.shippedParent, (wins.get(r.shippedParent) ?? 0) + 1);
  const leaders = [...wins.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(cat.padEnd(14), String(rs.length).padStart(4), String(raw).padStart(8), String(g).padStart(8), String(m).padStart(9),
    '  ' + (m / raw).toFixed(3), '      ' + (fl / m).toFixed(3), '   ', leaders);
  summary.push({ cat, lanes: rs.length, raw, gate: g, shipped: m, floor: fl, ratio: +(m / raw).toFixed(4), floorVsShipped: +(fl / m).toFixed(3), leaders });
}
const totRaw = rows.reduce((a, r) => a + r.raw, 0), totGate = rows.reduce((a, r) => a + r.gate, 0), totShip = rows.reduce((a, r) => a + r.shipped, 0), totFloor = rows.reduce((a, r) => a + r.floor, 0);
console.log('ALL'.padEnd(14), String(rows.length).padStart(4), String(totRaw).padStart(8), String(totGate).padStart(8), String(totShip).padStart(9), '  ' + (totShip / totRaw).toFixed(3), '      ' + (totFloor / totShip).toFixed(3));
const moved = rows.filter((r) => r.delta !== 0);
console.log(`\nlanes where the shipped stack beats the gate: ${moved.length}`);
for (const r of moved.sort((a, b) => a.delta - b.delta)) console.log(`  ${r.lane.padEnd(26)} ${r.cat.padEnd(13)} gate ${String(r.gate).padStart(5)} -> shipped ${String(r.shipped).padStart(5)} (${r.delta})  ratio ${r.ratioShipped}  floor/stack ${r.floorVsShipped}  parent ${r.shippedParent}`);
console.log(`\nlaw check: floor/shipped < 1.00 on every lane? ${rows.every((r) => r.floorVsShipped < 1) ? 'YES' : 'NO -- ' + rows.filter((r) => r.floorVsShipped >= 1).map((r) => r.lane + '=' + r.floorVsShipped).join(',')}`);
const worst = [...rows].sort((a, b) => b.ratioShipped - a.ratioShipped).slice(0, 5);
const best = [...rows].sort((a, b) => a.ratioShipped - b.ratioShipped).slice(0, 5);
console.log('weakest ratios (most headroom):', worst.map((r) => `${r.lane} ${r.ratioShipped} [${r.cat}]`).join(' | '));
console.log('strongest ratios:', best.map((r) => `${r.lane} ${r.ratioShipped} [${r.cat}]`).join(' | '));
fs.writeFileSync('bench/x89/receipts/leaders-shipped.json', JSON.stringify({ generatedFrom: ['bench/x88/receipts/leaders.json', 'bench/x89/receipts/front3.json'],
  note: 'ranked against tagstackEncode (shipped), not tagstackFrontier (gate)', totals: { raw: totRaw, gate: totGate, shipped: totShip, floor: totFloor }, summary, rows }, null, 1) + '\n');
