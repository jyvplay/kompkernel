/**
 * X68 ENGRAMMA warm A/B. Same process, shared pure tokenizer caches warmed by a
 * discarded first pass, then the SAME text is encoded with the memo off and with
 * the memo on. Both arms therefore start from an identical cache state; the only
 * difference is the sub-encode memo (engram.ts).
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { engramStats, engramClear, engramSize } from '../../src/lib/omega/engram';
const enc: any = 'o200k_base';
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const rows: any[] = [];
for (const path of process.argv.slice(2)) {
  const text = fs.readFileSync(path, 'utf8');
  // warm the tokenizer caches only (memo off), result discarded
  process.env.OMEGA_ENGRAM = '0';
  engramClear();
  tagstackEncode(text, enc);

  engramClear();
  let t0 = Date.now();
  const off = tagstackEncode(text, enc);
  const offMs = Date.now() - t0;

  delete process.env.OMEGA_ENGRAM;
  engramClear();
  t0 = Date.now();
  const on = tagstackEncode(text, enc);
  const onMs = Date.now() - t0;
  const onStats = { ...engramStats };

  rows.push({
    path, chars: text.length, memoOffMs: offMs, memoOnMs: onMs,
    ratio: +(offMs / Math.max(1, onMs)).toFixed(3),
    identicalMessage: off.message === on.message,
    messageSha256: sha(on.message), shaMatches: sha(off.message) === sha(on.message),
    identicalCosts: JSON.stringify(off.frontierCosts) === JSON.stringify(on.frontierCosts),
    frontier: Math.min(...Object.values(on.frontierCosts).map(Number)),
    winner: on.parentCodec, exact: on.decoded === text, memoOn: onStats, memoEntries: engramSize(),
  });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
fs.mkdirSync('bench/x68/receipts', { recursive: true });
fs.writeFileSync('bench/x68/receipts/engram-warm.json', JSON.stringify({ encoding: enc, node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null, rows }, null, 2) + '\n');
console.log(rows.every((r) => r.identicalMessage && r.exact) ? 'WARM A/B: MESSAGES IDENTICAL, DECODES EXACT' : 'WARM A/B: DEPENDENCE DETECTED');
