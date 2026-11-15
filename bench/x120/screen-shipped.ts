/**
 * X120 screen — the SHIPPED ΒΕΛΤΙΣΤΟΣ module applied to frozen frontier messages.
 * Zero encoder calls: this measures the mechanism on the exact wires the parent
 * frontier produced, so the number is attributable to this codec alone.
 * Run: bash bench/x15/run.sh bench/x120/screen-shipped.ts [messages.jsonl] [out]
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { veltistosEncode } from '../../src/lib/omega/veltistos';

const enc: EncodingName = 'o200k_base';
const src = process.argv[2] ?? 'bench/x119/receipts/final-frontier.jsonl';
const out = process.argv[3] ?? 'bench/x120/receipts/screen-shipped';
const rows: any[] = [];
for (const line of fs.readFileSync(src, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  const m: string = r.message;
  const base = countTokens(m, enc);
  const t0 = performance.now();
  const res = veltistosEncode('', enc, { message: m, messageTokens: base, decoded: '' });
  const ms = performance.now() - t0;
  const after = countTokens(res.message, enc);
  let exact = true;
  const w = m.indexOf(CHIRON_START);
  if (w >= 0) {
    const w2 = res.message.indexOf(CHIRON_START);
    try { exact = chironDecode(m.slice(w)) === chironDecode(res.message.slice(w2)); } catch { exact = false; }
  }
  rows.push({ path: r.path, base, after, delta: after - base, applied: res.applied, exact, notes: res.notes,
    parses: res.parses, edges: res.edges, priced: res.priced, bodyGain: res.bodyGain, tapeGain: res.tapeGain,
    pruned: res.pruned, capped: res.capped, ms: Math.round(ms), message: res.message });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} M=${base} -> ${after} Δ=${after - base} exact=${exact} body=${res.bodyGain} tape=${res.tapeGain} edges=${res.edges} ms=${Math.round(ms)}${res.capped ? ' CAPPED' : ''}`);
}
const totalBase = rows.reduce((a, r) => a + r.base, 0), totalAfter = rows.reduce((a, r) => a + r.after, 0);
fs.mkdirSync('bench/x120/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x120-shipped-screen-v1', src,
  ladder: process.env.OMEGA_VELTISTOS_LADDER ?? 'default', encoderCalls: 0,
  totals: { base: totalBase, after: totalAfter, delta: totalAfter - totalBase, wins: rows.filter(r => r.delta < 0).length,
    worse: rows.filter(r => r.delta > 0).length, inexact: rows.filter(r => !r.exact).length, lanes: rows.length }, rows }, null, 2) + '\n');
fs.writeFileSync(out + '.jsonl', rows.map(r => JSON.stringify({ path: r.path, tokens: r.after, message: r.message })).join('\n') + '\n');
console.log(`TOTAL ${totalBase} -> ${totalAfter} Δ=${totalAfter - totalBase} wins=${rows.filter(r => r.delta < 0).length}/${rows.length} worse=${rows.filter(r => r.delta > 0).length} inexact=${rows.filter(r => !r.exact).length}`);
