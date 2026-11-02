/**
 * X70 frontier census. For each lane: raw tokens, identity+contract tokens,
 * the TAGSTACK frontier message and its per-parent cost vector, exactness.
 * Everything is measured directly; nothing is estimated.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';

const enc: any = 'o200k_base';
const out: any[] = [];
const paths = process.argv.slice(2);
for (const path of paths) {
  const text = fs.readFileSync(path, 'utf8');
  const t0 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const ms = Date.now() - t0;
  const sha = crypto.createHash('sha256').update(r.message, 'utf8').digest('hex');
  const row = {
    path, chars: text.length, rawTokens: countTokens(text, enc),
    messageChars: r.message.length, messageTokens: r.messageTokens, messageSha256: sha,
    winner: r.parentCodec, frontierCosts: r.frontierCosts,
    frontierComplete: r.frontierComplete, exact: r.decoded === text,
    arm: r.arm, ms,
  };
  // sibling template (a registry-level wrapper that may win)
  let sib: any = null;
  try {
    const s = siblingTemplateEncode(text, enc, r);
    sib = { tokens: s.messageTokens, codec: s.codec, exact: s.decoded === text, delta: s.messageTokens - r.messageTokens };
  } catch (e) { sib = { error: String(e) }; }
  (row as any).sibling = sib;
  out.push(row);
  console.error(`${path}: raw ${row.rawTokens} frontier ${row.messageTokens} (${row.winner}) sib ${sib?.tokens ?? '?'} ${ms}ms exact=${row.exact}`);
  fs.mkdirSync('bench/x70/receipts', { recursive: true });
  fs.writeFileSync('bench/x70/receipts/frontier.json', JSON.stringify({ encoding: enc, node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null, rows: out }, null, 2) + '\n');
}
console.log(JSON.stringify(out, null, 1));
