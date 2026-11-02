/**
 * X68: ENGRAMMA A/B — memo OFF vs memo ON in one process, comparing the
 * complete message SHA-256 and every frontier cost, plus wall clock.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { countTokens } from '../../src/lib/omega/bpe';
import { engramStats, engramClear, engramSize } from '../../src/lib/omega/engram';
const enc: any = 'o200k_base';
const rows: any[] = [];
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
for (const path of process.argv.slice(2)) {
  const text = fs.readFileSync(path, 'utf8');
  process.env.OMEGA_ENGRAM = '0';
  engramClear();
  let t0 = Date.now();
  const off = tagstackEncode(text, enc);
  const offSib = siblingTemplateEncode(text, enc, off);
  const offMs = Date.now() - t0;
  const offStats = { ...engramStats };

  delete process.env.OMEGA_ENGRAM;
  engramClear();
  t0 = Date.now();
  const on = tagstackEncode(text, enc);
  const onSib = siblingTemplateEncode(text, enc, on);
  const onMs = Date.now() - t0;
  const onStats = { ...engramStats };

  const minOff = Math.min(...Object.values(off.frontierCosts).map(Number));
  const minOn = Math.min(...Object.values(on.frontierCosts).map(Number));
  const same = off.message === on.message && offSib.message === onSib.message
    && JSON.stringify(off.frontierCosts) === JSON.stringify(on.frontierCosts);
  rows.push({
    path, chars: text.length, rawTokens: countTokens(text, enc),
    memoOffMs: offMs, memoOnMs: onMs, ratio: +(offMs / Math.max(1, onMs)).toFixed(3),
    identicalCompleteMessage: off.message === on.message,
    identicalSiblingMessage: offSib.message === onSib.message,
    identicalFrontierCosts: JSON.stringify(off.frontierCosts) === JSON.stringify(on.frontierCosts),
    messageSha256Off: sha(off.message), messageSha256On: sha(on.message),
    frontierOff: minOff, frontierOn: minOn, winnerOff: off.parentCodec, winnerOn: on.parentCodec,
    exactOff: off.decoded === text, exactOn: on.decoded === text,
    memoOffStats: offStats, memoOnStats: onStats, memoEntries: engramSize(),
    allIdentical: same,
  });
  console.log(JSON.stringify(rows[rows.length - 1], null, 1));
}
fs.mkdirSync('bench/x68/receipts', { recursive: true });
fs.writeFileSync('bench/x68/receipts/engram-ab.json', JSON.stringify({ encoding: enc, node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null, rows }, null, 2) + '\n');
console.log(rows.every((r) => r.allIdentical) ? 'ALL LANES BYTE-IDENTICAL' : 'DEPENDENCE DETECTED');
if (!rows.every((r) => r.allIdentical)) process.exitCode = 1;
