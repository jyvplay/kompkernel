// What is the prose residual made of?
// For each lane, measure the body (rule-set) region only:
//   - distinct words, total words
//   - how many word TOKENS are accounted for by the top-N most frequent words
//   - repeat spectrum: how many words occur exactly 1x, 2x, 3-5x, 6+
//   - how many words are hapax AND long (the true irreducible mass)
// No encoding -- pure counting, runs in well under a second per lane.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { tokenStrings } from '@/lib/omega/bpe';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const r = oikonomiaEncode(text);

  // Rebuild the body: expand the rule set against the substitution scaffold,
  // exactly the way the reference decoder does.
  const nl = r.wire.indexOf('\n\n');
  const body = (nl < 0 ? '' : r.wire.slice(nl + 2)).trim();

  const words = body.split(/[ \n]+/).filter(Boolean);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const wordsSorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  const total = words.length;
  const distinct = freq.size;

  // Token cost of the body, vs the cost if every distinct word were emitted once.
  const bodyTokens = encode(body).length;
  const distinctTokens = encode([...freq.keys()].join(' ')).length;

  // Repeat spectrum.
  let hapax = 0, twice = 0, few = 0, many = 0;
  let hapaxLong = 0, hapaxLongTokens = 0;
  for (const [w, c] of freq) {
    if (c === 1) {
      hapax++;
      if (w.length >= 6) { hapaxLong++; hapaxLongTokens += encode(w).length; }
    } else if (c === 2) twice++;
    else if (c <= 5) few++;
    else many++;
  }

  // Coverage: share of body word-slots filled by the top 32 words.
  const top32 = wordsSorted.slice(0, 32).reduce((a, [, c]) => a + c, 0);

  // Are hapax words mostly *near*-duplicates of a frequent word (edit distance 1)?
  const frequent = new Set(wordsSorted.filter(([, c]) => c >= 3).map(([w]) => w));
  let nearDup = 0;
  for (const [w, c] of freq) {
    if (c !== 1 || w.length < 4 || w.length > 16) continue;
    let hit = false;
    for (const f of frequent) {
      if (Math.abs(f.length - w.length) > 1) continue;
      // one substitution / insertion / deletion
      if (f.length === w.length) {
        let d = 0;
        for (let i = 0; i < w.length; i++) if (f[i] !== w[i]) d++;
        if (d === 1) { hit = true; break; }
      } else if (f.length === w.length + 1 || f.length === w.length - 1) {
        const [lo, hi] = f.length < w.length ? [f, w] : [w, f];
        let i = 0, j = 0, d = 0;
        while (i < lo.length && j < hi.length) {
          if (lo[i] === hi[j]) { i++; j++; } else { d++; j++; if (d > 1) break; }
        }
        if (d <= 1) { hit = true; break; }
      }
    }
    if (hit) nearDup++;
  }

  console.log(
    `${path.split('/').pop()!.padEnd(26)} msg=${String(r.messageTokens).padStart(5)} ` +
    `body=${String(bodyTokens).padStart(5)} ` +
    `words=${String(total).padStart(5)} distinct=${String(distinct).padStart(5)} ` +
    `(${((distinct / total) * 100).toFixed(0)}%) ` +
    `distinctTok=${String(distinctTokens).padStart(5)} ` +
    `top32=${((top32 / total) * 100).toFixed(0)}% ` +
    `hapax=${hapax} (long>=6ch: ${hapaxLong}) x2=${twice} 3-5=${few} 6+=${many} ` +
    `nearDup=${nearDup}`,
  );
  void tokenStrings;
}
