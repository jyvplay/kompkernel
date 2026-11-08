import * as fs from 'node:fs';
import { schemaEncode, schemaDecode } from '../../src/lib/omega/schema';
const enc: any = 'o200k_base';
let win = 0, tot = 0, delta = 0;
for (const p of process.argv.slice(2)) {
  let S: string; try { S = fs.readFileSync(p, 'utf8'); } catch { continue; }
  if (S.length > 60000) { console.log(`${p.split('/').pop()!.padEnd(26)} SKIP(large)`); continue; }
  const n = p.split('/').pop()!;
  let r: any; try { r = schemaEncode(S, enc); } catch (e: any) { console.log(`${n.padEnd(26)} THREW ${e.message}`); continue; }
  const rt = schemaDecode(r.message ?? S) === S;
  const d = (r.applied ? r.messageTokens : r.frontierTokens) - r.frontierTokens;
  tot++; if (r.applied) { win++; delta += d; }
  console.log(`${n.padEnd(26)} F ${String(r.frontierTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} ${r.applied ? `WIN ${String(d).padStart(4)}` : '   —  '} rt=${rt} ${r.applied ? r.shapes.map((s: any) => `${s.sample}->${s.len}d`).join(',') : ''}`);
}
console.log(`\nAPPLIED ${win}/${tot}  total delta ${delta}`);
