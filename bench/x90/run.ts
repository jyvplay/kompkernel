/** X90 run — ΣΥΜΦΥΊΑ through the frontier on the lanes the raw screen admitted.
 *
 *  ONE frontier call per lane, not two. `symphyiaEncode` takes the incumbent's complete
 *  message cost as a parameter; it is read here from committed receipts rather than
 *  re-measured, because re-measuring it in the same process would double the wall clock
 *  on ls-l-real alone (175 s per call under det, run F).
 *
 *  THE TWO TIERS, kept separate on purpose (X89 §1). The GATE tier is what
 *  bench/x86/front.ts prices and what every arm in this repo is scored against:
 *  `tagstackFrontier`, the identity WITHOUT the X74 candidates. The SHIPPED tier is what
 *  a user pastes: `tagstackEncode`, which additionally tries PROSPHYSIS / STICHOMYTHIA /
 *  STOICHEION and keeps the minimum. ΣΥΜΦΥΊΑ is a peer of those three, so on a lane where
 *  one of them already wins, beating the GATE is not enough -- it has to beat the SHIPPED
 *  number too. ls-l-real is exactly that case: PROSPHYSIS takes it 1476 -> 1394, and
 *  ΣΥΜΦΥΊΑ's f11:tail<-f9 rule IS PROSPHYSIS's symlink relation fitted over fields rather
 *  than over the arrow, so on that lane the two are rivals for the same redundancy.
 *
 *  OMEGA_DET=1  because without it the frontier is not a function of its input (X89 §2:
 *  4 of 29 lanes drifted, ls-l-real 1476 -> 1496, total +39).
 *  OMEGA_ENGRAM=0 because two passes in one process would otherwise replay the first
 *  pass's cached result and the ms column would mean nothing. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { symphyiaEncode } from '../../src/lib/omega/symphyia';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

const enc = 'o200k_base' as any;

/** lane -> [gate F from bench/x86/receipts/frontier-runF.json, shipped from
 *  bench/x89/receipts/front3.json or the X88 saved-wire count] */
const LANES: Array<{ path: string; gate: number; shipped: number; rawTokens: number; why: string }> = [
  // openstack-loghub-26 is DELIBERATELY ABSENT. Its f15 = "/v2/" + f9 + "/servers/detail"
  // relation was frontier-measured in the first run of this file and refused: F(rewrite) came
  // back 896, exactly F(original), for a 291-token raw win -- zero frontier gain, because f9
  // takes 2 distinct values and the target is therefore a literal repeat the dictionary
  // already interns. The contract then made the message lose 968 vs 896. That measurement is
  // what set G9's threshold, and it is preserved in receipts/run.json (first pass) and in the
  // G9 comment in symphyia.ts. Re-running it would cost 111 s to rediscover a fact now
  // refused in about 3 ms, which is the gate's entire purpose.
  { path: 'bench/holdout-x41/ls-l-real.txt', gate: 1476, shipped: 1394, rawTokens: 5194, why: 'rival of PROSPHYSIS on the same relation; must beat 1394, not 1476' },
  { path: 'bench/holdout-x86/ls-la-usrbin.txt', gate: 946, shipped: 946, rawTokens: 3271, why: 'PROSPHYSIS CANNOT fire here: the target ENDS with the link name (its prefix direction, which it declines to admit). Genuinely non-overlapping.' },
  { path: 'bench/holdout-x86/dpkg-l-full.txt', gate: 2262, shipped: 2262, rawTokens: 4277, why: 'f2 = <name>:<arch> over the arch column; first pass measured F(rewrite) 2240 vs 2262, so the cheap contract decides it' },
];

const rows: any[] = [];
let totalGate = 0, totalMine = 0, totalShipped = 0;
for (const L of LANES) {
  const text = fs.readFileSync(L.path, 'utf8');
  const ms0 = Date.now();
  const r = symphyiaEncode(text, enc, L.gate);
  const ms = Date.now() - ms0;
  const exact = r.decoded === text;
  const verdict = !r.applied ? `REFUSED (${r.notes})`
    : !exact ? 'APPLIED BUT NOT BYTE EXACT — FATAL'
    : r.messageTokens >= L.shipped ? `loses to SHIPPED ${r.messageTokens} vs ${L.shipped}`
    : `WINS vs shipped ${L.shipped} -> ${r.messageTokens} (${r.messageTokens - L.shipped})`;
  rows.push({
    lane: L.path, rawTokens: L.rawTokens, gate: L.gate, shipped: L.shipped,
    applied: r.applied, exact, messageTokens: r.messageTokens,
    deltaGate: r.messageTokens - L.gate, deltaShipped: r.messageTokens - L.shipped,
    contractTokens: r.contractTokens, rules: r.rules, fields: r.rewritten,
    frontierParent: r.frontierParent, crc: r.crc, ms, notes: r.notes, verdict, why: L.why,
  });
  totalGate += L.gate; totalShipped += L.shipped; totalMine += r.messageTokens;
  console.log(`\n━━ ${L.path}`);
  console.log(`   raw ${L.rawTokens}  gate ${L.gate}  shipped ${L.shipped}  MINE ${r.messageTokens}  applied=${r.applied} exact=${exact} contract=${r.contractTokens} fields=${r.rewritten} ms=${ms}`);
  console.log(`   ${r.notes}`);
  console.log(`   VERDICT: ${verdict}`);
  console.log(`   why this lane: ${L.why}`);
  if (r.applied) {
    console.log(`   first line: ${r.message.split('\n')[0]}`);
    const b = r.message.split('\n');
    console.log(`   sample body: ${b.slice(1, 4).map((x) => x.slice(0, 110)).join(' | ')}`);
  }
  fs.mkdirSync('bench/x90/receipts', { recursive: true });
  fs.writeFileSync('bench/x90/receipts/run.json', JSON.stringify({
    note: 'X90 ΣΥΜΦΥΊΑ frontier run. ONE frontier call per lane; the incumbent is read from committed receipts (gate = bench/x86/receipts/frontier-runF.json, shipped = bench/x89/receipts/front3.json). G6/G7 measured here, G1-G5/G8 in screen.json. OMEGA_DET=1, OMEGA_ENGRAM=0.',
    det: process.env.OMEGA_DET, engram: process.env.OMEGA_ENGRAM,
    lanes: rows, totals: { gate: totalGate, shipped: totalShipped, mine: totalMine },
  }, null, 1) + '\n');
}
console.log(`\n=== ΣΥΜΦΥΊΑ, ${LANES.length} lanes ===`);
console.log(`gate total ${totalGate}  shipped total ${totalShipped}  MINE total ${totalMine}`);
console.log(`vs gate ${totalMine - totalGate}   vs shipped ${totalMine - totalShipped}`);
console.log(`applied ${rows.filter((r) => r.applied).length}/${rows.length}   byte exact ${rows.filter((r) => r.exact).length}/${rows.length}`);
const wins = rows.filter((r) => r.applied && r.exact && r.messageTokens < r.shipped);
console.log(`STRICT WINS vs the shipped column: ${wins.length} — ${wins.map((r) => `${r.lane.split('/').pop()} ${r.deltaShipped}`).join(', ') || 'none'}`);
console.log('wrote bench/x90/receipts/run.json');
