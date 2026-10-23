/**
 * X43 screen 3 — WHERE DOES ENCODE TIME ACTUALLY GO?
 *
 * Encode time is a first-class metric in this repository (X30, X41) and it is
 * currently bad: 814 s for a 6.5 KB CSV, 2393 s for a log file, 609 s for an ls
 * listing. A real user waiting thirteen minutes to compress a spreadsheet is not
 * a usable system, so if compression is at its floor, TIME is the honest
 * remaining pareto axis.
 *
 * The stack nests: apocope -> systole -> peritrope -> antistrophe -> ... -> base.
 * Each layer encodes its parent once and then a TRIAL once, so depth d costs up
 * to 2^d base encodes. This profiles the layers individually on a mid-size lane
 * to find out whether the cost is depth multiplication or one expensive layer.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode } from '@/lib/omega/chiron';
import { antistropheEncode } from '@/lib/omega/antistrophe';
import { peritropeEncode } from '@/lib/omega/peritrope';
import { systoleEncode } from '@/lib/omega/systole';
import { apocopeEncode } from '@/lib/omega/apocope';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  console.log(`\n=== ${nm}  (${t.length} chars, ${countTokens(t, enc)} raw tokens)`);
  const layers: Array<[string, () => any]> = [
    ['chiron      ', () => chironEncode(t, enc)],
    ['antistrophe ', () => antistropheEncode(t, enc)],
    ['peritrope   ', () => peritropeEncode(t, enc)],
    ['systole     ', () => systoleEncode(t, enc)],
    ['apocope     ', () => apocopeEncode(t, enc)],
  ];
  let prev = 0;
  for (const [name, fn] of layers) {
    const t0 = Date.now();
    let r: any, err = '';
    try { r = fn(); } catch (e: any) { err = ' THREW ' + String(e).slice(0, 50); }
    const ms = Date.now() - t0;
    const tok = r ? r.messageTokens : NaN;
    console.log(`  ${name} ${String(ms).padStart(7)} ms  msg=${String(tok).padStart(5)}  +${String(ms - prev).padStart(7)} ms over previous layer${err}`);
    prev = ms;
  }
}
