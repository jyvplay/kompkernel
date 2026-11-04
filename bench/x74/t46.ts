/** smoke: the two new registry entries run through `measure` and are byte-exact. */
import * as fs from 'node:fs';
import { codecEntries, measure } from '../../src/lib/omega/registry';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const entries = codecEntries().filter((e: any) => e.key === 'prosphysis' || e.key === 'stoicheion');
const lanes: Array<[string, string]> = [
  ['cue-sheet', fs.readFileSync('bench/holdout-x40/cue-sheet.md', 'utf8')],
  ['lsblk', fs.readFileSync('bench/holdout-x42/lsblk.txt', 'utf8')],
];
for (const e of entries) {
  for (const [name, t] of lanes) {
    const inTok = countTokens(t, enc);
    const r: any = await measure(e, t, enc, inTok);
    console.log(`${e.key.padEnd(12)} ${name.padEnd(10)} oneChat ${String(r.oneChatTokens).padStart(5)} exact ${r.exact} ms ${r.ms.toFixed(0)} :: ${String(r.note).slice(0, 60)}`);
  }
}
