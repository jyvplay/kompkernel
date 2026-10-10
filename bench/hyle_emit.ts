/**
 * HYLE wire emitter — the TypeScript half of the independent cross-check.
 *
 * Encodes each input file with the shipped encoder (`hyleEncode`, fast mode, which
 * always selects HYLE's own protocol arm `b`) and writes two files per input into the
 * output directory:
 *
 *   <basename>.wire   the wire, exactly as it would ride in a single chat message
 *   <basename>.src    the original text, for the reader to byte-compare against
 *
 * `bench/hyle-crosscheck.sh` then feeds each `.wire` to `bench/hyle_decode.py`, a CPython
 * reader written from the contract prose rather than transliterated from this module.
 * The two halves share no code; agreement is evidence that the wire is a portable
 * specification, not a runtime artifact of this implementation.
 *
 *   npx esbuild bench/hyle_emit.ts --bundle --platform=node --format=esm \
 *     --outfile=bench/tmp/hyle_emit.mjs --alias:@=./src --packages=external
 *   node bench/tmp/hyle_emit.mjs [outDir] file...
 */
import fs from 'node:fs';
import path from 'node:path';
import { hyleEncode } from '@/lib/omega/hyle';

const args = process.argv.slice(2);
let out = 'bench/tmp/xc';
if (args[0]?.startsWith('--out=')) out = (args.shift() as string).slice('--out='.length);
fs.mkdirSync(out, { recursive: true });

for (const f of args) {
  const text = fs.readFileSync(f, 'utf8');
  const r = hyleEncode(text, 'o200k_base', { fast: true, budgetMs: 30000 });
  const base = path.basename(f);
  fs.writeFileSync(path.join(out, base + '.wire'), r.wire, 'utf8');
  fs.writeFileSync(path.join(out, base + '.src'), text, 'utf8');
  console.log(
    `${base}: arm=${r.arm} folds=${r.folds.join('+') || 'none'}` +
    ` wire=${r.outTokens} contract=${r.contractTokens} M=${r.messageTokens}/${r.inTokens}` +
    ` exactTS=${r.exact}`,
  );
  if (!r.exact) { console.error(`  !! TS decoder did not reproduce ${base}`); process.exitCode = 1; }
}
