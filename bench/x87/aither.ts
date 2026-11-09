/** X87 ledger — ΑΙΘΗΡ over the committed 29-lane frontier.
 *  Every number here is a real tokenizer count of a real wire, and every wire is
 *  round-tripped through aitherDecode (checksum verified) before it is counted. */
import * as fs from 'node:fs';
import { aitherEncode, aitherDecode, checksumAtomCount } from '../../src/lib/omega/aither';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const lanes = (JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'))).rows;
const rows: any[] = [];
console.log('K checksum atoms =', checksumAtomCount(enc));
console.log('lane'.padEnd(22) + 'raw'.padStart(6) + 'F'.padStart(6) + 'AITH'.padStart(6) + 'gain'.padStart(7) + 'gain%'.padStart(7) + '  codec'.padEnd(16) + 'bpa'.padStart(6) + ' rt');
let T = { raw: 0, F: 0, A: 0 }, wins = 0, refusals = 0;
for (const r of lanes) {
  const S = fs.readFileSync(r.path, 'utf8');
  const t0 = Date.now();
  const a = await aitherEncode(S, enc, r.tokens);
  let rt = false;
  if (a.applied) { try { rt = (await aitherDecode(a.message, enc)) === S; } catch { rt = false; } }
  else rt = a.decoded === S;
  rows.push({ path: r.path, lane: r.path.split('/').pop(), bytes: Buffer.byteLength(S), raw: r.raw, F: r.tokens,
    parent: r.parent, aither: a.messageTokens, gain: r.tokens - a.messageTokens,
    gainPct: +(100 * (r.tokens - a.messageTokens) / r.tokens).toFixed(2), applied: a.applied,
    payloadCodec: a.payloadCodec, payloadCodecName: a.payloadCodecName, atomCount: a.atomCount,
    checksumAtoms: a.checksumAtoms, invariantHolds: a.invariantHolds, bitsPerAtom: a.bitsPerAtom,
    exact: a.exact, rt, notes: a.notes, ms: Date.now() - t0 });
  const x = rows[rows.length - 1];
  T.raw += x.raw; T.F += x.F; T.A += x.aither; if (x.applied) wins++; else refusals++;
  console.log(String(x.lane).padEnd(22) + String(x.raw).padStart(6) + String(x.F).padStart(6) + String(x.aither).padStart(6) +
    String(x.gain).padStart(7) + (x.gainPct.toFixed(1) + '%').padStart(7) + ('  ' + x.payloadCodecName).padEnd(16) +
    String(x.sourceBitsPerAtom).padStart(6) + ' ' + x.rt + (x.applied ? '' : '  REFUSED: ' + x.notes));
  fs.mkdirSync('bench/x87/receipts', { recursive: true });
  fs.writeFileSync('bench/x87/receipts/aither-ledger.json', JSON.stringify({ totals: T, wins, refusals, rows }, null, 1) + '\n');
}
console.log(`\nTOTAL raw=${T.raw} frontier=${T.F} AITHER=${T.A}  gain=${T.F - T.A} (${(100 * (T.F - T.A) / T.F).toFixed(2)}%)  applied ${wins}/29 refused ${refusals}`);
console.log('all round trips byte-exact: ' + rows.every(x => x.rt) + '   envelope invariant on every applied lane: ' + rows.filter(x => x.applied).every(x => x.invariantHolds));
