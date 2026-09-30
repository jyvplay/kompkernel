/** Audit the OPTIMAL selector's quantifiers and accounting boundary. */
import { arithmosEncode } from '../src/lib/omega/arithmos';
import { kalligraphosEncode } from '../src/lib/omega/kalligraphos';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { DIRECT_ONE_CHAT_KEYS, chooseOptimalDirect } from '../src/lib/omega/optimal';
import { arabicIndicInvoiceLedger } from './arithmos-fixtures';
import { styledOperationsBrief } from './kalligraphos-fixtures';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail: string) { if (ok) pass++; else { fail++; console.log(`${name}: ${detail}`); } }
check('O0', DIRECT_ONE_CHAT_KEYS.length === 20 && new Set(DIRECT_ONE_CHAT_KEYS).size === 20 && DIRECT_ONE_CHAT_KEYS.includes('arithmos') && DIRECT_ONE_CHAT_KEYS.includes('kalligraphos'), 'fixed audited scope has 20 distinct self-contained paths including both new codecs');
function paths(text: string) {
  return {
    daedalus: daedalusEncode(text, 'o200k_base', { budgetMs: 3000, maxArms: 2 }),
    arithmos: arithmosEncode(text, 'o200k_base', { budgetMs: 3000, maxArms: 2 }),
    kalligraphos: kalligraphosEncode(text, 'o200k_base', { budgetMs: 3000, maxArms: 2 }),
  };
}
for (const [name, text, expected] of [
  ['native digit ledger', arabicIndicInvoiceLedger, 'arithmos'],
  ['mathematical alphabet brief', styledOperationsBrief, 'kalligraphos'],
] as const) {
  const r = chooseOptimalDirect(text, paths(text), 'o200k_base');
  check('O1', r.exact && r.decoded === text, `${name} exact identity`);
  check('O2', r.winner === expected, `${name} expected ${expected}, got ${r.winner}`);
  check('O3', r.wire === r.decoderPrompt && r.messageTokens === r.outTokens, `${name} returns a complete pasteable message, not bare wire`);
}
{
  const text = 'short plain text';
  const invalid = { wire: 'x', decoderPrompt: 'x', decoded: 'wrong', exact: true, inTokens: 3, outTokens: 1, messageTokens: 1 };
  const dishonest = { wire: 'x', decoderPrompt: 'two tokens', decoded: text, exact: true, inTokens: 3, outTokens: 1, messageTokens: 1 };
  const r = chooseOptimalDirect(text, { invalid, dishonest }, 'o200k_base');
  check('O4', r.winner === 'identity', 'invalid round trip and false accounting cannot beat identity');
  check('O5', r.receipts.every((x) => !x.accepted), 'both malicious candidates have a rejection receipt');
}
console.log(`OPTIMAL RED TEAM: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
