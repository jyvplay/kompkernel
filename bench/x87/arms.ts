/** X87 — what did the frontier actually TRY on this lane, and what did each arm cost?
 *  TagstackResult carries frontierCosts (direct o200k counts of each candidate parent's
 *  complete message) and frontierReportedCosts (what each codec claimed). Dumping both
 *  is the cheapest way to see which mechanism is missing: an arm that is close but not
 *  cheapest tells you what to fix; an arm that is absent tells you what to build. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = tagstackFrontier(S, enc);
  rows.push({ path: p, lane: p.split('/').pop(), raw: countTokens(S, enc), F: r.messageTokens,
    parent: r.parentCodec, synkrisisParentTokens: r.synkrisisParentTokens, parentTokens: r.parentTokens,
    frontierCosts: r.frontierCosts, frontierReportedCosts: r.frontierReportedCosts,
    frontierComplete: r.frontierComplete, arm: r.arm, mode: r.mode, pairs: r.pairs,
    candidateTokens: r.candidateTokens, candidateExact: r.candidateExact, notes: r.notes,
    secs: +((Date.now() - t0) / 1000).toFixed(1) });
  const last = rows[rows.length - 1];
  console.log(`\n===== ${last.lane}  raw=${last.raw} F=${last.F} parent=${last.parent} arm=${last.arm} exact=${r.decoded === S} ${last.secs}s`);
  console.log('  frontierCosts:          ' + JSON.stringify(last.frontierCosts));
  console.log('  frontierReportedCosts:  ' + JSON.stringify(last.frontierReportedCosts));
  console.log('  candidate: ' + last.candidateTokens + ' exact=' + last.candidateExact + '  notes: ' + String(last.notes).slice(0, 200));
  fs.mkdirSync('bench/x87/receipts', { recursive: true });
  fs.writeFileSync('bench/x87/receipts/arms.json', JSON.stringify({ rows }, null, 1) + '\n');
}
