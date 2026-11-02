/**
 * X68 local-leader measurement: full TAGSTACK+SIBLING frontier per lane, with
 * every parent cost, the winner, the complete-message digest and exactness.
 * One process, one lane at a time; memo left at its default (ON) because the
 * message is provably unchanged and the point of the table is the token count.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = tagstackEncode(t, enc);
  const sib = siblingTemplateEncode(t, enc, r);
  const ms = Date.now() - t0;
  const costs = r.frontierCosts as Record<string, number>;
  const min = Math.min(...Object.values(costs).map(Number));
  rows.push({
    f, chars: t.length, raw: countTokens(t, enc), frontier: min, winner: r.parentCodec,
    savingPct: +(((countTokens(t, enc) - min) / countTokens(t, enc)) * 100).toFixed(1),
    costs, sibling: sib.messageTokens, siblingWins: sib.messageTokens < min,
    exact: r.decoded === t, ms,
  });
  console.log(JSON.stringify(rows[rows.length - 1]));
  // write after every lane so a bad path later in the list cannot lose the rows
  fs.mkdirSync('bench/x68/receipts', { recursive: true });
  fs.writeFileSync('bench/x68/receipts/leaders.json',
    JSON.stringify({ encoding: enc, node: process.version, rows }, null, 2) + '\n');
}
fs.mkdirSync('bench/x68/receipts', { recursive: true });
fs.writeFileSync('bench/x68/receipts/leaders.json', JSON.stringify({ encoding: enc, node: process.version, rows }, null, 2) + '\n');
