/**
 * X108 — live A/B of ΤΑΧΥΓΡΑΦΊΑ on the chain, under the pinned determinism flags.
 *
 * ARM ORDER IS BALANCED: the off arm runs first for odd lanes and second for even
 * lanes, so the arm-order confound X107 recorded cannot sign the result.
 *
 * The control is a number the code under test does not produce: the ΧΕΙΡΩΝ-expanded
 * payload of the incumbent and the candidate must be BYTE-IDENTICAL, compared with
 * the repository's own decoder.  A lane with no § frame at all is reported as
 * UNREACHABLE, not as a mismatch — X107 established that cue-sheet.md's
 * ΣΤΙΧΟΜΥΘΪΑ wire has no §, so the ΧΕΙΡΩΝ-layer gate is unsatisfiable there and no
 * contract-level codec can touch it.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const lanes = fs.readFileSync(process.argv[2]!, 'utf8').split('\n').filter((l) => l.trim() !== '');

function run(path: string): any {
  const text = fs.readFileSync(path, 'utf8');
  const r: any = tagstackEncode(text, enc);
  const w: number = (r.message as string).indexOf(CHIRON_START);
  let exp: string | null = null;
  if (w >= 0) { try { exp = chironDecode((r.message as string).slice(w)); } catch { exp = null; } }
  return { path, tokens: r.messageTokens, message: r.message as string, exact: r.exact, exp, hasFrame: w >= 0 };
}

console.log('lane                      off   on    Δ   exact  chironSame  verdict');
let to = 0, tn = 0, better = 0, worse = 0, same = 0, unreach = 0, exactAll = true, chironAll = true;
for (let i = 0; i < lanes.length; i++) {
  const p = lanes[i]!;
  const offFirst = i % 2 === 0;
  let off: any, on: any;
  if (offFirst) {
    process.env.OMEGA_NO_TACHYGRAFIA = '1'; off = run(p);
    process.env.OMEGA_NO_TACHYGRAFIA = '0'; on = run(p);
  } else {
    process.env.OMEGA_NO_TACHYGRAFIA = '0'; on = run(p);
    process.env.OMEGA_NO_TACHYGRAFIA = '1'; off = run(p);
  }
  const d = on.tokens - off.tokens;
  to += off.tokens; tn += on.tokens;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  if (!on.exact || !off.exact) exactAll = false;
  let verdict = d !== 0 ? 'CHANGED' : 'identical';
  if (!on.hasFrame || !off.hasFrame) { verdict = 'UNREACHABLE (no § frame)'; unreach++; }
  else if (!(on.exp !== null && off.exp !== null && on.exp === off.exp)) { verdict = 'CHIRON MISMATCH'; chironAll = false; }
  console.log(`${p.split('/').pop()!.padEnd(24)} ${String(off.tokens).padStart(4)} ${String(on.tokens).padStart(4)} ${String(d).padStart(4)}   ${on.exact && off.exact ? 'y' : 'N'}       ${verdict}`);
}
console.log(`\nTOTAL off ${to}  on ${tn}  ΣΔ ${tn - to}   better ${better}  same ${same}  worse ${worse}  unreachable ${unreach}  exact ${exactAll}  chironSame ${chironAll}`);
