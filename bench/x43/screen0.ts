/**
 * X43 screen 0 — IS THE GLYPH ALPHABET ACTUALLY OPTIMAL?
 *
 * X42 established Floor 2: on the aapl payload the non-digit layer spends 535
 * tokens on 786 characters from a 76-character alphabet, i.e. 1.47 chars/token,
 * and KILLED glyph reassignment by argument — "any mapping must be stated in the
 * message, and 76 mappings cost more than the ~142 tokens they could save."
 *
 * That was never measured. This measures it.
 *
 * Method: take the real shipped payload, extract its non-digit character stream,
 * and re-tokenize that stream under alternative alphabets. Each alternative
 * assigns the SAME frequency ranking to a different pool of characters, so the
 * comparison isolates one variable: which characters does the BPE tokenizer
 * merge best?
 *
 * The ceiling matters: if every adjacent pair merged, 786 chars would cost 393
 * tokens. Current cost is 535. So the entire prize is at most 142 tokens (10 %
 * of a 1407-token message) — and the mapping has to be paid for out of that.
 */
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const msg = readFileSync('bench/x41/aapl-MESSAGE.txt', 'utf8');
const payload = msg.slice(msg.indexOf('§') + 1);

// The glyph stream: every non-digit character, in order.
const stream = [...payload].filter((c) => !/\p{N}/u.test(c));
const S = stream.join('');

// frequency ranking of the current alphabet
const freq = new Map<string, number>();
for (const c of stream) freq.set(c, (freq.get(c) ?? 0) + 1);
const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
const N = ranked.length;

console.log(`payload chars=${payload.length} tokens=${encode(payload).length}`);
console.log(`glyph stream : ${S.length} chars, ${N} distinct, ${encode(S).length} tokens (${(S.length / encode(S).length).toFixed(2)} c/tk)`);
console.log(`ceiling if all pairs merged: ${Math.ceil(S.length / 2)} tokens; prize <= ${encode(S).length - Math.ceil(S.length / 2)}`);
console.log(`\ncurrent alphabet (freq order): ${ranked.map((c) => JSON.stringify(c)).join('')}`);

// candidate pools, each at least N characters
const POOLS: Array<[string, string]> = [
  ['lower-latin   ', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['latin-punct   ', 'etaoinshrdlcumwfgypbvkjxqzETAOINSHRDLCUMWFGYPBVKJXQZ'],
  ['cjk-common    ', '的一是不了人我在有他这为之大来以个中上们到说国和地也子时道出会三要于下得可你年生'],
  ['greek         ', 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'],
  ['cyrillic      ', 'оеаинтсрвлкмпдуьыяъэжцчшщюйфхзжОЕАИНТСРВЛКМПДУЬЫЯЪЭЖЦЧШЩЮЙФХЗ'],
  ['box-block     ', '▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏░▒▓■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▷▸▹►▻'],
  ['latin1-suppl  ', 'àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ'],
  ['dingbat       ', '★☆☀☁☂☃☄☇☈☉☊☋☌☍☎☏☐☑☒☓☔☕☖☗☘☙☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪'],
  ['arith-symbols ', '+-*/=<>()[]{}|&^%$#@!~`\'";:,.?\\+−×÷±∓∑∏∫∂∇∆'],
  ['fullwidth     ', 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶ'],
];

console.log('\npool            distinct  tokens  c/tk   delta   mapCost  NET');
const base = encode(S).length;
for (const [name, pool] of POOLS) {
  const chars = [...new Set([...pool])];
  if (chars.length < N) { console.log(`${name}  SKIP (pool ${chars.length} < ${N})`); continue; }
  // map the i-th most frequent current glyph to the i-th pool char
  const map = new Map<string, string>();
  for (let i = 0; i < N; i++) map.set(ranked[i], chars[i]);
  const T = [...S].map((c) => map.get(c) ?? c).join('');
  const tk = encode(T).length;
  // what would it cost to state this alphabet in the message?
  const mapStr = chars.slice(0, N).join('');
  const mapCost = encode(mapStr).length + encode('Glyph order: .').length;
  const delta = base - tk;
  console.log(`${name}  ${String(N).padStart(6)}  ${String(tk).padStart(6)}  ${(T.length / tk).toFixed(2)}  ${String(delta).padStart(6)}  ${String(mapCost).padStart(7)}  ${delta - mapCost >= 0 ? '+' : ''}${delta - mapCost}`);
}

// how much merging does each pool actually achieve, independent of our stream?
console.log('\n--- intrinsic merge quality of each pool (all adjacent pairs) ---');
for (const [name, pool] of POOLS) {
  const chars = [...new Set([...pool])].slice(0, N);
  const pairs = chars.slice(0, -1).map((c, i) => c + chars[i + 1]).join('');
  const tk = encode(pairs).length;
  const nPairs = chars.length - 1;
  console.log(`${name}  ${nPairs} pairs -> ${tk} tokens (${(tk / nPairs).toFixed(2)} tok/pair; 1.00 = every pair merges)`);
}
