/** X86 A/B — isolate what the VOTE contributes, and measure the dense-wire law.
 *
 *  Three arms per lane, all through the same frontier, all byte-exact or dropped:
 *
 *    A  kannabosPlan(text)          — KANNABOS's own cell-count-histogram candidates
 *    B  kannabosPlan(text, vote.k)  — the histogram candidates PLUS the gap vote
 *
 *  and, for each surviving plan, F(wire) with NO contract, so the contract's real
 *  cost through the frontier is a subtraction and not a guess. That last number is
 *  also the test of the dense-wire law: a columnar wire has had its redundancy
 *  removed by construction, so the frontier should barely compress it
 *  (F(wire) / raw(wire) close to 1), which is why a columnar arm can only win where
 *  its generators cut raw(wire) far below F(source).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { kannabosPlan, kannabosClause, kannabosDecode } from '../../src/lib/omega/kannabos';
import { kenonCandidateK, kenonDecode } from '../../src/lib/omega/kenon';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const t0 = Date.now();
  const ident = tagstackFrontier(S, 'o200k_base');
  const tIdent = (Date.now() - t0) / 1000;
  const vote = kenonCandidateK(S);
  const arms: any = { lane: name, path: p, raw: countTokens(S, 'o200k_base'), F: ident.messageTokens, identSecs: +tIdent.toFixed(1), voteK: vote.k, bounds: vote.bounds };
  for (const [tag, kList] of [['A', undefined], ['B', vote.k]] as Array<[string, number[] | undefined]>) {
    let plan: any = null;
    try { plan = kannabosPlan(S, 'o200k_base', kList ?? []); } catch { plan = null; }
    if (!plan) { arms[tag] = null; continue; }
    const exact = kannabosDecode(plan.text) === S;
    const clause = kannabosClause(plan);
    const msg = clause + '\n' + plan.text;
    const t1 = Date.now();
    const fw = tagstackFrontier(plan.text, 'o200k_base');
    const fm = tagstackFrontier(msg, 'o200k_base');
    arms[tag] = {
      cols: plan.cols, rows: plan.rows, literals: plan.literals, exact,
      wireRaw: countTokens(plan.text, 'o200k_base'), clauseRaw: countTokens(clause, 'o200k_base'),
      Fwire: fw.messageTokens, Fmsg: fm.messageTokens,
      delta: fm.messageTokens - ident.messageTokens,
      /** the dense-wire ratio: how much the frontier can still do to a columnar wire */
      wireRatio: +(fw.messageTokens / Math.max(1, countTokens(plan.text, 'o200k_base'))).toFixed(3),
      clauseCost: fm.messageTokens - fw.messageTokens,
      secs: +((Date.now() - t1) / 1000).toFixed(1),
      // G6 in full: the frontier hands our message back byte-for-byte, and the
      // contract line is stripped before the wire is decoded (kenonDecode does both).
      endToEnd: fm.exact && fm.decoded === msg && kenonDecode(fm.decoded) === S,
    };
  }
  rows.push(arms);
  const f = (a: any) => a ? `cols=${a.cols} wire=${a.wireRaw} Fwire=${a.Fwire}(${a.wireRatio}) Fmsg=${a.Fmsg} d=${a.delta}${a.endToEnd ? '' : ' EE-FAIL'}${a.exact ? '' : ' NOT-EXACT'}` : 'no plan';
  console.log(`${name.padEnd(24)} raw=${String(arms.raw).padStart(5)} F=${String(arms.F).padStart(5)} voteK=[${vote.k}] bounds=[${arms.bounds.join(',')}]`);
  console.log(`   A(histogram)  ${f(arms.A)}`);
  console.log(`   B(+gap vote)  ${f(arms.B)}`);
  fs.mkdirSync('bench/x86/receipts', { recursive: true });
  const outPath = process.env.X86_AB_OUT ?? 'bench/x86/receipts/ab.json';
  fs.writeFileSync(outPath, JSON.stringify({ rows }, null, 1) + '\n');
}
const both = rows.filter((r) => r.A && r.B);
console.log(`\nlanes=${rows.length} A-plans=${rows.filter((r) => r.A).length} B-plans=${rows.filter((r) => r.B).length}`);
for (const r of both) {
  const same = r.A.cols === r.B.cols && r.A.Fmsg === r.B.Fmsg;
  console.log(`  ${r.lane.padEnd(24)} A cols=${r.A.cols} d=${r.A.delta}   B cols=${r.B.cols} d=${r.B.delta}   ${same ? 'vote changed nothing' : 'VOTE CHANGED THE PLAN'}`);
}
const onlyB = rows.filter((r) => !r.A && r.B);
for (const r of onlyB) console.log(`  ${r.lane.padEnd(24)} grid ONLY the vote can find: cols=${r.B.cols} d=${r.B.delta}`);
