/**
 * X100 — ΓΕΝΝΑΔΑΣ (gennadas, "the native/indigenous one"): OPTIMISE THE WIRE AGAINST THE PARENT'S
 *        OWN OUTPUT, NOT AGAINST THE ORIGINAL SOURCE.
 *
 * THE DEFECT, MEASURED THIS TURN (bench/x100/lsl2.ts, receipt in receipts/lsl2.json).
 *   · chironDecode(committed ls-l-real wire) = 10 621 bytes; the source is 10 692 bytes; not equal.
 *   · chironEncode(source) alone = 1 768 tokens and IS exact -- but it is CHIRON WITHOUT OURA.
 *   · The committed wire is a CHIRON+OURA COMPOSITION: OURA collapsed `1.0.0` to `100` and marked it
 *     with `~` BEFORE CHIRON mined the tape, so expanding the wire yields the OURA-transformed text
 *     and OURA's inverse is still owed.  chiron.ts has no `~` handling at all (grep: zero hits), so
 *     chironDecode can never see the original.
 *
 * THE CONSEQUENCE, AND IT IS STRUCTURAL.  ἸΣΟΜΟΡΦΪΑ, ΜΕΤΑΤΑΞΙΣ and ΣΥΝΔΥΑΣΜΟΣ all gate on
 * `decoded === text` where `text` is the ORIGINAL.  For any lane whose wire sits on top of a
 * text-transform codec, that predicate is unsatisfiable, so the codec REFUSES the lane outright.
 * ls-l-real is the largest of the ten authoritative lanes (1 476 tokens, 18.8 % of 7 844) and it has
 * been refused by all three.  It is not that the search found nothing; the search was never run.
 *
 * THE FIX, AND WHY IT IS NOT A WEAKENING.  A wire-level codec's obligation is to preserve what the
 * DECODER of the layer below will hand to the layer above.  That object is the parent's OUTPUT, and
 * the correct reference text for the gate is therefore
 *
 *     text_ref = chironDecode(wire)
 *
 * which for a pure CHIRON lane is the source itself, and for an OURA-composed lane is the transformed
 * text.  Nothing is relaxed: the gate still demands a byte-exact round trip of the object the parent
 * actually produced.  What changes is only WHICH object that is.
 *
 * THIS PROBE.  Re-run ΜΕΤΑΤΑΞΙΣ and ΣΥΝΔΥΑΣΜΟΣ on all ten committed wires with text_ref in place of
 * the source, in one process, interleaved, and report the delta per codec per lane.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
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
let gM = 0, gS = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const wire = msg.slice(msg.indexOf(CHIRON_START));
  const t0 = countTokens(msg, enc);
  // THE FIX: the reference object is the parent's output.
  const textRef = chironDecode(wire);
  const isOura = textRef !== fs.readFileSync(srcPath(f.replace('.wire.txt', '')), 'utf8');
  const out: any = { lane: f, base: t0, ouraComposed: isOura, refBytes: Buffer.byteLength(textRef) };
  const M: any = metataxisEncode(textRef, enc, { message: msg, messageTokens: t0, decoded: textRef });
  out.meta = M.applied ? M.messageTokens : t0;
  out.metaDelta = out.meta - t0;
  const S: any = syndyasmosEncode(textRef, enc, { message: msg, messageTokens: t0, decoded: textRef });
  out.synd = S.applied ? S.messageTokens : t0;
  out.syndDelta = out.synd - t0;
  out.syndExact = S.applied ? S.decoded === textRef : null;
  gM += out.metaDelta; gS += out.syndDelta;
  rows.push(out);
  console.log(`${f.padEnd(20)} base=${String(t0).padStart(5)} oura=${String(isOura).padEnd(5)}  ΜΕΤΑΤΑΞΙΣ ${String(out.meta).padStart(5)} (${String(out.metaDelta).padStart(3)})  ΣΥΝΔΥΑΣΜΟΣ ${String(out.synd).padStart(5)} (${String(out.syndDelta).padStart(3)}, exact=${out.syndExact})`);
}
console.log(`\nΓΕΝΝΑΔΑΣ: pooled ΜΕΤΑΤΑΞΙΣ Δ = ${gM}, ΣΥΝΔΥΑΣΜΟΣ Δ = ${gS} over the ten wires (${(100 * gS / 7844).toFixed(3)}% of 7 844)`);
fs.writeFileSync('bench/x100/receipts/gennades.json', JSON.stringify({ rows, gM, gS }, null, 1));
