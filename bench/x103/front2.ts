/**
 * X103 — FRONTIER RE-CONFIRMATION, WITH THE MEMO SETTING NAMED.
 *
 * bench/x102/receipts/frontier-runX102b.json records 12 639 for the base stack.
 * bench/x103/settle.ts reproduced 12 695 under OMEGA_DET=1 + OMEGA_NO_MEMO=1 and
 * reported 5 of 29 lanes as moved — every one of them WORSE.  A registry arm
 * cannot move `tagstackFrontier`, because that function calls
 * `tagstackEncodeUncached` -> `tagstackEncodeInner` and never reaches
 * `tagstackX74Chain`, which is where every registry arm is admitted.  So the
 * movement is a measurement-setting difference, not a code regression, and the
 * only setting that differs is the X67 OURA memo, which OMEGA_NO_MEMO does not
 * cover.
 *
 * This probe runs the same 29 lanes with OMEGA_OURA_MEMO=0 (and the engram memo
 * off, workmeter.ts:163 names that pair as the measurement protocol) and diffs
 * lane by lane against the X102 receipt.  Whatever number comes out is reported
 * with the setting that produced it.
 */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_OURA_MEMO = '0';
process.env.OMEGA_ENGRAM = '0';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const prev = JSON.parse(fs.readFileSync('bench/x102/receipts/frontier-runX102b.json', 'utf8'));
const prevByPath = new Map<string, any>(prev.rows.map((r: any) => [r.path, r]));
const rows: any[] = [];
let total = 0, exact = 0, moved = 0;
const t0 = Date.now();
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackFrontier(text, enc);
  const p = prevByPath.get(r.path);
  const m = p ? (p.tokens !== R.messageTokens || p.parent !== R.parentCodec) : null;
  if (m) moved++;
  const ex = R.decoded === text;
  if (ex) exact++;
  total += R.messageTokens;
  rows.push({ lane: r.lane, path: r.path, tokens: R.messageTokens, prev: p ? p.tokens : null, parent: R.parentCodec, prevParent: p ? p.parent : null, moved: m, exact: ex });
  console.log(`${r.lane.padEnd(22)} F=${String(R.messageTokens).padStart(5)}${m ? ` (x102 ${p.tokens})` : '          '} parent=${R.parentCodec} exact=${ex}`);
}
fs.writeFileSync('bench/x103/receipts/front2.json', JSON.stringify({
  note: 'X103 FRONTIER re-confirmation, base stack (tagstackFrontier -> tagstackEncodeInner, no registry arms). Setting: OMEGA_DET=1, OMEGA_NO_MEMO=1, OMEGA_OURA_MEMO=0, OMEGA_ENGRAM=0. Diffed against bench/x102/receipts/frontier-runX102b.json (12 639).',
  setting: { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_OURA_MEMO: '0', OMEGA_ENGRAM: '0' },
  total, prevTotal: prev.total, moved, exact, lanes: rows.length, ms: Date.now() - t0, rows,
}, null, 1));
console.log(`\nFRONTIER (base stack, OURA+engram memos off) ${rows.length} lanes TOTAL ${total} exact ${exact}/${rows.length} ms ${Date.now() - t0}`);
console.log(`  X102 receipt: ${prev.total}; lanes differing: ${moved}`);
