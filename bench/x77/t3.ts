/** X77 / t3 — does MERISMOS beat the frontier, and is it byte-exact? */
import * as fs from 'node:fs';
import { merismosEncode, merismosDecode } from '../../src/lib/omega/merismos';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  try {
    const r: any = merismosEncode(S, enc);
    const exact = !r.applied || merismosDecode(r.message) === S;
    if (r.applied && !exact) console.log(`!!! BYTE MISMATCH ${p}`);
    rows.push({ path: p, applied: r.applied, F: r.frontierTokens, M: r.messageTokens, d: r.applied ? r.messageTokens - r.frontierTokens : 0, exact, notes: r.notes });
    console.log(`${p.split('/').pop()!.padEnd(24)} ${r.applied ? 'HIT ' : '----'} F ${String(r.frontierTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} ${r.applied ? String(r.messageTokens - r.frontierTokens).padStart(5) : '    '} exact=${exact} | ${r.notes.slice(0, 100)}`);
  } catch (e: any) { console.log(`${p.split('/').pop()!.padEnd(24)} ERROR ${e.message}`); rows.push({ path: p, error: String(e.message) }); }
  fs.writeFileSync('bench/x77/receipts/merismos.json', JSON.stringify(rows, null, 1) + '\n');
}
const hit = rows.filter((r) => r.applied);
const bad = rows.filter((r) => r.applied && !r.exact);
console.log(`\nHIT ${hit.length}/${rows.length} lanes | saved ${hit.reduce((a, r) => a + r.d, 0)} tok | byte-exact ${hit.length - bad.length}/${hit.length}`);
