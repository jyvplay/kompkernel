/**
 * X78 — countTokens phase costs in the regime the search actually runs in:
 * COLD. Every candidate string is counted exactly once; nothing is warmed.
 */
import * as fs from 'node:fs';
import { countTokens, countTokensExact, chunkCacheClear } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const re = /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

const texts: string[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  texts.push(t);
  for (let i = 0; i + 400 < t.length; i += 17) texts.push(t.slice(i, i + 400));
}
// dedupe: the search revisits some candidates, but most are fresh
const uniq = [...new Set(texts)];
console.log(`${uniq.length} distinct strings, ${uniq.reduce((a, s) => a + s.length, 0)} chars`);

let tMatch = 0, tCover = 0, tCount = 0, tExact = 0, chunks = 0, matched = 0;
for (const s of uniq) {
  if (s.length < 24) continue;
  const a = process.hrtime.bigint();
  re.lastIndex = 0;
  const cs = s.match(re);
  const b = process.hrtime.bigint();
  tMatch += Number(b - a);
  if (!cs) continue;
  matched++;
  let cov = 0;
  for (let i = 0; i < cs.length; i++) cov += cs[i].length;
  const c = process.hrtime.bigint();
  tCover += Number(c - b);
  chunks += cs.length;
  if (cov === s.length) { const d = process.hrtime.bigint(); countTokens(s, enc); tCount += Number(process.hrtime.bigint() - d); }
  else { const d = process.hrtime.bigint(); countTokensExact(s, enc); tExact += Number(process.hrtime.bigint() - d); }
}
const ms = (x: number) => (x / 1e6).toFixed(1);
console.log(`\nA. regex .match() (allocates ${chunks} substrings): ${ms(tMatch)} ms`);
console.log(`B. coverage check loop:                            ${ms(tCover)} ms`);
console.log(`C. countTokens (chunk path, COLD):                 ${ms(tCount)} ms`);
console.log(`D. countTokensExact (fallback):                    ${ms(tExact)} ms`);
console.log(`\nA+B = ${ms(tMatch + tCover)} ms of ${ms(tMatch + tCover + tCount + tExact)} ms total  =>  ${(((tMatch + tCover) / (tMatch + tCover + tCount + tExact)) * 100).toFixed(1)}% is regex+cover BEFORE any lookup`);
console.log(`chunks ${chunks} over ${matched} strings = ${(chunks / matched).toFixed(1)} chunks/string`);
