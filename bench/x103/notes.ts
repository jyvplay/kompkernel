import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
for (const r of plan.slice(0, 4)) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  console.log(`--- ${r.lane} parent=${R.parentCodec} parentTok=${R.parentTokens} shipped=${R.messageTokens}`);
  console.log(`    notes: ${String(R.notes).slice(0, 400)}`);
  console.log(`    frontierCosts: ${JSON.stringify(R.frontierCosts)}`);
  console.log(`    first 60 chars of message: ${JSON.stringify(String(R.message).slice(0, 60))}`);
}
