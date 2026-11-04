/** Receipts for the unreadable floor and the STOICHEION cut rules. */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { stoicheionCandidates, stoicheionFoldAt } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
const files = process.argv.slice(2);
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const floor: any[] = [];
for (const p of files) {
  const t = fs.readFileSync(p, 'utf8');
  const br = zlib.brotliCompressSync(Buffer.from(t, 'utf8'), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: t.length },
  }).length;
  floor.push({ path: p, raw: T(t, enc), brotliBytes: br, frontier: F.get(p) ?? null, atom14_8: Math.ceil((br * 8) / 14.8), base100_6_6: Math.ceil((br * 8) / 6.6), eng_4_7: Math.ceil((br * 8) / 4.7) });
}
fs.writeFileSync('bench/x74/receipts/floor.json', JSON.stringify({ encoding: enc, rows: floor }, null, 1) + '\n');
const cutrule: any[] = [];
for (const p of files.filter((x) => /x41|x42|tbl/.test(x))) {
  const t = fs.readFileSync(p, 'utf8');
  const row: any = { path: p, variants: [] };
  for (const tol of [1, 0.95, 0.9, 0.8]) {
    for (const skip of [0, 1, 2]) {
      const cs = stoicheionCandidates(t, tol, { skipHeader: skip, outlierQuantile: 1 });
      if (!cs) { row.variants.push({ tol, skip, fold: null }); continue; }
      const f = stoicheionFoldAt(t, cs);
      row.variants.push({ tol, skip, cuts: cs.cuts.length, fold: f ? { rows: f.table.length, of: f.map.length, cols: f.widths.length, align: f.align } : null });
    }
  }
  cutrule.push(row);
}
fs.writeFileSync('bench/x74/receipts/cutrule.json', JSON.stringify({ rows: cutrule }, null, 1) + '\n');
console.log('floor + cutrule written', floor.length, cutrule.length);
