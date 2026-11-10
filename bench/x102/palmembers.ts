/** Which member of the re-run loop actually pays? */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const B: any = tagstackEncode(text, enc);
  const n = String(B.notes ?? '');
  const m = /palindromos: \d+ rounds, (\d+) re-run steps \(([^)]*)\)/.exec(n);
  console.log(`${r.lane.padEnd(22)} ${String(B.messageTokens).padStart(5)}  ${m ? `steps=${m[1]}  ${m[2]}` : 'no palindromos step'}`);
}
