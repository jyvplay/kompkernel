/** X90 — emit the COLD-READ ARTIFACTS that bench/x90/coldread.py decodes.
 *
 *  WHAT IS BEING TESTED, AND WHY IT IS NOT THE ROUND TRIP. The TypeScript decoder shares a
 *  module, a type and a set of constants with the encoder, so a byte-exact round trip can
 *  pass while the MESSAGE ITSELF is unreadable: it only proves the two halves agree with
 *  each other, not that either is stated. X88 is the cautionary case -- ΣΥΝΤΆΞΙΣ was 75/75
 *  byte-exact with zero wrong round trips while 244 of 427 mutations decoded silently wrong.
 *  The stronger claim this repository makes for its wires is that a reader with no system
 *  prompt, no skills.md and no access to this repository can execute them, and the only way
 *  to test that is to hand the message to something that has nothing else.
 *
 *  So: this file writes, per applied lane, the contract line and the rewritten body and
 *  NOTHING ELSE -- no rules as data, no marker passed separately, no CRC passed separately.
 *  coldread.py is an independent implementation of the same grammar in a second language and
 *  a second runtime (CPython, zlib.crc32), and it must recover the original file byte for
 *  byte from those two lines alone. If the contract were under-specified -- as the 'full'
 *  form was until G10 caught it naming no marker, and as an affix containing a double quote
 *  was until the escaping fix -- the Python reader fails where the TypeScript decoder, which
 *  already knows the answer, would have succeeded.
 *
 *  The body written here is the PRE-FRONTIER rewrite. The shipped message carries the
 *  frontier's own glyph encoding between the two layers, and decoding that is the job of the
 *  existing cold checks (bench/aither_coldcheck.py, bench/kenon_decode.py); layering a third
 *  reader inside this one would test nothing new about ΣΥΜΦΥΊΑ's own contract. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { symphyiaFit, symphyiaRewrite, symphyiaContract } from '../../src/lib/omega/symphyia';

const enc = 'o200k_base' as any;
const MARKERS = '҂჻ᛝ⸙※⁂⁑⸎᚛᚜'.split('').concat(['۞', '࿊', '࿉', '᪥', 'ꙮ']);
const LANES = ['bench/holdout-x41/ls-l-real.txt', 'bench/holdout-x86/ls-la-usrbin.txt', 'bench/holdout-x86/dpkg-l-full.txt'];
const OUT = 'bench/x90/receipts/wires';
fs.mkdirSync(OUT, { recursive: true });

const manifest: any[] = [];
for (const lane of LANES) {
  const text = fs.readFileSync(lane, 'utf8');
  const fit = symphyiaFit(text);
  const marker = MARKERS.find((g) => !text.includes(g) && countTokens(g, enc) === 1);
  if (!marker) { console.log(`${lane}: no marker`); continue; }
  const chosen: any[] = []; const targets = new Set<number>();
  let bestRaw = countTokens(text, enc);
  for (const r of fit.rules) {
    if (chosen.length >= 6) break;
    if (targets.has(r.j) || targets.has(r.i)) continue;
    const trial = chosen.concat([r]);
    const w = symphyiaRewrite(text, trial, marker);
    if (w.rewritten === 0) continue;
    const raw = countTokens(symphyiaContract(trial, marker, '00000000') + '\n' + w.wire, enc);
    if (raw >= bestRaw) continue;
    bestRaw = raw; chosen.push(r); targets.add(r.j); targets.add(r.i);
  }
  if (!chosen.length) { console.log(`${lane}: no rule set`); continue; }
  const rw = symphyiaRewrite(text, chosen, marker);

  // the CRC is computed here exactly as the codec computes it, and printed into the contract;
  // coldread.py must verify it with zlib.crc32 and refuse if it does not match
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[i] = c >>> 0; }
  const bytes = Buffer.from(text, 'utf8');
  let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  const crc = ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');

  const contract = symphyiaContract(chosen, marker, crc);
  const name = path.basename(lane).replace(/\.[^.]+$/, '');
  const art = `${OUT}/${name}.sym.txt`;
  fs.writeFileSync(art, contract + '\n' + rw.wire);
  manifest.push({ lane, artifact: art, sourceBytes: Buffer.byteLength(text, 'utf8'), sourceSha256: crypto.createHash('sha256').update(text).digest('hex'), crc32: crc, rules: chosen.map((r: any) => ({ j: r.j, i: r.i, form: r.form, A: r.A, B: r.B })), marker, fieldsRewritten: rw.rewritten, contractTokens: countTokens(contract, enc) });
  console.log(`${lane}\n  -> ${art}\n  contract (${countTokens(contract, enc)} tok): ${contract}\n  fields rewritten ${rw.rewritten}, crc32 ${crc}`);
}
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify({
  note: 'Cold-read artifacts. Each .sym.txt holds the ΣΥΜΦΥΊΑ contract line and the rewritten body and nothing else. bench/x90/coldread.py must reconstruct the source from those two lines alone, in CPython, sharing no code with the encoder, and verify the CRC-32 with zlib. sourceSha256 is over the ORIGINAL file so the reconstruction can be compared byte for byte without the Python ever being given the original.',
  artifacts: manifest,
}, null, 1) + '\n');
console.log(`\nwrote ${manifest.length} artifacts + ${OUT}/manifest.json`);
