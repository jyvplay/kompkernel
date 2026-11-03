/**
 * X71 speed receipt. For each lane: the complete message digest, its token
 * count, and wall clock of the whole frontier. The digest is the fidelity
 * check: a speed patch is admissible only when EVERY digest is unchanged.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
const outFile = process.env.OUT ?? 'bench/x71/receipts/speed-after.json';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const ms = Date.now() - t0;
  const sha = crypto.createHash('sha256').update(r.message, 'utf8').digest('hex').slice(0, 16);
  rows.push({ path: p, raw: countTokens(text, enc), tokens: r.messageTokens, winner: r.parentCodec, exact: r.decoded === text, sha, ms });
  console.error(`${p}\t${r.messageTokens}\t${sha}\t${ms}ms\t${r.parentCodec}\texact=${r.decoded === text}`);
  fs.mkdirSync('bench/x71/receipts', { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ node: process.version, encoding: enc, OMEGA_DET: process.env.OMEGA_DET ?? null, rows }, null, 1) + '\n');
}
