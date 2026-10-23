/**
 * X42 screen 7 — is ceil(W/3) really the floor?
 * The \p{N}{1,3} pretokenizer caps a digit CHUNK at three, but the BPE
 * vocabulary still contains multi-digit merges (years, round numbers). If a
 * 4-digit or longer string is one token, then a run can beat ceil(W/3), and
 * choosing the alignment or the surface form of a number becomes a real lever.
 * This counts how many strings of each length are a single token, and how many
 * are cheaper than the floor.
 */
import { encode } from 'gpt-tokenizer';

for (const w of [1, 2, 3, 4, 5, 6]) {
  const n = 10 ** w;
  let one = 0, better = 0, worse = 0;
  const examples: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = String(i).padStart(w, '0');
    const c = encode(s).length;
    const fl = Math.ceil(w / 3);
    if (c === 1) { one++; if (examples.length < 12) examples.push(s); }
    if (c < fl) better++;
    if (c > fl) worse++;
  }
  console.log(`len=${w}  n=${n}  1-token=${String(one).padStart(5)} (${(100 * one / n).toFixed(2)}%)  belowfloor=${better}  abovefloor=${worse}  e.g. ${examples.join(' ')}`);
}

console.log('\n--- are long runs ever below the floor at some alignment? ---');
// take a real 9-digit price and try inserting a separator at every position
for (const s of ['774453947', '17240000', '20140102', '1009479319']) {
  const bare = encode(s).length;
  let best = bare, bestPos = -1, bestSep = '';
  for (const sep of ['.', ',', '-', ' ', '']) {
    for (let p = 1; p < s.length; p++) {
      const c = encode(s.slice(0, p) + sep + s.slice(p)).length;
      if (c < best) { best = c; bestPos = p; bestSep = sep; }
    }
  }
  console.log(`  ${s}  bare=${bare}  best=${best} at pos ${bestPos} sep '${bestSep}'  ${best < bare ? 'BEATS BARE' : ''}`);
}

console.log('\n--- common 4-digit years and round numbers ---');
for (const s of ['1990', '2014', '2024', '2026', '1000', '2000', '0000', '1024', '4096', '8080']) {
  console.log(`  ${s} -> ${encode(s).length} token(s)`);
}
