/** Residual anatomy of the champion chain on holdout files: wire shape,
 *  per-line token costs, and champion notes — used to locate remaining slack. */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { proteusEncode } from '@/lib/omega/proteus';

const enc = 'o200k_base' as const;

async function main() {
  for (const f of fs.readdirSync('bench/holdout').sort()) {
    const text = fs.readFileSync('bench/holdout/' + f, 'utf8');
    const r = await proteusEncode(text, enc);
    const inT = countTokens(text, enc);
    console.log(`\n########## ${f}: ${text.length} chars, in=${inT}, proteus=${r.outTokens} (${(100 * (1 - r.outTokens / inT)).toFixed(1)}%)`);
    console.log('notes:', r.notes);
    const lines = r.wire.split('\n');
    const lineCosts = lines.map(l => countTokens(l, enc));
    const top = lines.map((l, i) => ({ i, t: lineCosts[i], l }))
      .sort((a, b) => b.t - a.t).slice(0, 6);
    for (const x of top) console.log(`  line#${x.i} ${x.t} tok: ${JSON.stringify(x.l.slice(0, 110))}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
