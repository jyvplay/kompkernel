/**
 * X114 leaders refresh. ZERO encoder/frontier calls: `shipped` is imported from
 * the completed X114 baseline receipt (the shipped tagstackEncode chain under the
 * pinned audit flags); `raw`, `floor` and category labels are imported from the
 * X90 leaders receipt exactly as X101 did. This cannot perturb a timing run.
 */
import * as fs from 'node:fs';

const baseline = JSON.parse(fs.readFileSync(process.argv[2] ?? 'bench/x114/receipts/baseline.json', 'utf8'));
const floor90 = JSON.parse(fs.readFileSync('bench/x90/receipts/leaders-x90.json', 'utf8'));
const byPath = new Map<string, any>();
for (const r of floor90.rows as any[]) byPath.set(r.path, r);
const order = ['OPS TABLE', 'OPS LISTING', 'CODE / MARKUP', 'DATA', 'PROSE', 'OTHER'];
const groups = new Map<string, any[]>();
for (const r of baseline.rows as any[]) {
  const f = byPath.get(r.path);
  const cat = f?.cat ?? 'OTHER';
  const row = { lane: r.path.split('/').pop(), path: r.path, cat,
    raw: f?.raw ?? r.raw, shipped: r.tokens, floor: f?.floor ?? null,
    parent: r.parent, exact: r.exact };
  if (!groups.has(cat)) groups.set(cat, []);
  groups.get(cat)!.push(row);
}
const out: any[] = [];
let gRaw = 0, gShip = 0, gFloor = 0, n = 0;
for (const name of order) {
  const rows = (groups.get(name) ?? []).slice().sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0));
  if (!rows.length) continue;
  const raw = rows.reduce((a, b) => a + (b.raw ?? 0), 0);
  const ship = rows.reduce((a, b) => a + b.shipped, 0);
  const fl = rows.reduce((a, b) => a + (b.floor ?? 0), 0);
  const lead = rows[0];
  gRaw += raw; gShip += ship; gFloor += fl; n += rows.length;
  const head = raw > fl ? (ship - fl) / (raw - fl) : null;
  const price = ship > 0 ? (ship - fl) / ship : null;
  out.push({ category: name, lanes: rows.length, raw, shipped: ship, floor: fl,
    ratio: ship / raw, headroom: head, readabilityPrice: price, leader: lead, rows });
  console.log(`${name.padEnd(14)} ${String(rows.length).padStart(2)} lanes  raw ${String(raw).padStart(5)} -> shipped ${String(ship).padStart(5)} (${(ship / raw).toFixed(4)})  floor ${String(fl).padStart(5)}  headroom ${((head ?? 0) * 100).toFixed(1)}%  price ${((price ?? 0) * 100).toFixed(1)}%  leader ${lead.lane} ${lead.raw}->${lead.shipped}`);
  for (const r of rows) console.log(`    ${r.lane.padEnd(22)} raw ${String(r.raw).padStart(5)}  shipped ${String(r.shipped).padStart(5)}  floor ${String(r.floor ?? '-').padStart(5)}  saved ${String((r.raw ?? 0) - r.shipped).padStart(5)}  parent ${r.parent}`);
}
const gHead = gRaw > gFloor ? (gShip - gFloor) / (gRaw - gFloor) : null;
const receipt = { schema: 'kompkernel-x114-leaders-v1', date: '2026-11-14',
  note: 'shipped imported from X114 baseline receipt; raw/floor/category imported from X90; zero encoder calls',
  baselineSchema: baseline.schema, baselineSourceCommit: baseline.sourceCommit,
  groups: out, totals: { lanes: n, raw: gRaw, shipped: gShip, floor: gFloor, headroom: gHead,
    readabilityPrice: gShip > 0 ? (gShip - gFloor) / gShip : null } };
fs.mkdirSync('bench/x114/receipts', { recursive: true });
fs.writeFileSync('bench/x114/receipts/leaders-x114.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`\nΗΓΕΜΟΝΕΣ, all ${n} lanes: raw ${gRaw} -> shipped ${gShip} (${(gShip / gRaw).toFixed(4)}), floor ${gFloor}, headroom ${((gHead ?? 0) * 100).toFixed(1)}%, readability price ${(100 * (1 - gFloor / gShip)).toFixed(2)}%`);
