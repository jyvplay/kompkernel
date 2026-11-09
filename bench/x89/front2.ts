/** X89 — measure BOTH frontiers on all 29 lanes.
 *
 *  `bench/x86/front.ts` scores `tagstackFrontier`, which tagstack.ts:510 documents as
 *  "the identity WITHOUT the X74 candidates" — it exists so candidates can price their own
 *  bodies without recursing. `tagstackEncode` is the identity PLUS the X74 chain
 *  (STICHOMYTHIA X73, PROSPHYSIS/STOICHEION X74). So every "FRONTIER 29 TOTAL 12639" ever
 *  reported by this harness is the pre-chain number, and the stack's own best output is
 *  lower wherever a chain candidate wins. tagstack.ts:583 records that STICHOMYTHIA "wins
 *  exactly one lane, cue-sheet 163 -> 101"; bench/x88/receipts/probe1.json re-measured that
 *  on 15 lanes (2964 -> 2902, all of it cue-sheet, 15/15 exact). The other 14 lanes were
 *  never measured. This measures all 29, both ways, in one process, and diffs against run E.
 */
import * as fs from 'node:fs';
import { tagstackFrontier, tagstackEncode } from '../../src/lib/omega/tagstack';
const enc = 'o200k_base' as any;
const LANES = process.argv.slice(2);
const E = JSON.parse(fs.readFileSync('bench/x86/receipts/frontier-runE.json', 'utf8'));
const eBy = new Map<string, any>(); for (const r of E.rows) eBy.set(r.path, r);
const rows: any[] = [];
let tF = 0, tX = 0, tE = 0;
for (const p of LANES) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now(); const f: any = tagstackFrontier(text, enc); const msF = Date.now() - t0;
  const t1 = Date.now(); const x: any = tagstackEncode(text, enc); const msX = Date.now() - t1;
  const e = eBy.get(p);
  tF += f.messageTokens; tX += x.messageTokens; if (e) tE += e.tokens;
  rows.push({ path: p, lane: p.split('/').pop(), raw: f.inTokens, F: f.messageTokens, Fparent: f.parentCodec,
    Fexact: f.decoded === text, X: x.messageTokens, Xparent: x.parentCodec, Xexact: x.decoded === text,
    delta: x.messageTokens - f.messageTokens, runE: e ? e.tokens : null, matchesRunE: e ? e.tokens === f.messageTokens : null, msF, msX });
  const r = rows[rows.length - 1];
  console.log(`${r.lane.slice(0, 26).padEnd(27)} raw=${String(r.raw).padStart(5)} F=${String(r.F).padStart(5)}(${String(r.Fparent).slice(0, 12).padEnd(12)}) X74=${String(r.X).padStart(5)}(${String(r.Xparent).slice(0, 14).padEnd(14)}) Δ=${String(r.delta).padStart(5)} exact=${r.Fexact && r.Xexact} runE=${r.runE} match=${r.matchesRunE}  ${r.msF}ms/${r.msX}ms`);
  fs.writeFileSync('bench/x89/receipts/front2.json', JSON.stringify({ totalF: tF, totalX74: tX, totalRunE: tE, rows }, null, 1) + '\n');
}
console.log(`\n=== tagstackFrontier (pre-X74) TOTAL ${tF}   tagstackEncode (with X74 chain) TOTAL ${tX}   run E reported ${tE} ===`);
console.log(`X74 chain delta: ${tX - tF} tokens over ${LANES.length} lanes;  F matches run E on ${rows.filter((r) => r.matchesRunE).length}/${rows.length}`);
console.log(`exact: F ${rows.filter((r) => r.Fexact).length}/${rows.length}   X74 ${rows.filter((r) => r.Xexact).length}/${rows.length}`);
const w = rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta);
console.log(`lanes where the X74 chain wins: ${w.length}`);
for (const r of w) console.log(`  ${r.lane.slice(0, 30).padEnd(31)} ${r.F} -> ${r.X}  (${r.delta})  parent ${r.Xparent}`);
