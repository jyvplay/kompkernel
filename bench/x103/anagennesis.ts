/**
 * X103 - ANAGENNESIS (anagennesis, "regeneration, second birth"): compress the COMPRESSOR'S OUTPUT.
 *
 * THE BLIND SPOT.  Every codec comparison in this repository, and in the grammar-compression
 * literature, is codec-vs-codec on the SOURCE.  tagstackEncodeInner runs a frontier of parents over
 * `text`, picks the cheapest, and the wire-level codecs then improve that parent's wire.  What has
 * never been tried is feeding one codec's OUTPUT to another codec as its INPUT.
 *
 * WHY IT IS NOT REDUNDANT FOR A CHIRON-PARENTED LANE.  On such a lane the parent's wire already is a
 * CHIRON tape, and every phrase in it is a substring of the source, which CHIRON's macro pass already
 * mined.  Re-encoding it adds a contract and cannot remove information.  So the CHIRON-parented lanes
 * are the CONTROL: they must not improve, and if one does, the argument is wrong.
 *
 * WHY IT IS *NOT* REDUNDANT FOR A NON-CHIRON LANE.  On 6 of the 29 frontier lanes the winning parent
 * is akolouthia2, metron or diastema, whose wire is in a DIFFERENT format.  CHIRON(source) lost to
 * that parent - but CHIRON(parent_wire) is CHIRON on a different, shorter, more structured string,
 * and nothing establishes that it loses.  The frontier compares candidates on the source only, so
 * this whole region is outside the search space.
 *
 * WHAT IS MEASURED.  For every lane: the shipped message M, and countTokens(chironEncode(M).message).
 * Nothing is admitted yet; this is the population measurement that decides whether a codec here has
 * a population at all.  Decodability of the composition is checked by chironDecode on the outer wire.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironDecode, chironEncode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const rows: any[] = [];
let gBase = 0, gStage2 = 0, better = 0, worse = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const base = R.messageTokens;
  const t = Date.now();
  let stage2 = -1, ok = false, note = '';
  try {
    const C: any = chironEncode(R.message, enc);
    stage2 = C.messageTokens;
    ok = chironDecode(C.wire) === R.message;
    note = String(C.notes).slice(0, 90);
  } catch (e) { note = 'threw: ' + String(e).slice(0, 60); }
  const d = stage2 - base;
  if (d < 0) better++; else if (d > 0) worse++;
  gBase += base; gStage2 += stage2;
  rows.push({ lane: r.lane, parent: R.parentCodec, base, stage2, delta: d, roundTrip: ok, ms: Date.now() - t, note });
  console.log(`${r.lane.padEnd(22)} parent=${String(R.parentCodec).padEnd(12)} M=${String(base).padStart(5)}  stage2=${String(stage2).padStart(5)}  delta=${String(d).padStart(5)}  rt=${ok}  ${String(Date.now() - t).padStart(6)}ms`);
}
fs.writeFileSync('bench/x103/receipts/anagennesis.json', JSON.stringify({ note: 'X103 ANAGENNESIS: CHIRON applied to the SHIPPED message as a second stage. CHIRON-parented lanes are the control and must not improve.', rows, totals: { base: gBase, stage2: gStage2, delta: gStage2 - gBase, better, worse } }, null, 1));
console.log(`\nANAGENNESIS over the 29 lanes: base ${gBase} -> second stage ${gStage2}, delta = ${gStage2 - gBase}; better ${better}, worse ${worse}`);
