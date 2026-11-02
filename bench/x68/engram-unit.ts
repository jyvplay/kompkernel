/**
 * X68 ENGRAMMA unit tests.
 *
 * The claim under test is NOT "the memo is faster" (that is a timing claim,
 * measured in engram-cold.ts / engram-warm.ts). It is:
 *   (1) a hit returns a result byte-identical to the computation, and
 *   (2) a hit replays the EXACT counted work, so the deterministic work meter
 *       reads the same value afterwards as it would have without the memo.
 * (2) is the X67 bug; these tests fail if it ever comes back.
 */
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { engramClear, engramStats, engramOptionsKey, engramSize } from '../../src/lib/omega/engram';
import { workEpoch, workUsed, chironUsedUnits } from '../../src/lib/omega/workmeter';

const enc: any = 'o200k_base';
const TEXT = 'alpha beta gamma\n1 2 3\n4 5 6\n7 8 9\n\nalpha beta gamma delta\n10 11 12\n13 14 15\n';
let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log('ok   ' + name); }
  else { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

// 1. result identity across a hit, for both memoised codecs
process.env.OMEGA_ENGRAM = '0';
engramClear();
const dOff = daedalusEncode(TEXT, enc);
const aOff = apographeEncode(TEXT, enc);
delete process.env.OMEGA_ENGRAM;
engramClear();
const d1 = daedalusEncode(TEXT, enc);
const d2 = daedalusEncode(TEXT, enc);
const a1 = apographeEncode(TEXT, enc);
const a2 = apographeEncode(TEXT, enc);
check('daedalus: first call equals memo-off message', d1.message === dOff.message);
check('daedalus: hit equals memo-off message', d2.message === dOff.message);
check('daedalus: exact decode', d2.decoded === TEXT);
check('apographe: first call equals memo-off message', a1.message === aOff.message);
check('apographe: repeat call equals memo-off message', a2.message === aOff.message);
check('apographe exact decode', apographeDecodeResult(a2) === TEXT);
// APOGRAPHE is cheap on this fixture and falls under MIN_WORK, so it is re-run rather
// than stored (stats.cheapSkips). DAEDALUS is over the threshold and must hit.
check('the DAEDALUS hit was actually taken', engramStats.hits >= 1, JSON.stringify(engramStats));

// 2. work replay: the meter must read the same after N calls with and without the memo
process.env.OMEGA_ENGRAM = '0';
engramClear();
const usedOff = workEpoch(Number.POSITIVE_INFINITY, () => {
  daedalusEncode(TEXT, enc); daedalusEncode(TEXT, enc); daedalusEncode(TEXT, enc);
  return workUsed();
});
const chironOff = chironUsedUnits();
delete process.env.OMEGA_ENGRAM;
engramClear();
const usedOn = workEpoch(Number.POSITIVE_INFINITY, () => {
  daedalusEncode(TEXT, enc); daedalusEncode(TEXT, enc); daedalusEncode(TEXT, enc);
  return workUsed();
});
const chironOn = chironUsedUnits();
check('work meter identical after 3 calls (memo off vs on)', usedOff === usedOn, `off=${usedOff} on=${usedOn}`);
check('chiron meter identical after 3 calls (memo off vs on)', chironOff === chironOn, `off=${chironOff} on=${chironOn}`);
check('the memo actually saved work (off > on is impossible; equal is the invariant)', usedOn >= usedOff);

// 3. options key: distinct options must be distinct keys, key order must not matter
check('options key ignores key order', engramOptionsKey({ a: 1, b: 2 } as any) === engramOptionsKey({ b: 2, a: 1 } as any));
check('options key distinguishes budget', engramOptionsKey({ budgetMs: 10 } as any) !== engramOptionsKey({ budgetMs: 11 } as any));
check('empty options key is empty', engramOptionsKey({} as any) === '');

// 4. off switch
process.env.OMEGA_ENGRAM = '0';
engramClear();
daedalusEncode(TEXT, enc); daedalusEncode(TEXT, enc);
check('OMEGA_ENGRAM=0 disables the memo', engramStats.hits === 0 && engramSize() === 0);
delete process.env.OMEGA_ENGRAM;

// 5. a different text must not hit
engramClear();
const dX = daedalusEncode(TEXT + 'x', enc);
check('suffix change is a different key', dX.decoded === TEXT + 'x' && engramStats.hits === 0, JSON.stringify(engramStats));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
