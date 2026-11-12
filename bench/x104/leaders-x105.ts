/**
 * X105 — ΗΓΕΜΟΝΕΣ: the generalized local-leaders table, rebuilt on the
 * DETERMINISTIC chain (X104's clock repair), at the SHIPPED tier.
 *
 * Same construction and the same rules as bench/x101/leaders-x101.ts:
 *   - `raw` and `floor` are IMPORTED from bench/x90/receipts/leaders-x90.json and
 *     are NOT re-measured. The floor is the X90 entropy tier, which is not
 *     reachable by a readable codec and is only a denominator.
 *   - the CATEGORY LABELS are imported from the same receipt, not re-derived by a
 *     regex: re-deriving them silently reclassifies lanes.
 *   - `shipped` is the chain's own output measured in THIS process, and the table
 *     makes ZERO frontier calls so it cannot perturb a timing run.
 *
 * What is new and generalized:
 *   1. PER-LANE ABSOLUTE HEADROOM, `shipped - floor`, which is the actionable
 *      number: a category's headroom FRACTION is largest on prose but its
 *      headroom TOKENS is smallest, and the two order the categories differently.
 *   2. The parent codec each lane actually took, so a leader is attributable.
 *   3. A per-lane "opportunity rank" = absolute headroom, which is the ordering a
 *      practitioner should work down.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const floor90 = JSON.parse(fs.readFileSync('bench/x90/receipts/leaders-x90.json', 'utf8'));
const byPath = new Map<string, any>();
for (const r of (floor90.rows as any[])) byPath.set(r.path, r);
const CAT_OF = new Map<string, string>();
for (const r of (floor90.rows as any[])) CAT_OF.set(r.path, r.cat);
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];

const groups = new Map<string, any[]>();
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const f = byPath.get(r.path);
  const shipped = R.messageTokens;
  const floor = f ? f.floor : null;
  const raw = f ? f.raw : null;
  const row = {
    lane: r.lane, path: r.path, raw, shipped, floor,
    absHeadroom: floor === null ? null : shipped - floor,
    fracHeadroom: (raw !== null && floor !== null && raw > floor) ? (shipped - floor) / (raw - floor) : null,
    parent: R.parentCodec ?? R.parent ?? null,
    exact: R.decoded === text,
  };
  const cat = CAT_OF.get(r.path) ?? 'OTHER';
  if (!groups.has(cat)) groups.set(cat, []);
  groups.get(cat)!.push(row);
  fs.appendFileSync('bench/x104/receipts/leaders-x105.log',
    `${cat}\t${r.lane}\t${raw}\t${shipped}\t${floor}\t${row.absHeadroom}\t${row.exact}\t${row.parent}\n`);
}

const order = ['OPS TABLE', 'OPS LISTING', 'CODE / MARKUP', 'DATA', 'PROSE', 'OTHER'];
const out: any[] = [];
let gRaw = 0, gShip = 0, gFloor = 0, n = 0, inexact = 0;
for (const name of order) {
  const rows = (groups.get(name) ?? []).slice().sort((a, b) => (b.absHeadroom ?? 0) - (a.absHeadroom ?? 0));
  if (!rows.length) continue;
  const raw = rows.reduce((a, b) => a + (b.raw ?? 0), 0);
  const ship = rows.reduce((a, b) => a + b.shipped, 0);
  const fl = rows.reduce((a, b) => a + (b.floor ?? 0), 0);
  const abs = ship - fl;
  const lead = rows[0];
  gRaw += raw; gShip += ship; gFloor += fl; n += rows.length;
  inexact += rows.filter(r => !r.exact).length;
  const head = raw > fl ? (ship - fl) / (raw - fl) : null;
  const price = ship > 0 ? (ship - fl) / ship : null;
  out.push({ category: name, lanes: rows.length, raw, shipped: ship, floor: fl, absHeadroom: abs,
             ratio: ship / raw, headroom: head, readabilityPrice: price, leader: lead, rows });
  console.log(`${name.padEnd(14)} ${String(rows.length).padStart(2)} lanes  raw ${String(raw).padStart(5)} -> shipped ${String(ship).padStart(5)} (${(ship / raw).toFixed(4)})  floor ${String(fl).padStart(5)}  HEADROOM ${String(abs).padStart(4)} tok (${((head ?? 0) * 100).toFixed(1)}% of achievable)  price ${((price ?? 0) * 100).toFixed(1)}%  leader ${lead.lane} ${lead.raw}->${lead.shipped} (abs ${lead.absHeadroom})`);
}
console.log(`\nALL ${n} lanes  raw ${gRaw} -> shipped ${gShip} (${(gShip / gRaw).toFixed(4)})  floor ${gFloor}  HEADROOM ${gShip - gFloor} tok  inexact ${inexact}/${n}`);
// the actionable ordering: largest absolute headroom first, across all categories
const all = out.flatMap(g => g.rows).sort((a, b) => (b.absHeadroom ?? 0) - (a.absHeadroom ?? 0));
console.log('\nTOP OPPORTUNITIES BY ABSOLUTE HEADROOM (tokens still claimable above the entropy floor):');
for (const r of all.slice(0, 12)) console.log(`  ${String(r.absHeadroom).padStart(4)} tok  ${r.lane.padEnd(24)} raw ${String(r.raw).padStart(5)} shipped ${String(r.shipped).padStart(5)} floor ${String(r.floor).padStart(5)} parent ${r.parent}`);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/leaders-x105.json',
  JSON.stringify({ det: '1 (live, X104)', groups: out, totals: { lanes: n, raw: gRaw, shipped: gShip, floor: gFloor, absHeadroom: gShip - gFloor, inexact } }, null, 1) + '\n');
