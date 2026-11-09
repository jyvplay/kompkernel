/** X90 contract ladder — the ENTIRE deficit against PROSPHYSIS is contract tax, and it is
 *  computable offline.
 *
 *  MEASURED, ls-l-real, OMEGA_DET=1 (bench/x90/receipts/run.json):
 *      ΣΥΜΦΥΊΑ  message 1434 = contract 70 + F(rewrite) 1364
 *      PROSPHYSIS message 1394 = key 31 + F(rewrite) 1363      (shipped, front3.json)
 *  The two REWRITES are equally good: 1364 vs 1363, one token apart, on a 1394-token
 *  message. ΣΥΜΦΥΊΑ fitted the same relation PROSPHYSIS hardcodes (symlink target = link
 *  name + tail) without being told about arrows, and got the same frontier cost. So the
 *  40-token deficit is not a worse mechanism, it is a worse CONTRACT.
 *
 *  Because symphyiaEncode builds `contract + '\n' + inner.message` and the contract is a
 *  separate line, total = tokens(contract) + 1 + F(rewrite). F(rewrite) = 1364 is already
 *  measured and does not change when only the wording changes, so every phrasing below can
 *  be priced WITHOUT a frontier call — 233 s each. The break-even against the shipped
 *  1394 is therefore:
 *
 *      tokens(contract) <= 1394 - 1364 - 1 = 29
 *
 *  which is TWO TOKENS CHEAPER THAN PROSPHYSIS'S OWN KEY, for a relation PROSPHYSIS also
 *  fires on, and my contract must additionally carry the CRC-32 that PROSPHYSIS's key does
 *  not (G8; bought with X88's 244 silently-wrong decodes). So the ladder's real question is
 *  not "can I phrase it in 29 tokens" but "can I phrase it in 29 tokens AND keep the
 *  integrity check AND keep it executable by a cold reader".
 *
 *  WHY PROSPHYSIS'S KEY IS CHEAP, STATED SO IT CAN BE COPIED: it anchors VISUALLY ("the
 *  name before the arrow") because the arrow is in the payload, so it never has to explain
 *  a field-numbering convention. ΣΥΜΦΥΊΑ is generic and has no anchor to point at, so it
 *  must state indices. That asymmetry is the cost of generality and it is measured here
 *  rather than argued away. */
import { countTokens } from '../../src/lib/omega/bpe';
import { PROSPHYSIS_KEY } from '../../src/lib/omega/prosphysis';

const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const F_REWRITE = 1364, SHIPPED = 1394, GATE = 1476, BREAK_EVEN = 29;
const CRC = '16f86bf2';

const LADDER: Array<{ id: string; text: string; crc: boolean; note: string }> = [
  { id: 'L0-shipped', crc: true, note: 'what run.json actually sent', text: `ΣΥΜΦΥΊΑ whitespace fields, 1-based, per line. ※ marks a field rebuilt from a sibling of the SAME line; T = the text after ※ in that field, H = the text before it. Expand every ※ before reading. f11=""+f9+T crc32=${CRC}` },
  { id: 'L1', crc: true, note: 'X-number instead of the Greek name; drop the unused H clause; drop the empty A', text: `X90. Per line, field 11 = field 9 followed by the text after ※ in it. Print only. crc32=${CRC}` },
  { id: 'L2', crc: true, note: 'PROSPHYSIS phrasing, generalised: anchor on the field index instead of the arrow', text: `X90. Per line, a field 11 of the form ※x means field 9 followed by x. Print only. crc32=${CRC}` },
  { id: 'L3', crc: true, note: 'algebraic, no prose', text: `X90 f11=f9+T where T follows ※; print only; crc32=${CRC}` },
  { id: 'L4', crc: true, note: 'shortest that still defines T', text: `X90: f11 = f9 + T after ※. Print. crc=${CRC}` },
  { id: 'L5', crc: true, note: 'terse to the point of ambiguity — priced to show the floor', text: `X90 f11=f9+※ crc=${CRC}` },
  { id: 'L2-noCrc', crc: false, note: 'L2 WITHOUT the integrity check — isolates the price of G8', text: `X90. Per line, a field 11 of the form ※x means field 9 followed by x. Print only.` },
  { id: 'L4-noCrc', crc: false, note: 'L4 without G8', text: `X90: f11 = f9 + T after ※. Print.` },
];

console.log(`PROSPHYSIS_KEY = ${T(PROSPHYSIS_KEY)} tokens: ${PROSPHYSIS_KEY}`);
console.log(`\nbreak-even to beat the shipped ${SHIPPED}: tokens(contract) <= ${BREAK_EVEN}\n`);
console.log(`${'id'.padEnd(11)} ${'tok'.padStart(4)}  ${'total'.padStart(5)}  ${'vs shipped'.padStart(10)}  ${'vs gate'.padStart(8)}  verdict`);
const rows: any[] = [];
for (const L of LADDER) {
  const c = T(L.text);
  const total = c + 1 + F_REWRITE;
  const vs = total - SHIPPED;
  const verdict = total < SHIPPED ? `WIN ${vs}` : total === SHIPPED ? 'TIE' : `loses +${vs}`;
  rows.push({ id: L.id, contractTokens: c, total, vsShipped: vs, vsGate: total - GATE, carriesCrc: L.crc, verdict, note: L.note, text: L.text });
  console.log(`${L.id.padEnd(11)} ${String(c).padStart(4)}  ${String(total).padStart(5)}  ${String(vs).padStart(10)}  ${String(total - GATE).padStart(8)}  ${verdict}   ${L.crc ? 'G8 yes' : 'G8 NO '}`);
}
const winners = rows.filter((r) => r.total < SHIPPED);
const winnersCrc = winners.filter((r) => r.carriesCrc);
console.log(`\n=== LADDER, ${LADDER.length} phrasings, priced offline against F(rewrite)=${F_REWRITE} ===`);
console.log(`beat the shipped 1394: ${winners.length}  — ${winners.map((r) => r.id).join(', ') || 'none'}`);
console.log(`...of which still carry the CRC-32 integrity check (G8): ${winnersCrc.length} — ${winnersCrc.map((r) => `${r.id} ${r.vsShipped}`).join(', ') || 'none'}`);
const cheapestCrc = rows.filter((r) => r.carriesCrc).sort((a, b) => a.contractTokens - b.contractTokens)[0];
const cheapestNo = rows.filter((r) => !r.carriesCrc).sort((a, b) => a.contractTokens - b.contractTokens)[0];
console.log(`cheapest with G8: ${cheapestCrc.id} at ${cheapestCrc.contractTokens} tokens (needs <= ${BREAK_EVEN})`);
console.log(`cheapest without G8: ${cheapestNo.id} at ${cheapestNo.contractTokens} tokens`);
console.log(`PRICE OF THE INTEGRITY CHECK: ${cheapestCrc.contractTokens - cheapestNo.contractTokens} tokens for a comparable phrasing`);
console.log(`PROSPHYSIS's key carries no CRC and costs ${T(PROSPHYSIS_KEY)}; ΣΥΜΦΥΊΑ must fit G8 inside ${BREAK_EVEN}.`);
import * as fs from 'node:fs';
fs.mkdirSync('bench/x90/receipts', { recursive: true });
fs.writeFileSync('bench/x90/receipts/contract-ladder.json', JSON.stringify({
  note: 'X90 contract ladder. Priced OFFLINE: total = tokens(contract) + 1 + F(rewrite), F(rewrite)=1364 measured in run.json for ls-l-real under OMEGA_DET=1. Break-even vs shipped 1394 is <=29 tokens. PROSPHYSIS fires the same relation with a 31-token key and no CRC.',
  fRewrite: F_REWRITE, shipped: SHIPPED, gate: GATE, breakEven: BREAK_EVEN,
  prosphysisKeyTokens: T(PROSPHYSIS_KEY), prosphysisKey: PROSPHYSIS_KEY, ladder: rows,
}, null, 1) + '\n');
console.log('\nwrote bench/x90/receipts/contract-ladder.json');
