/** X42 screen 4 — where do the tokens in a shipped message actually go? */
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const msg = readFileSync(process.argv[2] || 'bench/x41/aapl-MESSAGE.txt', 'utf8');
const src = readFileSync(process.argv[3] || 'bench/x41/aapl-SOURCE.txt', 'utf8');
const toks = encode(msg);
console.log(`message: ${msg.length} chars, ${toks.length} tokens (${(msg.length / toks.length).toFixed(2)} c/tk)`);
console.log(`source : ${src.length} chars`);

// split at the last "print only." -> instruction vs payload
const cut = msg.indexOf('§');
const instr = msg.slice(0, cut);
const payload = msg.slice(cut);
console.log(`\ninstruction: ${instr.length} chars, ${encode(instr).length} tokens`);
console.log(`payload    : ${payload.length} chars, ${encode(payload).length} tokens (${(payload.length / encode(payload).length).toFixed(2)} c/tk)`);

// classify payload tokens
const pt = encode(payload);
const dec = pt.map((t) => {
  // decode single token to text
  return String(t);
});
// Use a real detokenizer: decode each token alone via the lib
const { decode } = require('gpt-tokenizer');
const texts = pt.map((t) => decode([t]));
const cats: Record<string, number> = { digits: 0, digitmix: 0, latin: 0, cyr: 0, punct: 0, space: 0, other: 0 };
for (const s of texts) {
  if (/^\s+$/.test(s)) cats.space++;
  else if (/^\p{N}+$/u.test(s)) cats.digits++;
  else if (/\p{N}/u.test(s)) cats.digitmix++;
  else if (/\p{Script=Cyrillic}/u.test(s)) cats.cyr++;
  else if (/\p{Script=Latin}/u.test(s)) cats.latin++;
  else if (/^\P{L}+$/u.test(s)) cats.punct++;
  else cats.other++;
}
console.log('\npayload token categories:');
for (const [k, v] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(5)}  ${(100 * v / pt.length).toFixed(1)}%`);
}
void dec;
