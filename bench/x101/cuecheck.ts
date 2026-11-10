/** Isolated timing control for the one lane whose frontier wall-clock was anomalous. */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
for (const p of ['bench/holdout-x40/cue-sheet.md', 'bench/holdout-x40/prices.csv', 'bench/holdout-tbl/psql-output.txt']) {
  const text = fs.readFileSync(p, 'utf8');
  const ms: number[] = [];
  for (let r = 0; r < 3; r++) { const t = Date.now(); const R: any = chironEncode(text, enc); ms.push(Date.now() - t); if (r === 2) console.log(`${p.padEnd(34)} tok=${R.messageTokens} reps=${ms.join('/')}ms`); }
}
