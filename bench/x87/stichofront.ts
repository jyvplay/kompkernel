/** X87 — the honest cost of the EXISTING column-program arm.
 *  `stichomythiaEncode` gates on `countTokens(message)` against `countTokens(source)`.
 *  But the message is read by a frontier that re-encodes it, so the comparable number is
 *  F(message) against F(source). This measures both, for the same message. */
import * as fs from 'node:fs';
import { stichomythiaEncode } from '../../src/lib/omega/stichomythia';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const r = stichomythiaEncode(S, enc);
  const t0 = Date.now();
  const fid = tagstackFrontier(S, enc);
  const t1 = Date.now();
  const fmsg = r.applied ? tagstackFrontier(r.message, enc) : null;
  rows.push({ lane: p.split('/').pop(), raw: countTokens(S, enc), applied: r.applied,
    stichoMsgRaw: r.messageTokens, F_src: fid.messageTokens, parent: fid.parentCodec,
    F_msg: fmsg?.messageTokens ?? null, delta: fmsg ? fmsg.messageTokens - fid.messageTokens : null,
    eeExact: fmsg ? (fmsg.decoded === r.message && r.decoded === S) : null,
    rows: r.rows, cols: r.cols, models: r.models, secs: +((Date.now() - t0) / 1000).toFixed(1) });
  const x = rows[rows.length - 1];
  console.log(`${x.lane.padEnd(22)} raw=${String(x.raw).padStart(5)} stichoMsgRaw=${String(x.stichoMsgRaw).padStart(5)} applied=${x.applied} F(src)=${String(x.F_src).padStart(5)} F(msg)=${String(x.F_msg).padStart(5)} delta=${String(x.delta).padStart(6)} ee=${x.eeExact} ${x.secs}s`);
  fs.mkdirSync('bench/x87/receipts', { recursive: true });
  fs.writeFileSync('bench/x87/receipts/sticho-frontier.json', JSON.stringify({ rows }, null, 1) + '\n');
}
