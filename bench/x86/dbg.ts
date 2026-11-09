import * as fs from 'node:fs';
import { kannabosPlan, kannabosClause, kannabosDecode } from '../../src/lib/omega/kannabos';
import { kenonCandidateK } from '../../src/lib/omega/kenon';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const S = fs.readFileSync('bench/holdout-tbl/df-h.txt', 'utf8');
const vote = kenonCandidateK(S);
const plan = kannabosPlan(S, 'o200k_base', vote.k)!;
const clause = kannabosClause(plan);
const msg = clause + '\n' + plan.text;
const fm = tagstackFrontier(msg, 'o200k_base');
console.log('msg.len', msg.length, 'decoded.len', fm.decoded.length, 'exact', fm.exact, 'parent', fm.parentCodec, 'tokens', fm.messageTokens);
console.log('decoded===msg', fm.decoded === msg);
if (fm.decoded !== msg) {
  let i = 0; while (i < Math.min(msg.length, fm.decoded.length) && msg[i] === fm.decoded[i]) i++;
  console.log('first diff at', i, JSON.stringify(msg.slice(Math.max(0,i-40), i+40)), '||', JSON.stringify(fm.decoded.slice(Math.max(0,i-40), i+40)));
}
console.log('kannabosDecode(msg.slice)===S', kannabosDecode(msg.slice(msg.indexOf('\n')+1)) === S);
console.log('kannabosDecode(fm.decoded.slice)===S', fm.decoded === msg ? kannabosDecode(fm.decoded.slice(fm.decoded.indexOf('\n')+1)) === S : 'n/a');
console.log('wire tail', JSON.stringify(plan.text.slice(-30)));
