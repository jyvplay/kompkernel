// bench/tmp/run.sh bench/z48/try.ts <file...>  — ELLEIPSIS vs plain DAEDALUS on each file (OMEGA_DET=1 recommended)
import fs from 'node:fs';
import { elleipsisEncode, elleipsisDecode } from '@/lib/omega/elleipsis';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = elleipsisEncode(text, enc);
  const re = elleipsisDecode(r.wire) === text;
  console.log(`${f.split('/').pop()}\traw=${r.inTokens}\tM=${r.messageTokens}\tplain=${r.plainMessageTokens}\tapplied=${r.applied}\texact=${r.exact}/${re}\t${r.ms}ms`);
  if (r.applied) console.log('  ' + r.sentences.join('\n  '));
  console.log('  notes: ' + r.notes.slice(0, 300));
}
