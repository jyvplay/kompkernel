/** Z44: emit the literal one-chat message GRAMMA asks a reader to decode, plus the expected bytes.
 *  Usage: ./bench/z44/build.sh bench/z44/gramma-prompt.mjs.ts <file> <outPrefix> */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { grammaEncode, grammaDecode } from '@/lib/omega/gramma';
const [file, out] = process.argv.slice(2);
const text = fs.readFileSync(file, 'utf8');
const r = grammaEncode(text, 'o200k_base');
fs.writeFileSync(`${out}.message.txt`, r.decoderPrompt);
fs.writeFileSync(`${out}.expected.txt`, text);
console.log(JSON.stringify({
  file, dialect: r.winningDialect, inTokens: r.inTokens, wireTokens: r.outTokens,
  clauseTokens: r.clauseTokens, oneChat: r.messageTokens,
  daedalusOneChat: r.candidates[0].M, saved: r.candidates[0].M - r.messageTokens,
  messageTokensRecomputed: countTokens(r.decoderPrompt, 'o200k_base'),
  exact: r.exact, libDecode: grammaDecode(r.decoderPrompt) === text,
  candidates: r.candidates.map((c) => `${c.id}:${c.M}/${c.wireTokens}`),
}, null, 1));
