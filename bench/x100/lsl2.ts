import * as fs from 'node:fs';
import { chironEncode, chironDecode, chironOpsUsed } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const text = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8');
const committed = fs.readFileSync('bench/x87/receipts/wires/ls-l-real.wire.txt', 'utf8');
for (const [tag, msg] of [['committed', committed]] as Array<[string, string]>) {
  const dec = chironDecode(msg.slice(msg.indexOf('§')));
  console.log(`${tag}: src ${Buffer.byteLength(text)} dec ${Buffer.byteLength(dec)} exact=${dec === text} tok=${countTokens(msg, enc)}`);
}
// fresh encode
const r: any = chironEncode(text, enc);
const dec2 = chironDecode(r.wire.slice(r.wire.indexOf('§')));
console.log(`fresh encode: src ${Buffer.byteLength(text)} dec ${Buffer.byteLength(dec2)} exact=${dec2 === text} tok=${countTokens(r.decoderPrompt, enc)}`);
console.log('ops used:', JSON.stringify(chironOpsUsed(r.wire)));
if (dec2 !== text) {
  const n = Math.min(dec2.length, text.length); let i = 0; while (i < n && dec2[i] === text[i]) i++;
  console.log('first divergence at', i, 'of', n);
  console.log('src :', JSON.stringify(text.slice(Math.max(0, i - 70), i + 70)));
  console.log('dec :', JSON.stringify(dec2.slice(Math.max(0, i - 70), i + 70)));
}
// where does ~ appear in the fresh wire?
const w = r.wire.indexOf('§'), t = r.wire.indexOf('¶', w);
console.log('~ in tape:', (r.wire.slice(w, t).match(/~/g) || []).length, ' ~ in body:', (r.wire.slice(t + 1).match(/~/g) || []).length);
const m = r.wire.slice(t + 1).match(/~[^ ]{0,12}/g);
console.log('body ~ samples:', JSON.stringify((m || []).slice(0, 25)));
