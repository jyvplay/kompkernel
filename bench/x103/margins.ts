/**
 * X103 - MARGINS: how close is the CHIRON arm to the winning parent, BEFORE the wire-level codecs?
 *
 * tagstackEncodeInner scores the CHIRON arm (tagstackTransform + apographe) against the frontier
 * parents and returns whichever is smaller.  The wire-level codecs (ISOMORPHIA, METATAXIS,
 * SYNDYASMOS, GENNADAS, DIAGRAPHE) then improve only a CHIRON-format message, and they run AFTER the
 * choice has been made.  So the choice is made on a CHIRON cost that has not been optimised.
 *
 * This probe records, per lane: the winning parent's cost, the CHIRON arm's own cost
 * (`candidateTokens`), and the gap.  A small gap on a lane where a non-CHIRON parent won is exactly
 * the population a re-comparison could recover.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const rows: any[] = [];
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const parent = R.parentTokens as number;
  const cand = (R.candidateTokens ?? null) as number | null;
  const gap = cand === null ? null : cand - parent;
  rows.push({ lane: r.lane, parent: R.parentCodec, parentTokens: parent, candidateTokens: cand, gap, shipped: R.messageTokens, applied: R.applied, frontierCosts: R.frontierCosts });
  console.log(`${r.lane.padEnd(22)} winner=${String(R.parentCodec).padEnd(12)} parent=${String(parent).padStart(5)}  CHIRON arm=${String(cand).padStart(5)}  gap=${String(gap).padStart(5)}  shipped=${String(R.messageTokens).padStart(5)}  applied=${R.applied}`);
}
fs.writeFileSync('bench/x103/receipts/margins.json', JSON.stringify({ note: 'X103 MARGINS: winning parent vs the CHIRON arm before the wire-level codecs, per lane', rows }, null, 1));
const nonChiron = rows.filter(r => r.parent !== 'synkrisis');
console.log(`\nMARGINS: ${nonChiron.length} lanes where a non-synkrisis parent wins; their CHIRON-arm gaps: ${nonChiron.map(r => `${r.lane} ${r.gap}`).join(', ')}`);
