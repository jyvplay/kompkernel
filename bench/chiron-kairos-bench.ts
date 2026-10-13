/**
 * bench/chiron-kairos-bench.ts — CHIRON timed vs KAIROS deterministic work-unit budget.
 *
 *   timed:  node chiron-kairos-bench.mjs timed <budgetMs> files...
 *   work:   node chiron-kairos-bench.mjs work <workUnits> files...   (runs each file twice, checks identical wire)
 *
 * Prints one JSON line per file. `exact` = chironDecode(wire) === text.
 */
import fs from 'node:fs';
import { chironEncode, chironDecode } from '../src/lib/omega/chiron';

const [mode, arg, ...files] = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const opts: any = mode === 'timed' ? { budgetMs: Number(arg) } : { workUnits: Number(arg) };
  const r = chironEncode(text, 'o200k_base', opts);
  const ms = Date.now() - t0;
  const exact = chironDecode(r.wire) === text;
  let repeatSame: boolean | null = null;
  if (mode === 'work') {
    const r2 = chironEncode(text, 'o200k_base', opts);
    repeatSame = r2.wire === r.wire;
  }
  const work = /kairos work=(\d+)/.exec(r.notes)?.[1] ?? null;
  console.log(JSON.stringify({
    file: f.split('/').pop(), mode, arg: Number(arg), in: r.inTokens, msg: r.messageTokens,
    contract: r.contractTokens, out: r.outTokens, mode_: r.mode, exact, ms, work, repeatSame,
    variant: /variant=([^;]+)/.exec(r.notes)?.[1] ?? null, wireSha: Buffer.from(r.wire).length,
  }));
}
