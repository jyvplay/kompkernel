/**
 * X100 — ΓΕΝΝΑΔΑΣ FIDELITY, VERIFIED BY DECODING RATHER THAN BY ASSERTION.
 *
 * The A/B's `exact` flag is NOT re-derived after ΓΕΝΝΑΔΑΣ runs, so it cannot be the
 * evidence for this codec.  This probe decodes both arms' complete messages with the
 * repository's own reader (`tagstackDecode`) and compares against the source, so the
 * round trip is real rather than a restatement of the input.  Arm A is the control:
 * it is a message the code under test did not produce.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { tagstackDecode } from '../../src/lib/omega/tagstack';

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
const rows: any[] = [];
let aOk = 0, bOk = 0, decodable = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  process.env.OMEGA_NO_GENNADAS = '1';
  const A: any = tagstackEncode(text, enc);
  delete process.env.OMEGA_NO_GENNADAS;
  const B: any = tagstackEncode(text, enc);
  let aDec: string | null = null, bDec: string | null = null;
  try { aDec = tagstackDecode(A.message); } catch { aDec = null; }
  try { bDec = tagstackDecode(B.message); } catch { bDec = null; }
  const aExact = aDec === text, bExact = bDec === text;
  if (aDec !== null) decodable++;
  if (aExact) aOk++;
  if (bExact) bOk++;
  rows.push({ lane, armA: A.messageTokens, armB: B.messageTokens, delta: B.messageTokens - A.messageTokens, aDecodable: aDec !== null, aExact, bDecodable: bDec !== null, bExact, aBytes: aDec === null ? null : Buffer.byteLength(aDec), bBytes: bDec === null ? null : Buffer.byteLength(bDec), srcBytes: Buffer.byteLength(text) });
  console.log(`${lane.padEnd(18)} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} d=${String(B.messageTokens - A.messageTokens).padStart(3)}  A decode->source: ${String(aExact).padEnd(5)} (${aDec === null ? 'n/a' : Buffer.byteLength(aDec)}/${Buffer.byteLength(text)} B)  B decode->source: ${String(bExact).padEnd(5)} (${bDec === null ? 'n/a' : Buffer.byteLength(bDec)} B)`);
}
fs.writeFileSync('bench/x100/receipts/gennadasverify.json', JSON.stringify({ note: 'X100 GENNADAS fidelity verified by DECODING both arms with tagstackDecode, not by the exact flag', rows, totals: { decodable, armAExact: aOk, armBExact: bOk } }, null, 1) + '\n');
console.log(`\nVERIFY: ${decodable}/10 lanes have a message tagstackDecode can read; arm A exact ${aOk}/10, arm B exact ${bOk}/10`);
console.log('Where tagstackDecode cannot read a lane, the fidelity claim rests on the CHIRON-layer argument (admitParentRelative re-decodes both strings with chironDecode and admits only when the incumbent expansion is reproduced byte for byte) and on the chain own comparator, NOT on a direct full-chain decode.  That is a downgraded claim and is reported as one.');
