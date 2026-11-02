/**
 * X67 speed lane: complete-message equivalence of the OURA entry-state memo.
 *
 * For each lane the TAGSTACK frontier is measured twice in one process — once
 * with the memo disabled (OMEGA_OURA_MEMO=0) and once with it enabled — and the
 * complete message, its SHA-256, every frontier cost and the replay counters are
 * compared. Caches inside bpe.ts are pure memos, so a warm second run cannot
 * change a number.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { ouraMemoStats, ouraMemoClear } from '../../src/lib/omega/oura';

const enc: any = 'o200k_base';
const lanes = process.argv.slice(2);
const rows: any[] = [];
let fail = 0;

for (const path of lanes) {
  const text = fs.readFileSync(path, 'utf8');
  process.env.OMEGA_OURA_MEMO = '0';
  ouraMemoClear();
  const t0 = Date.now();
  const off = tagstackEncode(text, enc);
  const offMs = Date.now() - t0;
  const offSib = siblingTemplateEncode(text, enc, off);

  delete process.env.OMEGA_OURA_MEMO;
  ouraMemoClear();
  const t1 = Date.now();
  const on = tagstackEncode(text, enc);
  const onMs = Date.now() - t1;
  const onSib = siblingTemplateEncode(text, enc, on);
  const stats = ouraMemoStats();

  const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  const sameMessage = off.message === on.message;
  const sameCosts = JSON.stringify(off.frontierCosts) === JSON.stringify(on.frontierCosts);
  const sameDecoded = off.decoded === text && on.decoded === text
    && Buffer.compare(Buffer.from(on.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const sameSibling = offSib.message === onSib.message;
  if (!(sameMessage && sameCosts && sameDecoded && sameSibling)) fail++;
  rows.push({
    path, chars: text.length, rawTokens: countTokens(text, enc),
    memoOffMs: offMs, memoOnMs: onMs, ratio: +(offMs / Math.max(1, onMs)).toFixed(3),
    sameCompleteMessage: sameMessage, messageSha256: [sha(off.message), sha(on.message)],
    sameFrontierCosts: sameCosts, frontierComplete: on.frontierComplete,
    frontierTokens: Math.min(...Object.values(on.frontierCosts).map(Number)),
    winner: on.parentCodec, frontierCosts: on.frontierCosts,
    decodedEqualsSource: sameDecoded, siblingSame: sameSibling,
    memo: stats, note: 'in-process A/B; the ON run follows the OFF run, so both share warm pure token caches',
  });
  console.log(JSON.stringify(rows[rows.length - 1], null, 1));
}
fs.mkdirSync('bench/x67/receipts', { recursive: true });
fs.writeFileSync('bench/x67/receipts/frontier-ab.json', JSON.stringify({ encoding: enc, node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null, rows }, null, 2) + '\n');
console.log(fail === 0 ? 'ALL LANES BYTE-IDENTICAL' : `${fail} LANE(S) DIFFER`);
if (fail) process.exitCode = 1;
