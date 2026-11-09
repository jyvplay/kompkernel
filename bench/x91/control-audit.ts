/**
 * X91 — AUDIT THE ACCEPTANCE TEST'S OWN CONTROL AGAINST RECEIPTS IT DID NOT PRODUCE.
 *
 * Zero encodes. This is a pure join and exists because bench/x91/decouple-sweep.ts had a flaw
 * that its own guard did not catch.
 *
 * THE FLAW. decouple-sweep.ts asserts `controlMatchesCommitted` per lane, against a table of
 * expected values (EXPECT_CONTROL) that was populated FROM THE SAME PROBE FAMILY -- the numbers
 * came out of bench/x91/large-sweep.ts, which calls the same function. A control checked
 * against a number its own code path produced is not a control; it is a tautology, and it
 * reported "OK" on 7 of 7 lanes. Re-evaluated against receipts produced by DIFFERENT harnesses
 * in DIFFERENT turns -- bench/x86/receipts/frontier-runE.json (the gate, tagstackFrontier) and
 * bench/x89/receipts/front3-runG.json (the shipped encoder, tagstackEncode) -- the truth is
 * 6 of 7.
 *
 * THE ONE THAT DIFFERS, AND WHY IT IS NOT A DEFECT IN THE ARM. apt-real.txt: committed gate 850,
 * committed shipped 850, this probe's control AND candidate both 886. The cause is which
 * function the probe calls. `tagstackEncodeUncached` is `tagstackEncodeInner`
 * (src/lib/omega/tagstack.ts:580-582) -- the base WITHOUT the X73/X74 chain, i.e. without
 * STICHOMYTHIA, PROSPHYSIS and STOICHEION, which `tagstackEncode` appends and which admit a
 * candidate only when it is strictly smaller on a complete byte-exact message. On apt-real the
 * chain is worth 886 -> 850, -36 tokens. So the probe measured the pre-chain tier on that lane
 * and reproduced it exactly; it did not measure the shipped tier.
 *
 * WHAT STILL HOLDS, AND WHAT MOVES TO A DIFFERENT RECEIPT. The budget claim is a claim about
 * IDENTITY between two settings of the same encoder, and that holds on 7 of 7 by SHA-256 of the
 * complete message: control and candidate produce the same string on every lane, including
 * apt-real. What the probe cannot vouch for is the shipped TIER on apt-real, and that is
 * covered instead by run H pass 2 (bench/x86/run-front-h.sh), which calls the real shipped
 * encoder over all 29 lanes and must total 12 491 with 0 lanes differing from run G.
 *
 * Also recorded because X89 documented it and this is a live instance: `admit()`
 * (tagstack.ts:617) does NOT set parentCodec, so apt-real reports parent=synkrisis at 850 even
 * though the winner is a chain candidate over a synkrisis-parented base. Read `notes`, never
 * `parent`, for a lane whose count differs from its base.
 */
import * as fs from 'node:fs';

const DEC = 'bench/x91/receipts/decouple-sweep.json';
const GATE = 'bench/x86/receipts/frontier-runE.json';
const SHIP = 'bench/x89/receipts/front3-runG.json';
const OUT = 'bench/x91/receipts/control-audit.json';

const dec = JSON.parse(fs.readFileSync(DEC, 'utf8'));
const gateRows: any[] = JSON.parse(fs.readFileSync(GATE, 'utf8')).rows;
const shipRows: any[] = JSON.parse(fs.readFileSync(SHIP, 'utf8')).rows;
const gate = new Map(gateRows.map(r => [r.path, r]));
const ship = new Map(shipRows.map(r => [r.path, r]));
if (gate.size !== gateRows.length || ship.size !== shipRows.length) throw new Error('duplicate paths in a committed receipt');

const out: any = { note: 'control re-audited against receipts from different harnesses and turns', lanes: [] };
const lines: string[] = ['CONTROL AUDIT — decouple-sweep control vs committed gate (runE) and shipped (runG)', ''];
lines.push('lane'.padEnd(20) + 'probeCtl'.padStart(9) + 'probeCand'.padStart(10) + 'gateRunE'.padStart(9) + 'shipRunG'.padStart(9) + '  hashSame' + '  verdict');
let matchShip = 0, matchBaseOnly = 0, invalid = 0;
for (const l of dec.lanes) {
  const g = gate.get(l.path), s = ship.get(l.path);
  const ctl = l.passes[0].tokens, cand = l.passes[1].tokens;
  const hashSame = l.passes[1].sha === l.passes[0].sha;
  let verdict: string;
  if (!g || !s) { verdict = 'NOT IN COMMITTED RECEIPTS'; invalid++; }
  else if (ctl === s.X && ctl === g.tokens) { verdict = 'MATCHES SHIPPED AND GATE'; matchShip++; }
  else if (cand === ctl && hashSame) { verdict = `MATCHES NEITHER TIER (probe measures the pre-chain base; committed ${g.tokens}/${s.X})`; matchBaseOnly++; }
  else { verdict = 'INVALID — candidate differs from control'; invalid++; }
  out.lanes.push({ path: l.path, lane: l.lane, chars: l.chars, probeControl: ctl, probeCandidate: cand,
    hashSame, exactAll: l.exactAll, committedGate: g?.tokens ?? null, committedShipped: s?.X ?? null,
    committedParent: s?.parent ?? null, verdict });
  lines.push(l.lane.padEnd(20) + String(ctl).padStart(9) + String(cand).padStart(10) +
    String(g ? g.tokens : '--').padStart(9) + String(s ? s.X : '--').padStart(9) +
    String(hashSame).padStart(10) + '  ' + verdict);
}
lines.push('');
lines.push(`control reproduces BOTH committed tiers on ${matchShip}/${dec.lanes.length} lanes`);
lines.push(`control reproduces neither tier (pre-chain base, identity still holds) on ${matchBaseOnly}/${dec.lanes.length}: ${out.lanes.filter((l: any) => l.verdict.startsWith('MATCHES NEITHER')).map((l: any) => l.lane).join(', ') || 'none'}`);
lines.push(`INVALID on ${invalid}/${dec.lanes.length}`);
lines.push('');
lines.push('THE BUDGET CLAIM, RESTATED AT THE TIER IT WAS MEASURED.');
lines.push(`  identity between control (work 0.5 / chiron 0.5) and candidate (work 0.5 / chiron 0.25):`);
lines.push(`  ${dec.lanes.filter((l: any) => l.passes[1].sha === l.passes[0].sha).length}/${dec.lanes.length} lanes hash-identical, ${dec.lanes.filter((l: any) => l.exactAll).length}/${dec.lanes.length} byte-exact at every setting, 0 lanes worse.`);
lines.push('  apt-real\'s SHIPPED tier is not covered by this probe and is covered by run H pass 2');
lines.push('  (bench/x86/run-front-h.sh, front3.mjs -> tagstackEncode, expected total 12 491, 0 differing).');
out.summary = { matchShip, matchBaseOnly, invalid, hashIdentical: dec.lanes.filter((l: any) => l.passes[1].sha === l.passes[0].sha).length, lanes: dec.lanes.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const log = lines.join('\n') + '\n';
fs.writeFileSync(OUT.replace(/\.json$/, '.log'), log);
console.log(log);
