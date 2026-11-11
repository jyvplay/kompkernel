/**
 * X103 — SETTLE THE MEASUREMENT.
 *
 * Three probes this turn and last reported three different `tagstackEncode`
 * totals for what should be the same configuration: 12 405 (x102/diagraphe29
 * arm B), 12 415 (x103/proagoge29 arm A), 12 416 (x103/anagennesis base).  A
 * difference of that size between identical configurations is either
 * non-determinism or a lane-set mismatch, and neither may be averaged away.
 *
 * This probe runs, IN ONE PROCESS, on the same 29 lanes, under the same
 * environment:
 *   (a) tagstackFrontier   — the base stack that bench/x86/front.ts measures
 *   (b) tagstackEncode with ΠΡΟΑΓΩΓΗ disabled
 *   (c) tagstackEncode with ΠΡΟΑΓΩΓΗ enabled
 * and prints the full ΠΡΟΑΓΩΓΗ note for every lane, untruncated.
 *
 * (b) and (c) are the A/B.  (a) is the control: it must reproduce
 * bench/x102/receipts/frontier-runX102b.json's 12 639 exactly, or the frontier
 * itself has moved and the earlier receipt is stale.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const prev = JSON.parse(fs.readFileSync('bench/x102/receipts/frontier-runX102b.json', 'utf8'));
const prevByPath = new Map<string, any>(prev.rows.map((r: any) => [r.path, r]));
const rows: any[] = [];
let gF = 0, gA = 0, gB = 0, frontierMoved = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const F: any = tagstackFrontier(text, enc);
  const p = prevByPath.get(r.path);
  const moved = p ? (p.tokens !== F.messageTokens || p.parent !== F.parentCodec || p.exact !== (F.decoded === text)) : null;
  if (moved) frontierMoved++;
  process.env.OMEGA_NO_PROAGOGE = '1';
  const A: any = tagstackEncode(text, enc);
  delete process.env.OMEGA_NO_PROAGOGE;
  const B: any = tagstackEncode(text, enc);
  gF += F.messageTokens; gA += A.messageTokens; gB += B.messageTokens;
  const pg = String(B.notes).split(';').filter((s: string) => s.includes('proagoge')).join(';').trim();
  rows.push({ lane: r.lane, path: r.path, frontier: F.messageTokens, prevFrontier: p ? p.tokens : null, frontierMoved: moved, armA: A.messageTokens, armB: B.messageTokens, delta: B.messageTokens - A.messageTokens, proagogeNote: pg, exact: F.decoded === text && A.decoded === text && B.decoded === text });
  console.log(`${r.lane.padEnd(22)} F=${String(F.messageTokens).padStart(5)}${moved ? ' MOVED' : '     '} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} Δ=${String(B.messageTokens - A.messageTokens).padStart(3)}  ${pg || '(no proagoge note)'}`);
}
fs.writeFileSync('bench/x103/receipts/settle.json', JSON.stringify({
  note: 'X103 SETTLE: one process, 29 lanes, OMEGA_DET=1 OMEGA_NO_MEMO=1. (a) tagstackFrontier = the base stack bench/x86/front.ts measures; (b) tagstackEncode PROAGOGE off; (c) on.',
  env: { OMEGA_DET: '1', OMEGA_NO_MEMO: '1' },
  totals: { frontier: gF, armA: gA, armB: gB, delta: gB - gA, frontierMoved, frontierPrevTotal: prev.total },
  rows,
}, null, 1));
console.log(`\nSETTLE: frontier ${gF} (previous receipt ${prev.total}, lanes moved ${frontierMoved}/29)  encode A=${gA} B=${gB} Δ=${gB - gA}`);
