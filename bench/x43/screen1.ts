/**
 * X43 screen 1 — WHAT IS THE PRIZE FOR A MERGE-FRIENDLY RULE ALPHABET?
 *
 * chiron.ts:1344 chooses the glyph script ONCE, by MINIMUM COLLISION COUNT
 * against the payload, and never re-examines it: the whole variant sweep
 * (separators x blocks x macros) reuses that one script. Cost is never part of
 * the decision, and no Latin script exists in CHIRON_SCRIPTS at all.
 *
 * That matters because the alphabet is FREE to change: chiron.ts:144 says the
 * first letter of the tape declares the script, so "nothing about the alphabet
 * is transmitted". X42's Floor 2 killed glyph reassignment on the grounds that
 * the mapping would have to be stated in-message. THAT ARGUMENT WAS WRONG, and
 * this screen replaces it with a measurement.
 *
 * Method: take the real shipped payload, identify the rule letters actually
 * used, and remap them frequency-ordered onto Latin characters that do NOT
 * collide with literal payload characters. Measure the token delta. That delta
 * is the entire prize, before any implementation cost.
 */
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const msg = readFileSync('bench/x41/aapl-MESSAGE.txt', 'utf8');
const payload = msg.slice(msg.indexOf('§'));
const base = encode(payload).length;

// Rule letters are whatever the current script uses: everything non-ASCII and
// non-digit. Literal payload characters are ASCII (digits, punctuation, the few
// header letters).
const isRule = (c: string) => c.codePointAt(0)! > 0x2026 || (c.codePointAt(0)! >= 0x0370 && c.codePointAt(0)! < 0x2000);
const chars = [...payload];
const ruleFreq = new Map<string, number>();
const literalSet = new Set<string>();
for (const c of chars) {
  if (/\p{N}/u.test(c)) continue;
  if (isRule(c)) ruleFreq.set(c, (ruleFreq.get(c) ?? 0) + 1);
  else literalSet.add(c);
}
const ranked = [...ruleFreq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
const nRules = ranked.length;

console.log(`payload          : ${payload.length} chars, ${base} tokens`);
console.log(`literal (ASCII)  : ${[...literalSet].map((c) => JSON.stringify(c)).join(' ')}`);
console.log(`rule letters used: ${nRules}`);
const ruleChars = chars.filter(isRule).length;
console.log(`rule-letter occurrences in payload: ${ruleChars}`);
console.log(`current cost of those ${ruleChars} chars: ${encode(chars.filter(isRule).join('')).length} tokens`);

// Candidate target pools, all excluding any character literal in the payload.
const POOLS: Array<[string, string]> = [
  ['latin-letters', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['latin+punct  ', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&\'()*+-./:;<=>?@[]^`{|}~"'],
  ['latin+digits ', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
];

for (const [name, raw] of POOLS) {
  const pool = [...new Set([...raw])].filter((c) => !literalSet.has(c) && !/\p{N}/u.test(c) || (/\p{N}/u.test(c) && !literalSet.has(c)));
  const usable = [...new Set([...raw])].filter((c) => !literalSet.has(c));
  // intrinsic merge quality of this pool on adjacent pairs
  const pairs = usable.slice(0, -1).map((c, i) => c + usable[i + 1]).join('');
  const tpp = encode(pairs).length / (usable.length - 1);
  console.log(`\n--- ${name}: ${usable.length} usable (need ${nRules}) ${usable.length >= nRules ? 'ENOUGH' : 'SHORT by ' + (nRules - usable.length)}, ${tpp.toFixed(2)} tok/pair intrinsic`);
  if (!usable.length) continue;

  // remap frequency-ordered onto the pool
  const k = Math.min(nRules, usable.length);
  const map = new Map<string, string>();
  for (let i = 0; i < k; i++) map.set(ranked[i], usable[i]);
  const T = chars.map((c) => map.get(c) ?? c).join('');
  const tk = encode(T).length;
  const covered = ranked.slice(0, k).reduce((s, c) => s + (ruleFreq.get(c) ?? 0), 0);
  console.log(`    remapped ${k}/${nRules} rules covering ${covered}/${ruleChars} occurrences`);
  console.log(`    tokens: ${base} -> ${tk}   DELTA ${base - tk}  (${(100 * (base - tk) / base).toFixed(1)}% of payload)`);
  // sanity: the remap must be injective and must not collide with literals
  const vals = [...map.values()];
  const injective = new Set(vals).size === vals.length;
  const noCollide = vals.every((v) => !literalSet.has(v));
  console.log(`    injective=${injective} noLiteralCollision=${noCollide}`);
}

// Upper bound if EVERY rule-letter occurrence merged perfectly in pairs
console.log(`\ntheoretical ceiling: ${ruleChars} rule chars at 2/token = ${Math.ceil(ruleChars / 2)} vs current ${encode(chars.filter(isRule).join('')).length}`);
