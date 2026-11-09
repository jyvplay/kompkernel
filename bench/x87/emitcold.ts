/** X87 — emit everything a COLD reader needs to check the ΑΙΘΗΡ envelope without
 *  importing a single line of this repo's logic. Data, not code: the atom alphabet
 *  (index, vocabulary id, atom), the alphabet metadata, and one wire per lane.
 *  The reader is bench/aither_coldcheck.py. It cannot verify the CM payload decode —
 *  that would mean reimplementing the coder — and it does not claim to. */
import * as fs from 'node:fs';
import { aitherEncode } from '../../src/lib/omega/aither';
import { buildAtomAlphabet, countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const alpha = buildAtomAlphabet(enc);
const dir = 'bench/x87/receipts/cold';
fs.mkdirSync(dir, { recursive: true });

// The alphabet is `^ [A-Za-z]{1,24}$` by construction, so the trimmed form is lossless.
const lines: string[] = [];
for (let i = 0; i < alpha.atoms.length; i++) {
  const a = alpha.atoms[i];
  lines.push(`${i}\t${a.length}\t${a.slice(1)}`);
}
fs.writeFileSync(dir + '/alphabet.tsv', lines.join('\n') + '\n');

fs.writeFileSync(dir + '/meta.json', JSON.stringify({
  encoding: enc, M: alpha.atoms.length, bits: alpha.bits, fingerprint: alpha.fingerprint,
  candidates: alpha.candidates, scanned: alpha.scanned, meanChars: alpha.meanChars,
  minChars: alpha.minChars, maxChars: alpha.maxChars, proof: alpha.proof,
  atomShape: '^ [A-Za-z]{1,24}$', blockBytes: 512, headerBytes: 4,
  checksumBits: 32, checksumAtoms: Math.max(1, Math.ceil(32 / alpha.bits)),
}, null, 1) + '\n');

const lanes = (JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'))).rows;
const wires: any[] = [];
for (const r of lanes) {
  const S = fs.readFileSync(r.path, 'utf8');
  const a = await aitherEncode(S, enc, r.tokens);
  if (!a.applied) { console.log('skip (refused)', r.path); continue; }
  wires.push({ lane: r.path.split('/').pop(), path: r.path, bytes: Buffer.byteLength(S),
    sha256: null, sourceChars: S.length, wire: a.message, messageTokens: a.messageTokens,
    atomCount: a.atomCount, checksumAtoms: a.checksumAtoms, payloadCodec: a.payloadCodec,
    payloadCodecName: a.payloadCodecName, frontierTokens: r.tokens });
  console.log(`${wires[wires.length-1].lane.padEnd(22)} atoms=${a.atomCount} tok=${a.messageTokens} codec=${a.payloadCodec}`);
}
fs.writeFileSync(dir + '/wires.jsonl', wires.map(w => JSON.stringify(w)).join('\n') + '\n');
console.log(`\nwrote ${alpha.atoms.length} atoms and ${wires.length} wires to ${dir}/`);
