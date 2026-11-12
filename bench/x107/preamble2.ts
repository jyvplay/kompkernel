/** X107 — does the preamble contraction survive IN CONTEXT?  The contract is followed
 *  by '\n§<tape>', so its last token may merge with what follows.  Measure the complete
 *  message, not the isolated line. */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { perikopiGeneral } from '../../src/lib/omega/perikopi';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const VARIANTS: Array<[string, (s: string) => string]> = [
  ['identity', (s) => s],
  ['drop "Before "', (s) => s.replace(/^Before /, '')],
  ['¶ k=v; expand repeatedly. ', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶ k=v; expand repeatedly. ')],
  ['¶k=v expand ', (s) => s.replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand ')],
  ['PERIKOPI general only', (s) => perikopiGeneral(s)],
  ['PERIKOPI general + ¶k=v expand', (s) => perikopiGeneral(s).replace(/^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand ').replace(/^Before /, '')],
];
for (const p of ['bench/holdout-tbl/psql-output.txt', 'bench/holdout-x40/cue-sheet.md', 'bench/holdout-x40/prices.csv', 'bench/holdout-tbl/markdown-table.md', 'bench/holdout-x41/node-help.txt']) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(text, enc);
  const msg: string = r.message;
  const w = msg.indexOf('\n\u00a7');
  const head = w < 0 ? msg : msg.slice(0, w);
  const tail = w < 0 ? '' : msg.slice(w);
  console.log(`\n### ${p.split('/').pop()}  chain ${r.messageTokens} tok, exact ${r.decoded === text}`);
  console.log(`    contract line ${head.length} ch, ${countTokens(head, enc)} tok`);
  for (const [n, f] of VARIANTS) {
    const m = f(head) + tail;
    const t = countTokens(m, enc);
    console.log(`    ${n.padEnd(30)} msg ${String(t).padStart(4)} tok  Δ ${t - r.messageTokens > 0 ? '+' : ''}${String(t - r.messageTokens).padStart(3)}`);
  }
}
