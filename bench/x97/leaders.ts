/**
 * X96 — GENERALIZED LOCAL LEADERS, CURRENT STACK.  Pure join, ZERO frontier calls.
 *
 * WHY THIS IS RE-RUN.  X91's table (bench/x91/receipts/leaders-general.json) is the one the
 * user asked for and it is a join over bench/x90/receipts/leaders-x90.json, i.e. over the
 * X90 shipped tier.  ἸΣΟΜΟΡΦΊΑ has since moved 9 lanes, so that table is stale.  This script
 * re-derives `shipped` from bench/x89/receipts/front3-runL.json (RUN L, OMEGA_DET=1) and
 * re-joins the same category, floor and raw columns, so the leader list describes the stack
 * that is actually committed.
 *
 * WHAT IS NOT RE-MEASURED.  `raw`, `cat` and `floor` are imported from X90's receipt rather
 * than recomputed.  `raw` is a property of the file and cannot drift; `floor` is the
 * brotli-derived readability floor X90 computed per lane.  Neither is re-derived here, and
 * neither is claimed as a fresh measurement.
 *
 * THE LEADER RULE.  Lowest shipped/raw — the lane the stack compresses hardest.  Headline
 * leader restricted to raw >= 500 tokens, reported ALONGSIDE the unfiltered winner, because a
 * 60-token lane can top a ranking on a rounding artifact.
 *
 * KEYED BY PATH.  Two lanes share the basename df-h.txt and two share dpkg-l.txt.  Every row
 * prints its full path.
 *
 * SECOND AXIS.  shipped/floor is how close the result sits to the independent readability
 * floor.  `floor/shipped >= 1.00` is the readability-price law VIOLATION (the stack emitted
 * fewer tokens than the floor) — the opposite direction from what a naive comparison flags,
 * which is a bug this repository already paid for once.
 */
import * as fs from 'node:fs';

const CUR = 'bench/x99/receipts/front3-shipped-x99.json';
const GATE = 'bench/x86/receipts/frontier-runL.json';
const X90 = 'bench/x90/receipts/leaders-x90.json';
const OUT = 'bench/x99/receipts/leaders-x99.json';
const SIZE_FLOOR = 500;

const cur = JSON.parse(fs.readFileSync(CUR, 'utf8'));
const gate = JSON.parse(fs.readFileSync(GATE, 'utf8'));
const x90 = JSON.parse(fs.readFileSync(X90, 'utf8'));

const curByPath = new Map<string, any>();
for (const r of cur.rows) curByPath.set(r.path, r);
const gateByPath = new Map<string, any>();
for (const r of gate.rows) gateByPath.set(r.path, r);

const rows: any[] = [];
const unmatched: string[] = [];
for (const r of x90.rows) {
  const c = curByPath.get(r.path);
  const g = gateByPath.get(r.path);
  if (c === undefined) { unmatched.push(r.path); continue; }
  rows.push({
    path: r.path, cat: r.cat, raw: r.raw, floor: r.floor,
    gate: g ? g.tokens : null,
    shipped: c.X, shippedParent: c.parent, exact: c.exact,
    shippedX90: r.shippedX90, movedSinceX90: c.X - r.shippedX90,
  });
}
if (rows.length === 0) throw new Error('no lane matched the join — schema changed?');

const byBase = new Map<string, string[]>();
for (const r of rows) {
  const b = r.path.split('/').pop()!;
  byBase.set(b, [...(byBase.get(b) ?? []), r.path]);
}
const collisions = [...byBase.entries()].filter(([, v]) => v.length > 1);

const cats = [...new Set(rows.map(r => r.cat))].sort();
const out: any = { source: CUR, gate: GATE, categories: X90, sizeFloor: SIZE_FLOOR,
  unmatchedFromX90: unmatched, basenameCollisions: collisions.map(([b, v]) => ({ basename: b, paths: v })), categories: [] };

const L: string[] = [];
L.push(`GENERALIZED LOCAL LEADERS — CURRENT STACK (X96, ἸΣΟΜΟΡΦΊΑ admitted)`);
L.push(`join: shipped <- ${CUR} (RUN L, OMEGA_DET=1); gate <- ${GATE}; cat/raw/floor <- ${X90} (not re-measured)`);
L.push(`leader rule: lowest shipped/raw, headline leader restricted to raw >= ${SIZE_FLOOR}; both winners printed`);
L.push(`basename collisions (why leaders are keyed by path): ${collisions.length ? collisions.map(([b, v]) => `${b} [${v.join(' | ')}]`).join('; ') : 'none'}`);
L.push(`lanes in X90 with no RUN K row: ${unmatched.length ? unmatched.join(', ') : 'none'}`);
L.push('');
for (const cat of cats) {
  const rs = rows.filter(r => r.cat === cat);
  const raw = rs.reduce((a, r) => a + r.raw, 0);
  const sh = rs.reduce((a, r) => a + r.shipped, 0);
  const fl = rs.reduce((a, r) => a + r.floor, 0);
  const gt = rs.reduce((a, r) => a + (r.gate ?? 0), 0);
  const x90s = rs.reduce((a, r) => a + r.shippedX90, 0);
  const ranked = [...rs].sort((a, b) => (a.shipped / a.raw) - (b.shipped / b.raw));
  const big = ranked.filter(r => r.raw >= SIZE_FLOOR);
  const lead = big[0] ?? ranked[0];
  const leadU = ranked[0];
  const worst = ranked[ranked.length - 1];
  const viol = rs.filter(r => r.floor / r.shipped >= 1.0);
  const co: any = { cat, lanes: rs.length, raw, shipped: sh, gate: gt, floor: fl,
    ratio: +(sh / raw).toFixed(4), gateVsShipped: +(sh / gt).toFixed(4), floorVsShipped: +(fl / sh).toFixed(4),
    headroomVsFloor: +(100 * (1 - fl / sh)).toFixed(1),
    shippedX90: x90s, movedSinceX90: sh - x90s,
    leader: { path: lead.path, raw: lead.raw, shipped: lead.shipped, ratio: +(lead.shipped / lead.raw).toFixed(4), filtered: big.length > 0, parent: lead.shippedParent },
    leaderUnfiltered: { path: leadU.path, raw: leadU.raw, shipped: leadU.shipped, ratio: +(leadU.shipped / leadU.raw).toFixed(4) },
    worst: { path: worst.path, raw: worst.raw, shipped: worst.shipped, ratio: +(worst.shipped / worst.raw).toFixed(4) },
    readabilityLawViolations: viol.map(r => ({ path: r.path, floorVsShipped: +(r.floor / r.shipped).toFixed(4) })),
    ranking: ranked.map(r => ({ path: r.path, raw: r.raw, gate: r.gate, shipped: r.shipped, floor: r.floor,
      ratio: +(r.shipped / r.raw).toFixed(4), floorVsShipped: +(r.floor / r.shipped).toFixed(4),
      shippedX90: r.shippedX90, movedSinceX90: r.movedSinceX90, exact: r.exact, parent: r.shippedParent })) };
  out.categories.push(co);
  L.push(`## ${cat} — ${rs.length} lanes, raw ${raw} -> shipped ${sh} (ratio ${co.ratio}), gate ${gt} (gate/shipped ${co.gateVsShipped}), floor ${fl} (floor/shipped ${co.floorVsShipped}, headroom ${co.headroomVsFloor}%)`);
  L.push(`   LEADER (raw>=${SIZE_FLOOR}): ${lead.path}  ${lead.raw} -> ${lead.shipped}  ratio ${co.leader.ratio}  parent ${lead.shippedParent}`);
  if (leadU.path !== lead.path) L.push(`   leader without the size floor: ${leadU.path}  ${leadU.raw} -> ${leadU.shipped}  ratio ${co.leaderUnfiltered.ratio}`);
  L.push(`   weakest: ${worst.path}  ${worst.raw} -> ${worst.shipped}  ratio ${co.worst.ratio}`);
  L.push(`   readability-price law floor/shipped<1.00: ${viol.length ? 'VIOLATED on ' + viol.map(r => `${r.path} ${(r.floor / r.shipped).toFixed(3)}`).join(', ') : 'holds on all ' + rs.length}`);
  L.push(`   moved since X90: ${co.movedSinceX90 === 0 ? 'none' : co.movedSinceX90 + ' tokens'}`);
  L.push(`   full ranking (best first):`);
  for (const r of co.ranking) L.push(`     ${String(r.ratio).padStart(7)}  ${String(r.raw).padStart(5)} -> ${String(r.shipped).padStart(5)}  floor ${String(r.floor).padStart(5)}  fl/sh ${String(r.floorVsShipped).padStart(6)}  ${r.movedSinceX90 !== 0 ? `Δ${r.movedSinceX90}  ` : '      '}${r.path}`);
  L.push('');
}
const TR = rows.reduce((a, r) => a + r.raw, 0);
const TS = rows.reduce((a, r) => a + r.shipped, 0);
const TF = rows.reduce((a, r) => a + r.floor, 0);
out.totals = { lanes: rows.length, raw: TR, shipped: TS, floor: TF, ratio: +(TS / TR).toFixed(4), floorVsShipped: +(TF / TS).toFixed(4) };
L.push(`## ALL ${rows.length} JOINED LANES — raw ${TR} -> shipped ${TS} (ratio ${out.totals.ratio}), floor ${TF} (floor/shipped ${out.totals.floorVsShipped}, headroom ${(100 * (1 - TF / TS)).toFixed(1)}%)`);
L.push('');
L.push(`WHERE THE MONEY IS (headroom vs the independent readability floor):`);
for (const c of [...out.categories].sort((a, b) => b.headroomVsFloor - a.headroomVsFloor)) {
  L.push(`  ${String(c.headroomVsFloor).padStart(5)} %  ${c.cat.padEnd(12)} ${c.lanes} lanes  raw ${c.raw} -> shipped ${c.shipped}  floor ${c.floor}`);
}
fs.mkdirSync('bench/x96/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
fs.writeFileSync('bench/x99/receipts/leaders-x99.log', L.join('\n') + '\n');
console.log(L.join('\n'));
console.log(`\nwrote ${OUT} and bench/x99/receipts/leaders-x99.log`);
