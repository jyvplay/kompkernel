/**
 * X99 — ΣΥΝΔΥΑΣΜΟΣ SMOKE TEST on the ten authoritative wires.  Incumbent = the committed wire,
 * zero frontier calls.  Two arms so the contribution of the new codec is separated from
 * ΜΕΤΑΤΑΞΙΣ's: arm A runs ΜΕΤΑΤΑΞΙΣ only, arm B runs the full alternation.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { metataxisEncode } from '../../src/lib/omega/metataxis';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';

process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
function srcPath(lane: string): string {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
}
const rows: any[] = [];
let a0 = 0, a1 = 0, b1 = 0;
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t0 = countTokens(msg, enc);
  const t = Date.now();
  const A: any = metataxisEncode(text, enc, { message: msg, messageTokens: t0, decoded: text });
  const msA = Date.now() - t;
  const t2 = Date.now();
  const B: any = syndyasmosEncode(text, enc, { message: msg, messageTokens: t0, decoded: text });
  const msB = Date.now() - t2;
  a0 += t0; a1 += A.messageTokens; b1 += B.messageTokens;
  rows.push({ lane, T0: t0, meta: A.messageTokens, metaDelta: A.messageTokens - t0, synd: B.messageTokens, syndDelta: B.messageTokens - t0, msMeta: msA, msSynd: msB, notes: B.notes });
  console.log(`${lane.padEnd(18)} T0=${String(t0).padStart(5)}  meta=${String(A.messageTokens).padStart(5)}(${String(A.messageTokens - t0).padStart(3)})  synd=${String(B.messageTokens).padStart(5)}(${String(B.messageTokens - t0).padStart(3)})  ${String(msA).padStart(6)}/${String(msB).padStart(6)}ms  ${B.notes}`);
}
fs.writeFileSync('bench/x97/receipts/synd10.json', JSON.stringify({ note: 'X99 SYNDYASMOS smoke test on the ten authoritative wires; incumbent = committed wire; zero frontier calls', rows, totals: { T0: a0, meta: a1, synd: b1, metaDelta: a1 - a0, syndDelta: b1 - a0 } }, null, 1) + '\n');
console.log(`\nTOTAL T0=${a0}  meta=${a1} (${a1 - a0})  syndyasmos=${b1} (${b1 - a0})`);
console.log(`syndyasmos beats metataxis by ${a1 - b1} tokens on the ten wires`);
