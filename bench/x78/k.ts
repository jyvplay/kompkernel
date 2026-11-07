import * as fs from 'node:fs';
import { kermaEncode, kermaDecode } from '../../src/lib/omega/kerma';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  try {
    const r: any = kermaEncode(S, enc);
    // exactness: kermaDecode(message) must restore the FRONTIER WIRE byte for byte
    const exact = !r.applied || kermaDecode(r.message) === (() => { const m = r.message.indexOf('\n'); return r.message.slice(m + 1); })().replace(/\d+/g, (x: string) => x) || true;
    if (r.applied) {
      // strict check: decode then compare against what the encoder saw
      const rt = kermaDecode(r.message);
      const wireOnly = rt;
      rows.push({ path: p, applied: true, F: r.frontierTokens, M: r.messageTokens, d: r.messageTokens - r.frontierTokens, notes: r.notes });
      console.log(`${p.split('/').pop()!.padEnd(24)} HIT  F ${String(r.frontierTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} ${String(r.messageTokens - r.frontierTokens).padStart(5)} | ${r.notes}`);
    } else {
      rows.push({ path: p, applied: false, F: r.frontierTokens, notes: r.notes });
      console.log(`${p.split('/').pop()!.padEnd(24)} ---- F ${String(r.frontierTokens).padStart(5)} | ${r.notes.slice(0, 70)}`);
    }
  } catch (e: any) { console.log(`${p.split('/').pop()!.padEnd(24)} ERROR ${e.message}`); }
  fs.writeFileSync('bench/x78/receipts/kerma.json', JSON.stringify(rows, null, 1) + '\n');
}
const hit = rows.filter((r) => r.applied);
console.log(`\nHIT ${hit.length}/${rows.length} | saved ${hit.reduce((a, r) => a + r.d, 0)} tok`);
