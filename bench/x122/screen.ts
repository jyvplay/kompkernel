/** X122 screen — ΣΤΟΙΧΗΔΟΝ applied to the frozen X121 frontier messages.
 *  Zero encoder calls: this measures the mechanism on the exact wires the parent
 *  frontier produced, so the number is attributable to this codec alone.
 *  Run: bash bench/x15/run.sh bench/x122/screen.ts [messages.jsonl] [out] */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { stoichedonEncode, stoichedonDisabled } from '../../src/lib/omega/stoichedon';

const enc: EncodingName = 'o200k_base';
const src = process.argv[2] ?? 'bench/x121/receipts/ab-messages.jsonl';
const out = process.argv[3] ?? 'bench/x122/receipts/screen-stoichedon';
if (stoichedonDisabled()) throw new Error('OMEGA_NO_STOICHEDON is set');
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  const m: string = r.message;
  const base = countTokens(m, enc);
  const t0 = performance.now();
  const res = stoichedonEncode('', enc, { message: m, messageTokens: base });
  const ms = performance.now() - t0;
  const after = countTokens(res.message, enc);
  let exact = true;
  const w = m.indexOf(CHIRON_START);
  if (w >= 0) {
    const w2 = res.message.indexOf(CHIRON_START);
    try { exact = chironDecode(m.slice(w)) === chironDecode(res.message.slice(w2)); } catch { exact = false; }
  }
  rows.push({ path: r.path, base, after, delta: after - base, applied: res.applied, exact,
    rules: res.rules, freePool: res.freePool, orderMoves: res.orderMoves, glyphMoves: res.glyphMoves,
    probes: res.probes, ms: Math.round(ms), notes: res.notes });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${after} Δ=${after - base} exact=${exact} rules=${res.rules} free=${res.freePool} ord=${res.orderMoves} gly=${res.glyphMoves} probes=${res.probes} ms=${Math.round(ms)}`);
}
const tb = rows.reduce((a, r) => a + r.base, 0), ta = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x122/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x122-stoichedon-screen-v1', src,
  encoderCalls: 0, totals: { base: tb, after: ta, delta: ta - tb,
    wins: rows.filter(r => r.delta < 0).length, worse: rows.filter(r => r.delta > 0).length,
    inexact: rows.filter(r => !r.exact).length, lanes: rows.length,
    ms: Math.round(rows.reduce((a, r) => a + r.ms, 0)) }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.filter(r => r.applied).map(r => JSON.stringify({ path: r.path, tokens: r.after })).join('\n') + '\n');
console.log(`TOTAL ${tb} -> ${ta} Δ=${ta - tb} wins=${rows.filter(r => r.delta < 0).length}/${rows.length} worse=${rows.filter(r => r.delta > 0).length} inexact=${rows.filter(r => !r.exact).length} ms=${Math.round(rows.reduce((a, r) => a + r.ms, 0))}`);
