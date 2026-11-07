import * as fs from 'node:fs';
import { sphragisEncode } from '../../src/lib/omega/sphragis';
import { kermaEncode } from '../../src/lib/omega/kerma';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const s: any = sphragisEncode(S, enc);
  const k: any = kermaEncode(S, enc);
  const bd = s.applied ? s.messageTokens - s.frontierTokens : 0;
  const kd = k.applied ? k.messageTokens - k.frontierTokens : 0;
  rows.push({ path: p, F: s.frontierTokens, sphr: bd, kerma: kd });
  const tag = s.applied ? 'HIT ' : '----';
  console.log(`${p.split('/').pop()!.padEnd(26)} F ${String(s.frontierTokens).padStart(5)} | SPHR ${s.applied ? String(bd).padStart(5) : '  --  '} | KERMA ${k.applied ? String(kd).padStart(5) : '  --  '} | ${s.notes.slice(0, 62)}`);
  fs.writeFileSync('bench/x79/receipts/sphragis.json', JSON.stringify(rows, null, 1) + '\n');
}
const hit = rows.filter((r) => r.sphr < 0);
console.log(`\nSPHRAGIS HIT ${hit.length}/${rows.length} | saved ${hit.reduce((a, r) => a + r.sphr, 0)}`);
