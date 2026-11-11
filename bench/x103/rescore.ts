/**
 * X103 - RESCORE: optimise EVERY CHIRON-format parent, THEN select, instead of select-then-optimise.
 *
 * THE STRUCTURAL DEFECT, measured.  tagstackEncodeInner runs a frontier of parents over the source,
 * each scored ONCE, and returns the cheapest.  The CHIRON wire-level codecs (ISOMORPHIA, METATAXIS,
 * SYNDYASMOS, GENNADAS, DIAGRAPHE) then run on the WINNER only.  So:
 *
 *   - the parent CHOICE is made on a CHIRON cost that has not been optimised, and
 *   - on a lane where a non-CHIRON parent wins, the CHIRON candidate is never optimised at all.
 *
 * The CHIRON arm is not a separate parent here: `tagstackTransform` returns null for every lane on
 * this corpus ("outside bounded, collision-free, well-nested markup domain"), so the CHIRON wire the
 * chain ships is SYNKRISIS's wire.  synkrisis is therefore a CHIRON-format parent that the frontier
 * scores raw and the wire codecs improve only when it happens to win.
 *
 * WHAT IS MEASURED.  For every lane: synkrisis's raw cost, synkrisis's cost AFTER the full
 * wire-level sequence, and the winning parent's cost.  A lane where optimised-synkrisis now beats
 * the winner is a lane the stack is leaving on the table.
 *
 * Nothing is admitted here; this decides whether the mechanism has a population.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { diagrapheEncode } from '../../src/lib/omega/diagraphe';
import { gennadasEncode } from '../../src/lib/omega/gennadas';
import { isomorphiaEncode } from '../../src/lib/omega/isomorphia';
import { metataxisEncode } from '../../src/lib/omega/metataxis';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
type Cand = { message: string; messageTokens: number; decoded: string };
const CODECS: Array<[string, (t: string, e: any, c: Cand) => any]> = [
  ['ISOMORPHIA', isomorphiaEncode as any],
  ['METATAXIS', metataxisEncode as any],
  ['SYNDYASMOS', syndyasmosEncode as any],
  ['GENNADAS', gennadasEncode as any],
  ['DIAGRAPHE', diagrapheEncode as any],
];
const rows: any[] = [];
let gSynRaw = 0, gSynOpt = 0, gWinner = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const winner = R.parentTokens as number;
  const winnerCodec = R.parentCodec as string;
  let synRaw = -1, synOpt = -1, note = '', steps: string[] = [];
  try {
    const syn: any = synkrisisEncode(text, enc);
    synRaw = countTokens(syn.message, enc);
    let cur: Cand = { message: syn.message, messageTokens: synRaw, decoded: syn.decoded };
    let ref = '';
    try { ref = chironDecode(syn.message.slice(syn.message.indexOf(CHIRON_START))); } catch { ref = syn.decoded; }
    for (const [name, fn] of CODECS) {
      let out: any;
      try { out = fn(text, enc, cur); } catch { continue; }
      if (!out || !out.applied || !(out.messageTokens < cur.messageTokens)) continue;
      let ok = false;
      try { ok = chironDecode(out.message.slice(out.message.indexOf(CHIRON_START))) === ref; } catch { ok = false; }
      if (!ok) continue;
      cur = { message: out.message, messageTokens: out.messageTokens, decoded: ref };
      steps.push(name);
    }
    synOpt = cur.messageTokens;
  } catch (e) { note = 'threw ' + String(e).slice(0, 60); }
  gSynRaw += synRaw; gSynOpt += synOpt; gWinner += winner;
  const beat = synOpt < winner;
  rows.push({ lane: r.lane, winnerCodec, winner, synkrisisRaw: synRaw, synkrisisOptimised: synOpt, beatsWinner: beat, steps, note });
  console.log(`${r.lane.padEnd(22)} winner=${winnerCodec.padEnd(12)} ${String(winner).padStart(5)}  syn raw=${String(synRaw).padStart(5)} syn+codecs=${String(synOpt).padStart(5)}  ${beat ? '*** BEATS WINNER by ' + (winner - synOpt) : 'loses by ' + (synOpt - winner)}  [${steps.join(',')}]`);
}
fs.writeFileSync('bench/x103/receipts/rescore.json', JSON.stringify({ note: 'X103 RESCORE: optimise synkrisis CHIRON wire with the full wire-level sequence, then compare with the winning parent', rows, totals: { synkrisisRaw: gSynRaw, synkrisisOptimised: gSynOpt, winner: gWinner } }, null, 1));
const beats = rows.filter(r => r.beatsWinner);
console.log(`\nRESCORE over the 29 lanes: synkrisis raw ${gSynRaw} -> optimised ${gSynOpt}; winner total ${gWinner}`);
console.log(`  lanes where optimised-synkrisis beats the shipped winner: ${beats.length} -> ${beats.map(b => `${b.lane} (-${b.winner - b.synkrisisOptimised})`).join(', ') || 'none'}`);
