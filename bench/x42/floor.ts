/**
 * X42 screen 5 — are the payload digit tokens already at the \p{N}{1,3} floor?
 * GPT-lineage tokenizers chunk digit runs LEFT TO RIGHT in groups of at most
 * three, so a bare run of W digits cannot cost fewer than ceil(W/3) tokens.
 * If the measured digit tokens equal that sum, digits are done and no numeric
 * mechanism can help. If there is a gap, the gap is the remaining headroom.
 */
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const msg = readFileSync(process.argv[2] || 'bench/x41/aapl-MESSAGE.txt', 'utf8');
const cut = msg.indexOf('§');
const payload = msg.slice(cut);
const pt = encode(payload);

// digit tokens, measured
const digitTok = pt.length; // placeholder, refined below
let digitChars = 0;
let floor = 0;
const hist: Record<number, number> = {};
for (const m of payload.matchAll(/\p{N}+/gu)) {
  const w = m[0].length;
  digitChars += w;
  floor += Math.ceil(w / 3);
  hist[w] = (hist[w] || 0) + 1;
}

// how many tokens do the digit runs actually consume?
// measure by tokenizing each run in isolation vs the total
let actual = 0;
for (const m of payload.matchAll(/\p{N}+/gu)) actual += encode(m[0]).length;

console.log(`payload tokens total   : ${pt.length}`);
console.log(`digit runs             : ${Object.values(hist).reduce((a, b) => a + b, 0)}`);
console.log(`digit characters       : ${digitChars}`);
console.log(`floor sum(ceil(W/3))   : ${floor}`);
console.log(`actual tokens in runs  : ${actual}`);
console.log(`HEADROOM (actual-floor): ${actual - floor}`);
console.log('\nrun-length histogram (len: count: floor: actual):');
for (const w of Object.keys(hist).map(Number).sort((a, b) => a - b)) {
  const one = encode('0'.repeat(w)).length;
  console.log(`  ${String(w).padStart(2)}: ${String(hist[w]).padStart(5)}  floor=${Math.ceil(w / 3)}  actual=${one}${one > Math.ceil(w / 3) ? '  <-- ABOVE FLOOR' : ''}`);
}
void digitTok;
