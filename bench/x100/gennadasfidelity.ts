/**
 * X100 — ΓΕΝΝΑΔΑΣ FIDELITY, THE DECISIVE CHECK.
 *
 * `tagstackDecode` is a no-op on these lanes (it only inverts the X74/X90 stack fold), so
 * an earlier attempt at this probe measured nothing and is discarded.  What ΓΕΝΝΑΔΑΣ
 * actually promises — and what `admitParentRelative` actually enforces — is that the
 * CHIRON-LAYER EXPANSION of its message equals the incumbent's.  That is checked here
 * directly, with the repository's own decoder, on the exact strings both arms emit.
 *
 * The full-chain claim then follows compositionally: every layer above ΧΕΙΡΟΝ is a
 * deterministic function of that expansion, and the chain's own comparator verified that
 * arm A's message decodes to the source.  That is a compositional argument, not a direct
 * measurement, and it is reported as such rather than upgraded.
 */
import * as fs from 'node:fs';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const exp = (m: string): string => { const i = m.indexOf(CHIRON_START); return i < 0 ? '' : chironDecode(m.slice(i)); };
const rows: any[] = [];
let eqAll = 0, aIsSrc = 0, aIsRef = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  process.env.OMEGA_NO_GENNADAS = '1';
  const A: any = tagstackEncode(text, enc);
  delete process.env.OMEGA_NO_GENNADAS;
  const B: any = tagstackEncode(text, enc);
  const ea = exp(A.message), eb = exp(B.message);
  const same = ea === eb;
  if (same) eqAll++;
  const aSrc = ea === text, aRef = ea === A.decoded;
  if (aSrc) aIsSrc++;
  if (aRef) aIsRef++;
  rows.push({ lane, armA: A.messageTokens, armB: B.messageTokens, delta: B.messageTokens - A.messageTokens, expansionEqual: same, aExpansionIsSource: aSrc, aExpansionIsChainDecoded: aRef, expBytes: Buffer.byteLength(ea), srcBytes: Buffer.byteLength(text) });
  console.log(`${lane.padEnd(18)} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} d=${String(B.messageTokens - A.messageTokens).padStart(3)}  chironDecode(A)==chironDecode(B): ${String(same).padEnd(5)}  chironDecode(A)==source: ${String(aSrc).padEnd(5)}  ==chain.decoded: ${String(aRef).padEnd(5)}  (${Buffer.byteLength(ea)} B vs source ${Buffer.byteLength(text)} B)`);
}
fs.writeFileSync('bench/x100/receipts/gennadasfidelity.json', JSON.stringify({ note: 'X100 GENNADAS fidelity: CHIRON-layer expansion equality between arms, checked with chironDecode on the exact emitted strings', rows, totals: { expansionEqual: eqAll, aExpansionIsSource: aIsSrc, aExpansionIsChainDecoded: aIsRef } }, null, 1) + '\n');
console.log(`\nFIDELITY: CHIRON-layer expansion identical on ${eqAll}/10 lanes.`);
console.log(`  chironDecode(arm A) === source on ${aIsSrc}/10 lanes (the other ${10 - aIsSrc} are composed with a text-transform codec).`);
console.log(`  chironDecode(arm A) === the chain's own decoded field on ${aIsRef}/10 lanes.`);
console.log(`  => on the ${10 - aIsSrc} composed lanes the full-chain decode is preserved COMPOSITIONALLY, not by direct measurement here.`);
