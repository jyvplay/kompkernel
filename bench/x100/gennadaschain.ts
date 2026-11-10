/**
 * X100 — ΓΕΝΝΑΔΑΣ IN CHAIN POSITION.  Replicates the SHIPPED tail of the frontier
 * (ἸΣΟΜΟΡΦΪΑ -> ΜΕΤΑΤΑΞΙΣ -> ΣΥΝΔΥΑΣΜΟΣ, each gated on the SOURCE exactly as the
 * repository ships them) and then runs ΓΕΝΝΑΔΑΣ last, so the number reported is the
 * INCREMENTAL gain a user would actually get, not a re-run of a search that already
 * converged.  One process, OMEGA_DET=1, OMEGA_NO_MEMO=1, whole-message priced.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { isomorphiaEncode } from '../../src/lib/omega/isomorphia';
import { metataxisEncode } from '../../src/lib/omega/metataxis';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';
import { gennadasEncode } from '../../src/lib/omega/gennadas';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${e}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};
const rows: any[] = [];
let gPre = 0, gPost = 0;
const t00 = Date.now();
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t0 = countTokens(msg, enc);
  // ---- SHIPPED TAIL, exactly as tagstack ships it: every codec gated on the SOURCE.
  let cur = { message: msg, messageTokens: t0, decoded: chironDecode(msg.slice(msg.indexOf(CHIRON_START))) };
  const I = isomorphiaEncode(text, enc, cur as any);
  if (I.applied && I.messageTokens < cur.messageTokens) cur = { ...cur, message: I.message, messageTokens: I.messageTokens, decoded: I.decoded };
  const M = metataxisEncode(text, enc, cur as any);
  if (M.applied && M.messageTokens < cur.messageTokens) cur = { ...cur, message: M.message, messageTokens: M.messageTokens, decoded: M.decoded };
  const S = syndyasmosEncode(text, enc, cur as any);
  if (S.applied && S.messageTokens < cur.messageTokens) cur = { ...cur, message: S.message, messageTokens: S.messageTokens, decoded: S.decoded };
  const pre = cur.messageTokens;
  // ---- ΓΕΝΝΑΔΑΣ LAST.
  const G = gennadasEncode(text, enc, cur as any);
  const post = G.applied ? G.messageTokens : pre;
  const ok = G.applied ? chironDecode(G.message.slice(G.message.indexOf(CHIRON_START))) === chironDecode(cur.message.slice(cur.message.indexOf(CHIRON_START))) : true;
  gPre += pre - t0; gPost += post - t0;
  rows.push({ lane: f, base: t0, shippedTail: pre, gennadas: post, delta: post - pre, applied: G.applied, exact: ok, notes: G.notes });
  console.log(`${f.padEnd(20)} base=${String(t0).padStart(5)} shippedTail=${String(pre).padStart(5)} (${String(pre - t0).padStart(3)})  ΓΕΝΝΑΔΑΣ=${String(post).padStart(5)} (${String(post - pre).padStart(3)}) applied=${String(G.applied).padEnd(5)} exact=${ok}`);
}
console.log(`\nCHAIN POSITION: shipped tail pooled ${gPre}; with ΓΕΝΝΑΔΑΣ pooled ${gPost} over the ten wires. INCREMENTAL = ${gPost - gPre} (${(100 * (gPost - gPre) / 7864).toFixed(3)}% of 7 864). wall ${Date.now() - t00} ms`);
fs.writeFileSync('bench/x100/receipts/gennadaschain.json', JSON.stringify({ rows, gPre, gPost }, null, 1));
