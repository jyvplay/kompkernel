/** X107 — replicate the chain's ΠΕΡΙΚΟΠΉ admission gate step by step. */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { perikopiRewrite } from '../../src/lib/omega/perikopi';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
process.env.OMEGA_NO_PERIKOPI = '1';
const enc: any = 'o200k_base';
console.log('CHIRON_START =', JSON.stringify(CHIRON_START));
for (const p of ['bench/holdout-tbl/psql-output.txt', 'bench/holdout-x40/cue-sheet.md']) {
  const text = fs.readFileSync(p, 'utf8');
  const best: any = tagstackFrontier(text, enc);
  console.log(`\n### ${p}`);
  console.log(`  messageTokens=${best.messageTokens}  countTokens(message)=${countTokens(best.message, enc)}  decoded==text: ${best.decoded === text}`);
  const start = best.message.indexOf(CHIRON_START);
  console.log(`  indexOf(CHIRON_START)=${start}  of ${best.message.length}`);
  let incExp: string | null = null;
  try { incExp = chironDecode(best.message.slice(start)); } catch (e) { console.log(`  chironDecode THREW: ${String(e).slice(0, 120)}`); }
  console.log(`  incExp len=${incExp === null ? 'null' : incExp.length}  incExp==text: ${incExp === text}`);
  const rw = perikopiRewrite(best.message, enc, text);
  console.log(`  edits=${rw.edits.length} before ${rw.before} after ${rw.after}`);
  const cstart = rw.message.indexOf(CHIRON_START);
  let candExp: string | null = null;
  try { candExp = chironDecode(rw.message.slice(cstart)); } catch (e) { console.log(`  cand chironDecode THREW: ${String(e).slice(0, 120)}`); }
  console.log(`  candExp len=${candExp === null ? 'null' : candExp.length}  candExp==incExp: ${candExp === incExp}`);
  const tok = countTokens(rw.message, enc);
  console.log(`  tok ${tok} < best.messageTokens ${best.messageTokens} ? ${tok < best.messageTokens}`);
  console.log(`  ADMIT would be: ${incExp !== null && candExp === incExp && tok < best.messageTokens}`);
}
