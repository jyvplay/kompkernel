/** X88 ΣΥΝΤΆΞΙΣ round trip on every lane in the corpus, gross. No frontier call. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { syntaxisEncode, syntaxisPlan, classSignature, cellSignatureLengthSensitive } from '../../src/lib/omega/syntaxis';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const dirs = ['bench/holdout', 'bench/holdout-ops', 'bench/holdout-x40', 'bench/holdout-x41', 'bench/holdout-x42', 'bench/holdout-x42b',
  'bench/holdout-tbl', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-tab', 'bench/holdout-work', 'bench/holdout-x86', 'bench/holdout-x87'];
const files: string[] = [];
for (const d of dirs) { if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d).sort()) { const p = d + '/' + f; if (fs.statSync(p).isFile()) files.push(p); } }
const rows: any[] = []; let ok = 0, bad = 0, refused = 0;
for (const p of files) {
  const S = fs.readFileSync(p, 'utf8');
  if (S.length > 200000) continue;
  const r = syntaxisEncode(S, enc, null);
  const raw = T(S);
  const gross = r.applied ? r.messageTokens - raw : 0;
  if (!r.applied) refused++; else if (r.exact) ok++; else bad++;
  rows.push({ lane: p.split('/').pop(), path: p, lines: S.split('\n').length, applied: r.applied, exact: r.exact,
    raw, msg: r.applied ? r.messageTokens : raw, gross, families: r.families, folded: r.foldedLines,
    literal: r.literalLines, slots: r.slots, constants: r.constants, pad: r.derivedPadding,
    oldCov: r.oldCoveragePct, newCov: r.newCoveragePct, notes: r.notes.slice(0, 150) });
  const fl = rows[rows.length - 1];
  console.log(`${(r.applied ? (r.exact ? 'APPLIED ' : 'WRONG   ') : 'refused ').padEnd(8)} ${String(fl.lane).slice(0, 28).padEnd(29)} raw=${String(raw).padStart(5)} msg=${String(fl.msg).padStart(5)} gross=${String(gross).padStart(6)}  fam=${fl.families} fold=${String(fl.folded).padStart(3)}/${String(fl.lines).padStart(4)} lit=${String(fl.literal).padStart(3)} slots=${fl.slots} pad=${fl.pad} cov ${fl.oldCov}%->${fl.newCov}%`);
  if (!r.applied && fl.oldCov >= 50) console.log('    ' + r.notes);
  fs.writeFileSync('bench/x88/receipts/syntaxis-gross.json', JSON.stringify({ ok, bad, refused, rows }, null, 1) + '\n');
}
console.log(`\n=== ΣΥΝΤΆΞΙΣ gross: APPLIED+EXACT ${ok}  WRONG ${bad}  refused ${refused}  (of ${ok + bad + refused} lanes) ===`);
const wins = rows.filter((r) => r.applied && r.gross < 0).sort((a, b) => a.gross - b.gross);
console.log(`gross wins: ${wins.length}, total gross ${wins.reduce((a, r) => a + r.gross, 0)}`);
for (const r of wins.slice(0, 20)) console.log(`  ${String(r.lane).slice(0, 30).padEnd(31)} ${String(r.gross).padStart(6)}  raw=${r.raw} msg=${r.msg} fam=${r.families} fold=${r.folded}/${r.lines} pad=${r.pad} cov ${r.oldCov}%->${r.newCov}%`);
console.log('gross LOSSES:', rows.filter((r) => r.applied && r.gross > 0).map((r) => `${r.lane}:${r.gross}`).join(' '));
