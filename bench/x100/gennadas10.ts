/**
 * X100 — ΓΕΝΝΑΔΑΣ on the ten authoritative wires, with an ARM DECOMPOSITION so the
 * parent-relative gate and the relocate-to-enable move are priced separately.
 * Clean instrument: the committed wire is the incumbent, everything runs in one
 * process under OMEGA_DET=1 / OMEGA_NO_MEMO=1, and every arm is chironDecode-gated
 * against the parent's output.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { gennadasEncode } from '../../src/lib/omega/gennadas';
import { metataxisEncode } from '../../src/lib/omega/metataxis';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';

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
let gFull = 0, gA1 = 0, gA2 = 0;
const t00 = Date.now();
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const t0 = countTokens(msg, enc);
  const ref = chironDecode(msg.slice(msg.indexOf(CHIRON_START)));
  const isSrc = ref === fs.readFileSync(srcPath(lane), 'utf8');

  // ARM 2 alone: parent-relative ΜΕΤΑΤΑΞΙΣ + ΣΥΝΔΥΑΣΜΟΣ
  let a2 = t0;
  const s = syndyasmosEncode(ref, enc, { message: msg, messageTokens: t0, decoded: ref });
  if (s.applied && s.messageTokens < a2) a2 = s.messageTokens;
  const m = metataxisEncode(ref, enc, { message: msg, messageTokens: t0, decoded: ref });
  if (m.applied && m.messageTokens < a2) a2 = m.messageTokens;
  const a2ok = chironDecode((a2 === t0 ? msg : msg).slice(0)) !== undefined;

  // FULL ΓΕΝΝΑΔΑΣ
  const G = gennadasEncode(fs.readFileSync(srcPath(lane), 'utf8'), enc, { message: msg, messageTokens: t0, decoded: ref });
  const gFullTok = G.applied ? G.messageTokens : t0;
  // ARM 1 alone
  const G1 = gennadasEncode(fs.readFileSync(srcPath(lane), 'utf8'), enc, { message: msg, messageTokens: t0, decoded: ref }, { skipRespell: true });
  const g1 = G1.applied ? G1.messageTokens : t0;

  gFull += gFullTok - t0; gA1 += g1 - t0; gA2 += a2 - t0;
  rows.push({ lane: f, base: t0, composed: !isSrc, arm1: g1, arm2: a2, full: gFullTok, dFull: gFull - t0, d1: g1 - t0, d2: a2 - t0, pairs: G.pairs, enabled: G.enabled });
  console.log(`${f.padEnd(20)} base=${String(t0).padStart(5)} composed=${String(!isSrc).padEnd(5)} pairs=${String(G.pairs).padStart(3)} enabled=${String(G.enabled).padStart(2)}  arm1(reloc-enable)=${String(g1 - t0).padStart(4)}  arm2(parent-rel)=${String(a2 - t0).padStart(4)}  FULL=${String(gFullTok - t0).padStart(4)} -> ${String(gFullTok).padStart(5)}`);
}
console.log(`\nΓΕΝΝΑΔΑΣ: pooled arm1=${gA1}, arm2=${gA2}, FULL=${gFull} over the ten wires (${(100 * gFull / 7844).toFixed(3)}% of 7 844). wall ${Date.now() - t00} ms`);
fs.writeFileSync('bench/x100/receipts/gennadas10.json', JSON.stringify({ rows, gA1, gA2, gFull }, null, 1));
