import * as fs from 'node:fs';
import { steliTransform, steliUndo, steliFit, steliRebuildRow } from '../../src/lib/omega/steli';
for (const p of ['bench/holdout-x42/findmnt.txt','bench/holdout-tbl/psql-output.txt']) {
  const src = fs.readFileSync(p, 'utf8');
  const tr = steliTransform(src)!;
  const back = steliUndo(tr.text);
  console.log('===', p.split('/').pop(), 'equal', back === src, 'len', src.length, back.length);
  const a = src.split('\n'), b = back.split('\n');
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 3; i++) {
    if (a[i] !== b[i]) { shown++; console.log('  line', i); console.log('   src', JSON.stringify((a[i] ?? '').slice(0, 110))); console.log('   bak', JSON.stringify((b[i] ?? '').slice(0, 110))); }
  }
  const blk = steliFit(a)!;
  console.log('  block start', blk.start, 'rows', blk.rows, 'offs', blk.offsets.join(','));
  for (let r = 0; r < 2; r++) {
    console.log('   row', r, JSON.stringify(blk.fields[r]));
    console.log('   rebuilt', JSON.stringify(steliRebuildRow(blk.fields[r]!, blk.offsets).slice(0, 110)));
    console.log('   orig   ', JSON.stringify(a[blk.start + r]!.slice(0, 110)));
  }
}
