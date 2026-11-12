/** X107 — why did ΠΕΡΙΚΟΠΉ not fire on the real wire? Dump the lane's message,
 *  find the legend line, and run perikopiIsLegend/perikopiLine on it directly. */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { perikopiIsLegend, perikopiLine, perikopiRewrite } from '../../src/lib/omega/perikopi';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
for (const p of ['bench/holdout-tbl/psql-output.txt', 'bench/holdout-x40/cue-sheet.md', 'bench/holdout-x40/prices.csv', 'bench/holdout-tbl/markdown-table.md']) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(text, enc);
  const msg = r.message;
  const lines = msg.split('\n');
  console.log(`\n##### ${p}  tokens ${r.messageTokens}  parent ${r.parentCodec}  msgLines ${lines.length}  msgChars ${msg.length}`);
  console.log(`  first 6 lines:`);
  lines.slice(0, 6).forEach((l, i) => console.log(`   [${i}] ${JSON.stringify(l.slice(0, 200))}${l.length > 200 ? ' …+' + (l.length - 200) : ''}`));
  const cand = lines.filter((l) => perikopiIsLegend(l));
  console.log(`  lines matching perikopiIsLegend: ${cand.length}`);
  for (const l of cand) {
    const q = perikopiLine(l, enc);
    console.log(`   legend(${l.length} ch) -> ${q ? JSON.stringify(q.after.slice(0, 220)) + ` Δ ${q.after2 - q.before} via ${q.via}` : 'NO WIN'}`);
  }
  // what the chain actually admitted
  const rw = perikopiRewrite(msg, enc, text);
  console.log(`  perikopiRewrite edits=${rw.edits.length}  before ${rw.before} after ${rw.after}`);
  if (rw.edits.length === 0) {
    // find lines that look like a legend but were rejected
    const long = lines.filter((l) => l.length > 60 && /\.$/.test(l) && !l.includes('§'));
    console.log(`  candidate legend-shaped lines (len>60, ends '.', no §): ${long.length}`);
    long.slice(0, 3).forEach((l, i) => console.log(`   (${i}) len ${l.length} isLegend=${perikopiIsLegend(l)} :: ${JSON.stringify(l.slice(0, 260))}`));
  }
  console.log(`  notes: ${String(r.notes).slice(0, 260)}`);
}
