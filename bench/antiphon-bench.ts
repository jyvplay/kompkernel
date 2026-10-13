/**
 * bench/antiphon-bench.ts — ANTIPHON∘KAIROS vs KAIROS, one JSON line per file.
 *   node antiphon-bench.mjs files...
 * Both arms use the same deterministic work budget (KAIROS_WORK_UNITS).
 * `winner` is the arm antiphonEncode actually emits; `exact` is the decode gate.
 */
import fs from 'node:fs';
import { antiphonEncode } from '../src/lib/omega/antiphon';

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = antiphonEncode(text, 'o200k_base');
  console.log(JSON.stringify({
    file: f, in: r.inTokens, msg: r.messageTokens, arm: r.arm, exact: r.exact,
    copied: r.copied, edits: r.edits, ms: Date.now() - t0, notes: r.notes,
  }));
}
