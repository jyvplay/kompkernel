import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { perikopiIsLegend, perikopiLine } from '../../src/lib/omega/perikopi';
import { countTokens } from '../../src/lib/omega/bpe';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for (const p of ['bench/holdout-x40/cue-sheet.md','bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-x40/metrics.tsv']) {
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  console.log(`\n### ${p.split('/').pop()}  chain ${r.messageTokens}  parent ${r.parentCodec}  has§=${msg.includes('§')}  has¶=${msg.includes('¶')}  lines ${msg.split('\n').length}`);
  const lines=msg.split('\n');
  lines.slice(0,4).forEach((l,i)=>console.log(`  [${i}] (${l.length} ch, ${countTokens(l,enc)} tok) ${JSON.stringify(l.slice(0,150))}`));
  const cand=lines.filter(l=>perikopiIsLegend(l));
  console.log(`  isLegend lines: ${cand.length}`);
  for(const l of cand){const q=perikopiLine(l,enc);console.log(`    (${l.length} ch) -> ${q?`Δ ${q.after2-q.before} via ${q.via}`:'NO WIN'}`);}
  console.log(`  notes: ${String(r.notes).slice(0,200)}`);
}
