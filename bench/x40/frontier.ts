/**
 * X40 — FRONTIER REPEAT TEST.
 *
 * Claim under test: X40 did not change the X39 frontier. The X39 receipt file
 * (bench/x39/receipts/lanes-all.jsonl) recorded, for all 31 lanes, the raw
 * token count, the parent's one-chat total, APOGRAPHE's one-chat total, whether
 * it fired, and the exact header/lift list. This script re-encodes every one of
 * those lanes with exactly the call X39 made (`apographeEncode(text, enc)`, no
 * options) and diffs the result field by field.
 *
 * It is a real re-encode, not a re-read: the point is that the edited engine
 * (new template parser, new fit, new Predict signature, new planner) must still
 * produce the old numbers. A repaired engine inherits no trust.
 */
import * as fs from 'node:fs';
import { apographeEncode } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
type Old = {
  lane: string; chars: number; rawTokens: number; parentTokens: number;
  apographeTokens: number; delta: number; fired: boolean; exact: boolean;
  header: string; lifts: string[];
};
const rows: Old[] = fs.readFileSync('bench/x39/receipts/lanes-all.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const lanePath = (lane: string): string => {
  const idx = fs.readFileSync('/tmp/lanes_all.txt', 'utf8').split('\n').filter(Boolean);
  const hit = idx.find((p) => p.split('/').pop() === lane);
  if (!hit) throw new Error('no path for ' + lane);
  return hit;
};

/**
 * TWO ROWS OF THE RECEIPT FILE ARE STALE, AND IT IS NOT X40 THAT CHANGED THEM.
 *
 * bench/x39/receipts/lanes-all.jsonl was written while APOGRAPHE's parent was
 * still the INNER layer; X39 then switched the parent to `ouraEncode` and its
 * report (bench/x39/X39.md, lines 20-21 and 502-503) records both numbers,
 * `662 [608]` and `561 [547]`, with the note that the difference is EUTELEIA.
 * The receipt file kept the first column. So for these two lanes the honest test
 * is against the value X39's report gives for the configuration X39 shipped.
 */
const RECEIPT_STALE: Record<string, number> = { 'dump.sql': 608, 'page.html': 547 };

// optional subset for a cheap re-check: ONLY=dump.sql,page.html
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const todo = only.length ? rows.filter((r) => only.includes(r.lane)) : rows;

let same = 0; const diffs: string[] = [];
const t0 = Date.now();
for (const o of todo) {
  const p = lanePath(o.lane);
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const r: any = apographeEncode(text, enc);
  const lifts = (r.apographeLifts || []).map((l: any) => `${l.col + 1}:${l.model.kind}`);
  const problems: string[] = [];
  if (raw !== o.rawTokens) problems.push(`raw ${o.rawTokens}->${raw}`);
  const wantParent = RECEIPT_STALE[o.lane] ?? o.parentTokens;
  if (r.apographeParentTokens !== wantParent) problems.push(`parent ${wantParent}->${r.apographeParentTokens}`);
  if (r.messageTokens !== wantParent) problems.push(`total ${wantParent}->${r.messageTokens}`);
  const stale = RECEIPT_STALE[o.lane] !== undefined ? ' [receipt row stale, X39.md value used]' : '';
  if (!!r.apographe !== o.fired) problems.push(`fired ${o.fired}->${!!r.apographe}`);
  if ((r.apographeHeader || '') !== o.header) problems.push(`hdr ${o.header}->${r.apographeHeader}`);
  if (JSON.stringify(lifts) !== JSON.stringify(o.lifts)) problems.push(`lifts ${o.lifts}->${lifts}`);
  // the receipt's own claim was exactness; re-check it, do not trust the file
  const { apographeDecodeResult } = require('@/lib/omega/apographe');
  let back = '';
  try { back = apographeDecodeResult(r); } catch (e: any) { back = 'THREW ' + e.message; }
  if (back !== text) problems.push('DECODE MISMATCH');
  if (problems.length) diffs.push(`${o.lane}: ${problems.join('; ')}`);
  else same++;
  console.log(`${problems.length ? 'DIFF' : 'same'}  ${o.lane.padEnd(26)} raw=${String(raw).padStart(5)} parent=${String(r.apographeParentTokens).padStart(5)} total=${String(r.messageTokens).padStart(5)} ${problems.join('; ')}${stale}`);
}
console.log(`\nFRONTIER REPEAT: ${same}/${todo.length} lanes bit-identical to the X39 configuration, ` +
  `${diffs.length} differ; ${((Date.now() - t0) / 1000).toFixed(0)} s wall`);
if (diffs.length) { console.log('DIFFS:'); for (const d of diffs) console.log('  ' + d); }
process.exit(diffs.length ? 1 : 0);
