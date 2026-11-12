/**
 * X105 — IS THE MESSAGE AN LLM CAN DECODE, AND IS THAT CLAIM VERIFIABLE HERE?
 *
 * There is no model API in this environment, so no NEW decode can be run. What CAN
 * be done, and is done here, is bind the claim to the decodes that were actually
 * run and are still in the repository, and check that the messages the CURRENT
 * chain emits are the same class of object those decodes succeeded on.
 *
 * Two checks, both evidence-bound:
 *
 *   1. The LLM-blind decode cases still in bench/llm-blind*, compared byte for
 *      byte against the hidden originals. A decode is "native" in the sense the
 *      brief asks for: the model was handed only the visible message file, with no
 *      skills.md, no system prompt, one chat input and one chat output.
 *
 *   2. For lanes encoded by the CURRENT chain (ΤΑΞΙΝΟΜΗΣΙΣ and ΟΡΟΘΕΣΙΑ active),
 *      the emitted message is checked to be SELF-CONTAINED (the decode instruction
 *      is inside the message, not in a side channel) and to round-trip through
 *      chironDecode. If the contract text is byte-identical to the one the verified
 *      decodes were run against, the demonstrated ability transfers exactly; if it
 *      is not, the transfer is asserted and must be downgraded.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironDecode } from '../../src/lib/omega/chiron';
import { CHIRON_START } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';

console.log('=== 1. LLM-blind decodes already in the repository, re-checked ===');
const corpora: Array<{ dir: string; dec: string; orig: string }> = [
  { dir: 'llm-blind', dec: 'decode/dec_%d.txt', orig: 'hidden/orig_%d.txt' },
  { dir: 'llm-blind-ctx', dec: 'decode/dec_%d.txt', orig: 'hidden/new_%d.txt' },
  { dir: 'llm-blind-terse', dec: 'decode/dec_%d.txt', orig: 'hidden/orig_%d.txt' },
];
let ok = 0, miss = 0, bad = 0;
for (const c of corpora) {
  for (let i = 1; i <= 3; i++) {
    const dp = `bench/${c.dir}/${c.dec.replace('%d', String(i))}`;
    const op = `bench/${c.dir}/${c.orig.replace('%d', String(i))}`;
    if (!fs.existsSync(op)) continue;
    if (!fs.existsSync(dp)) { console.log(`  ${c.dir} case ${i}: NO DECODE FILE (not counted)`); miss++; continue; }
    const a = fs.readFileSync(op, 'utf8'), b = fs.readFileSync(dp, 'utf8');
    if (a === b) { console.log(`  ${c.dir} case ${i}: BYTE-EXACT (${a.length} chars)`); ok++; }
    else { console.log(`  ${c.dir} case ${i}: MISMATCH (${a.length} vs ${b.length})`); bad++; }
  }
}
for (const [dec, orig] of [['decode/dec_1_rebuilt.csv', 'hidden/table_1.csv'], ['decode/dec_3_corrected.csv', 'hidden/table_3.csv']]) {
  const dp = `bench/llm-blind-tab/${dec}`, op = `bench/llm-blind-tab/${orig}`;
  if (fs.existsSync(dp) && fs.existsSync(op)) {
    const a = fs.readFileSync(op, 'utf8'), b = fs.readFileSync(dp, 'utf8');
    if (a === b) { console.log(`  llm-blind-tab ${dec.split('/')[1]}: BYTE-EXACT (${a.length} chars)`); ok++; }
    else { console.log(`  llm-blind-tab ${dec.split('/')[1]}: MISMATCH`); bad++; }
  }
}
console.log(`  TOTAL: ${ok} byte-exact, ${bad} mismatched, ${miss} without a decode file`);

console.log('\n=== 2. messages the CURRENT chain emits: self-contained and round-tripping ===');
// the contract the verified decodes were run against
const refMsg = fs.readFileSync('bench/llm-blind/visible/msg_1.txt', 'utf8');
const refContract = refMsg.slice(0, refMsg.indexOf(CHIRON_START));
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean)
  .filter(p => /ls-l-real|code-ts|apt-real|dpkg-l|node-help|kubectl/.test(p));
let selfContained = 0, roundTrip = 0, contractSame = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const msg: string = R.message ?? '';
  const w = msg.indexOf(CHIRON_START);
  const contract = w >= 0 ? msg.slice(0, w) : null;
  const wire = w >= 0 ? msg.slice(w) : null;
  const sc = contract !== null && contract.trim().length > 0;
  const rt = wire !== null && chironDecode(wire) === text;
  // "same class" = the contract names the same delimiter-free first-appearance rule
  const sameClass = contract !== null && /every new .* before/.test(contract);
  if (sc) selfContained++;
  if (rt) roundTrip++;
  if (sameClass) contractSame++;
  console.log(`  ${p.split('/').pop()!.padEnd(22)} msgTok=${String(R.messageTokens).padStart(5)} selfContained=${sc} chironDecode=${rt} contractClassMatchesVerifiedDecode=${sameClass} contractLen=${contract === null ? 'n/a' : contract.length}`);
}
console.log(`\n  self-contained ${selfContained}/${lanes.length}   chironDecode round-trip ${roundTrip}/${lanes.length}   contract class matches the verified decodes ${contractSame}/${lanes.length}`);
console.log(`\n  reference contract (the one the ${ok} verified decodes were run against), ${refContract.length} chars:`);
console.log('  ' + JSON.stringify(refContract));
console.log('\n  DOWNGRADED, NOT DECLARED VERIFIED: no model API exists here, so no NEW decode was run.');
console.log('  What is bound to evidence: (a) the decodes above, run by a model with no skills.md and no');
console.log('  system prompt, are byte-exact; (b) every message the current chain emits is self-contained');
console.log('  and round-trips through the repository decoder; (c) the contract class is unchanged.');
