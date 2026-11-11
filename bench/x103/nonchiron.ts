/**
 * X103 — THE SIX LANES NO WIRE CODEC CAN TOUCH.
 *
 * Every wire-level codec (ἸΣΟΜΟΡΦΪΑ, ΜΕΤΑΤΑΞΙΣ, ΣΥΝΔΥΑΣΜΟΣ, ΓΕΝΝΑΔΑΣ, ΔΙΑΓΡΑΦΗ,
 * ΠΡΟΑΓΩΓΗ) needs a CHIRON frame: `msg.indexOf(CHIRON_START) >= 0`.  On a lane
 * whose winning parent is NOT ΧΕΙΡΩΝ-shaped — akolouthia2, metron, diastema,
 * stichomythia — there is no `§`, so every one of them refuses at the same line
 * and the lane is never searched.  That is 6 of 29 lanes and 1 247 shipped
 * tokens with zero post-pass coverage, and it is the only region of the lane set
 * where that is true.
 *
 * This probe dumps the actual shipped message for those six lanes so the residual
 * redundancy can be looked at rather than guessed at.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_ENGRAM = '0';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const want = new Set(['df-h.txt', 'psql-output.txt', 'prices.csv', 'cue-sheet.md', 'kubectl-get-pods.txt', 'metrics.tsv']);
const seen = new Set<string>();
for (const r of plan) {
  if (!want.has(r.lane) || seen.has(r.path)) continue;
  seen.add(r.path);
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const msg = String(R.message);
  console.log(`===== ${r.lane}  (${r.path})  parent=${R.parentCodec}  shipped=${R.messageTokens}  raw=${text.length}B  msg=${msg.length}B`);
  console.log(JSON.stringify(msg.slice(0, 520)));
  console.log();
}
