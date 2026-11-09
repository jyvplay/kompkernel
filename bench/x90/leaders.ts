/** X90 — leaders recomputed with ΣΥΜΦΥΊΑ in the stack. A PURE JOIN of committed receipts:
 *  zero frontier calls, so zero drift and no dependence on machine load.
 *    bench/x89/receipts/leaders-shipped.json  the X89 table (floors, categories, 34 lanes)
 *    bench/x89/receipts/front3-runG.json      run G pass 2: the 29 gate lanes, shipped tier
 *    bench/x90/receipts/run-extras.json       the 2 X88 extra lanes ΣΥΜΦΥΊΑ touches
 *  A lane's shipped number changes only if ΣΥΜΦΥΊΑ applied AND was byte exact AND was
 *  strictly smaller; the chain keeps the minimum over candidates, so no lane can regress. */
import * as fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('bench/x89/receipts/leaders-shipped.json', 'utf8'));
const g = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runG.json', 'utf8'));
const ex = JSON.parse(fs.readFileSync('bench/x90/receipts/run-extras.json', 'utf8'));

const newShipped = new Map<string, number>();
const newParent = new Map<string, string>();
// front3-runG.json's shipped-tier column is named `X` and its lane key is `lane`
// ("ls-l-real.txt"), which is the same key leaders-shipped.json uses. Verified by
// inspection rather than assumed: row0 = {path, lane, raw, X, parent, exact, runE, delta, ms}.
// KEYED BY path, NOT BY BASENAME. The 29-lane gate contains TWO DIFFERENT FILES NAMED
// df-h.txt -- bench/holdout-tbl/df-h.txt (570 raw, shipped 171) and
// bench/holdout-x42/df-h.txt (140 raw, shipped 108). Keying on the basename silently
// collapsed them to one entry and the first assertion below caught it (28 != 29). Both
// receipts carry `path` and their path sets align exactly, verified before use.
for (const r of (g.rows || g.lanes || [])) {
  const v = r.X ?? r.X74 ?? r.shipped ?? r.tokens;
  if (typeof v !== 'number') throw new Error(`run G row has no numeric shipped column: ${JSON.stringify(r)}`);
  if (!r.path) throw new Error(`run G row has no path: ${JSON.stringify(r)}`);
  newShipped.set(r.path, v);
}
if (newShipped.size !== 29) throw new Error(`expected 29 gate lanes from run G, got ${newShipped.size}`);
for (const r of ex.lanes) {
  // run-extras.json's `lane` field is already a full path
  if (r.applied && r.exact && r.messageTokens < r.shipped) { newShipped.set(r.lane, r.messageTokens); newParent.set(r.lane, 'ΣΥΜΦΥΊΑ'); }
}

const rows = base.rows.map((r: any) => {
  const before = r.shipped;
  const after = newShipped.has(r.path) ? Math.min(before, newShipped.get(r.path)!) : before;
  const lane = r.lane;
  return { ...r, shippedX89: before, shippedX90: after, movedBy: after - before,
    armX90: newParent.get(r.path) ?? (after < before ? 'ΣΥΜΦΥΊΑ' : r.shippedParent),
    ratioShippedX90: +(after / r.raw).toFixed(4), floorVsShippedX90: +(r.floor / after).toFixed(3) };
});

const cats = new Map<string, any>();
for (const r of rows) {
  const c = cats.get(r.cat) ?? { cat: r.cat, lanes: 0, raw: 0, gate: 0, shippedX89: 0, shippedX90: 0, floor: 0, moved: [] as string[] };
  c.lanes++; c.raw += r.raw; c.gate += r.gate; c.shippedX89 += r.shippedX89; c.shippedX90 += r.shippedX90; c.floor += r.floor;
  if (r.movedBy !== 0) c.moved.push(`${r.lane} ${r.movedBy}`);
  cats.set(r.cat, c);
}
const T = { lanes: 0, raw: 0, gate: 0, shippedX89: 0, shippedX90: 0, floor: 0 };
console.log(`${'category'.padEnd(14)} ${'lanes'.padStart(5)} ${'raw'.padStart(7)} ${'gate'.padStart(6)} ${'X89'.padStart(6)} ${'X90'.padStart(6)} ${'Δ'.padStart(4)} ${'ratio'.padStart(6)} ${'floor÷X90'.padStart(9)}   moved`);
const out: any[] = [];
for (const c of [...cats.values()].sort((a, b) => b.raw - a.raw)) {
  T.lanes += c.lanes; T.raw += c.raw; T.gate += c.gate; T.shippedX89 += c.shippedX89; T.shippedX90 += c.shippedX90; T.floor += c.floor;
  const line = `${c.cat.padEnd(14)} ${String(c.lanes).padStart(5)} ${String(c.raw).padStart(7)} ${String(c.gate).padStart(6)} ${String(c.shippedX89).padStart(6)} ${String(c.shippedX90).padStart(6)} ${String(c.shippedX90 - c.shippedX89).padStart(4)} ${(c.shippedX90 / c.raw).toFixed(3).padStart(6)} ${(c.floor / c.shippedX90).toFixed(3).padStart(9)}   ${c.moved.join(', ') || '—'}`;
  console.log(line);
  out.push({ ...c, ratio: +(c.shippedX90 / c.raw).toFixed(4), floorVsShipped: +(c.floor / c.shippedX90).toFixed(4) });
}
console.log(`${'ALL'.padEnd(14)} ${String(T.lanes).padStart(5)} ${String(T.raw).padStart(7)} ${String(T.gate).padStart(6)} ${String(T.shippedX89).padStart(6)} ${String(T.shippedX90).padStart(6)} ${String(T.shippedX90 - T.shippedX89).padStart(4)} ${(T.shippedX90 / T.raw).toFixed(3).padStart(6)} ${(T.floor / T.shippedX90).toFixed(3).padStart(9)}`);
const g29 = rows.filter((r: any) => r.src !== 'gate-only');
console.log(`\n29 gate lanes only: X89 ${g29.reduce((a: number, r: any) => a + r.shippedX89, 0)} -> X90 ${g29.reduce((a: number, r: any) => a + r.shippedX90, 0)}`);
console.log(`lanes moved: ${rows.filter((r: any) => r.movedBy !== 0).length} — ${rows.filter((r: any) => r.movedBy !== 0).map((r: any) => `${r.lane} ${r.movedBy}`).join(', ') || 'none'}`);
console.log(`lanes REGRESSED: ${rows.filter((r: any) => r.movedBy > 0).length} (must be 0; the chain keeps the minimum)`);
const lawFails = rows.filter((r: any) => r.floorVsShippedX90 >= 1.0);
console.log(`readability-price law floor÷stack < 1.00 fails on: ${lawFails.map((r: any) => `${r.lane} ${r.floorVsShippedX90}`).join(', ') || 'none'}`);
fs.writeFileSync('bench/x90/receipts/leaders-x90.json', JSON.stringify({
  note: 'X90 leaders, a PURE JOIN of bench/x89/receipts/leaders-shipped.json + bench/x89/receipts/front3-runG.json + bench/x90/receipts/run-extras.json. Zero frontier calls, so zero drift. A lane moves only if ΣΥΜΦΥΊΑ applied, was byte exact, and was strictly smaller.',
  byCategory: out, totals: { ...T, ratio: +(T.shippedX90 / T.raw).toFixed(4), floorVsShipped: +(T.floor / T.shippedX90).toFixed(4) },
  gate29: { x89: g29.reduce((a: number, r: any) => a + r.shippedX89, 0), x90: g29.reduce((a: number, r: any) => a + r.shippedX90, 0) },
  rows,
}, null, 1) + '\n');
console.log('\nwrote bench/x90/receipts/leaders-x90.json');
