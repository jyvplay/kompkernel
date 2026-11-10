/**
 * X97 — APT-REAL REGRESSION REPRO.  RUN L pass 2 reported apt-real X74=874 against runE_F=850
 * (Δ=+24) while every other lane was ≤ 0 and meta10.ts measured ΜΕΤΑΤΑΞΙΣ taking the committed
 * 850-token wire to 835.  Either (a) the base chain itself produced 874 in that process -- the
 * load-sensitivity defect X96 measured -- or (b) ΜΕΤΑΤΑΞΙΣ emitted a worse message while claiming a
 * better one, which `admit` cannot catch because it trusts `messageTokens`.
 *
 * This replays the exact chain order on the committed wire and prints the token count of the message
 * each pass actually returns, recomputed independently with countTokensExact.
 */
import * as fs from 'node:fs';
import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
import { isomorphiaEncode } from '../../src/lib/omega/isomorphia';
import { metataxisEncode } from '../../src/lib/omega/metataxis';

process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
const msg = fs.readFileSync('bench/x87/receipts/wires/apt-real.wire.txt', 'utf8');
const text = fs.readFileSync('bench/holdout-x41/apt-real.txt', 'utf8');
const show = (tag: string, r: any): void => {
  const a = countTokens(r.message, enc), b = countTokensExact(r.message, enc);
  console.log(`${tag.padEnd(28)} claimed=${String(r.messageTokens).padStart(5)} countTokens=${String(a).padStart(5)} exact=${String(b).padStart(5)} agree=${a === b && a === r.messageTokens} applied=${r.applied} decoded_ok=${r.decoded === text}`);
};
let best: any = { message: msg, messageTokens: countTokens(msg, enc), decoded: text };
show('incumbent (committed wire)', best);
delete process.env.OMEGA_NO_ISO;
const iso = isomorphiaEncode(text, enc, best);
show('after ISOMORPHIA', iso);
if (iso.applied && iso.messageTokens < best.messageTokens) best = iso;
delete process.env.OMEGA_NO_METATAXIS;
const meta = metataxisEncode(text, enc, best);
show('after METATAXIS', meta);
