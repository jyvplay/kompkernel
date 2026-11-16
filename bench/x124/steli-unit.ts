import { steliSelfTest, steliTransform, steliUndo, steliFit } from '../../src/lib/omega/steli';
import * as fs from 'node:fs';
const r = steliSelfTest();
console.log(`self-test: ${r.pass} pass, ${r.fail} fail`);
for (const l of r.log.filter((x) => x.startsWith('FAIL'))) console.log('  ' + l);
for (const p of ['bench/holdout-x42/findmnt.txt','bench/holdout-x41/node-help.txt','bench/holdout-x42/dpkg-l.txt','bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x41/ls-l-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-x41/ls-real.txt','bench/holdout-tbl/psql-output.txt','bench/holdout/code-ts.txt']) {
  const src = fs.readFileSync(p, 'utf8');
  const tr = steliTransform(src);
  console.log(`${p.split('/').pop()!.padEnd(24)} ${tr ? `FIT rows ${tr.rows} cols ${tr.offsets.length} offsets ${tr.offsets.join(',')} pad ${tr.padMass} undo ${steliUndo(tr.text) === src}` : 'no fit'}`);
}
