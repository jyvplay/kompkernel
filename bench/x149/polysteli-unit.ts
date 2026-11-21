// X149 ΠΟΛΥΣΤΗΛΗ unit gate: self-test, real-file round-trips, adversarial cases.
import * as fs from 'node:fs';
import { polysteliTransform, polysteliUndo, polysteliSelfTest, polysteliParseMarker } from '../../src/lib/omega/polysteli';
let checks = 0, fails = 0;
const ok = (c: boolean, name: string): void => { checks++; if (!c) { fails++; console.log('FAIL', name); } };
const st = polysteliSelfTest();
checks += st.pass; fails += st.fail;
console.log(st.log.filter((l) => l.startsWith('FAIL')).join('\n') || 'selftest all pass', st.pass, st.fail);
for (const p of ['bench/holdout-x41/ls-l-real.txt', 'bench/holdout-x41/ps-aux-real.txt', 'bench/holdout-x42/dpkg-l.txt',
  'bench/holdout-x41/ps-real.txt', 'bench/holdout-x42/findmnt.txt', 'bench/holdout-x42/ps-ef.txt',
  'bench/holdout-x41/df-real.txt', 'bench/holdout-x41/du-real.txt', 'bench/holdout-x41/node-help.txt',
  'bench/holdout-x40/metrics.tsv', 'bench/holdout-tbl/kubectl-get-pods.txt', 'bench/holdout-work/unified-diff.patch']) {
  const src = fs.readFileSync(p, 'utf8');
  const tr = polysteliTransform(src);
  if (!tr) { console.log('no-fit', p); continue; }
  ok(polysteliUndo(tr.text) === src, 'undo ' + p);
  ok(tr.markers.every((m) => polysteliParseMarker(m) !== null), 'markers ' + p);
  console.log('fit', p.split('/').pop(), tr.markers.length, 'grids', tr.markers[0]!.slice(0, 70));
}
// adversarial: marker claiming widths that overflow a field -> undo throws (fail closed)
const lying = '॥3,2,2,2:1 rows single-spaced, pad field k to width k, rest verbatim.\nabcdefgh b c d tail\n';
let threw = false; try { polysteliUndo(lying); } catch { threw = true; }
ok(threw, 'overflow lie fails closed');
// unicode tail preserved verbatim
const uni = 'aa  bb  cc  dd  🚀 ξ y\nbb  cc  aa  dd  ζ ζ\ncc  aa  bb  dd  ok\n'.repeat(3);
const tru = polysteliTransform(uni);
ok(!tru || polysteliUndo(tru.text) === uni, 'unicode tails');
// tamper detection is the FULL-message comparison (modal shortcut): undo of a
// tampered row yields different bytes deterministically
const tr2 = polysteliTransform('aa  bb  cc  dd  x y\nbb  aa  cc  dd  p\n'.repeat(4));
ok(!!tr2 && polysteliUndo(tr2.text.replace('x y', 'x z')) !== 'aa  bb  cc  dd  x y\nbb  aa  cc  dd  p\n'.repeat(4), 'tamper changes bytes');
fs.writeFileSync('bench/x149/receipts/polysteli-unit.json', JSON.stringify({ checks, fails }));
console.log({ checks, fails });
if (fails) process.exit(1);
