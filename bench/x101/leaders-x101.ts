/**
 * X101 — ΗΓΕΜΟΝΕΣ: the generalized local-leaders table, rebuilt on the X101 configuration.
 *
 * Same construction as bench/x99/leaders-x99.ts and the same rules: `raw` and `floor` are IMPORTED
 * from bench/x90/receipts/leaders-x90.json and are NOT re-measured (they are the X90 entropy-tier
 * floor, which is not reachable by a readable codec and is only a denominator); `shipped` is the
 * chain's own output measured in THIS process; and the table makes ZERO frontier calls, so it cannot
 * perturb or be perturbed by a timing run.
 *
 * The categories are the same four the stack has used since X90 — OPS TABLE, OPS LISTING,
 * CODE/MARKUP, DATA, PROSE — because the X97 cost-centre census showed the tape share is what
 * separates them (25-40 % for ops, 9 % for prose) and that split still predicts where the wire-level
 * codecs pay.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const floor90 = JSON.parse(fs.readFileSync('bench/x90/receipts/leaders-x90.json', 'utf8'));
const byPath = new Map<string, any>();
for (const r of (floor90.rows as any[])) byPath.set(r.path, r);
// The category labels are IMPORTED from the X90 receipt, not re-derived by a regex here: the X90
// categorisation is the one the stack has reported since X90, and re-deriving it with a pattern of my
// own silently reclassifies lanes (my first attempt put every lane in OPS and matched no PROSE lane
// at all, because this 29-lane set contains no lane whose name looks like prose).
const CAT_OF = new Map<string, string>();
for (const r of (floor90.rows as any[])) CAT_OF.set(r.path, r.cat);
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const groups = new Map<string, any[]>();
const seen = new Set<string>();
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const f = byPath.get(r.path);
  const row = { lane: r.lane, path: r.path, raw: f ? f.raw : null, shipped: R.messageTokens, floor: f ? f.floor : null };
  const cat = CAT_OF.get(r.path) ?? 'OTHER';
  if (!groups.has(cat)) groups.set(cat, []);
  groups.get(cat)!.push(row);
  seen.add(r.path);
}
const order = ['OPS TABLE', 'OPS LISTING', 'CODE / MARKUP', 'DATA', 'PROSE', 'OTHER'];
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
  // headroom = the fraction of the ACHIEVABLE saving (raw - floor) that is still unclaimed.
  // (An earlier version of this probe printed 1 - (raw-floor)/(raw-shipped), which is negative on
  //  every category here and is meaningless; the shipped measurements were not affected.)
  const head = raw > fl ? (ship - fl) / (raw - fl) : null;
  const price = ship > 0 ? (ship - fl) / ship : null;
  out.push({ category: name, lanes: rows.length, raw, shipped: ship, floor: fl, ratio: ship / raw, headroom: head, readabilityPrice: price, leader: lead, rows });
  console.log(`${name.padEnd(14)} ${String(rows.length).padStart(2)} lanes  raw ${String(raw).padStart(5)} -> shipped ${String(ship).padStart(5)} (${(ship / raw).toFixed(4)})  floor ${String(fl).padStart(5)}  headroom ${((head ?? 0) * 100).toFixed(1)}%  price ${((price ?? 0) * 100).toFixed(1)}%  leader ${lead.lane} ${lead.raw}->${lead.shipped}`);
  for (const r of rows) console.log(`    ${r.lane.padEnd(22)} raw ${String(r.raw).padStart(5)}  shipped ${String(r.shipped).padStart(5)}  floor ${String(r.floor).padStart(5)}  saved ${String((r.raw ?? 0) - r.shipped).padStart(5)}`);
}
fs.writeFileSync('bench/x101/receipts/leaders-x101.json', JSON.stringify({ note: 'X101 leaders: raw/floor imported from X90, shipped measured in this process, zero frontier calls', groups: out, totals: { lanes: n, raw: gRaw, shipped: gShip, floor: gFloor } }, null, 1));
const gHead = gRaw > gFloor ? (gShip - gFloor) / (gRaw - gFloor) : null;
console.log(`\nΗΓΕΜΟΝΕΣ, all ${n} lanes: raw ${gRaw} -> shipped ${gShip} (${(gShip / gRaw).toFixed(4)}), floor ${gFloor}, headroom ${((gHead ?? 0) * 100).toFixed(1)}%, readability price ${(100 * (1 - gFloor / gShip)).toFixed(2)}%`);
