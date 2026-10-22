// X39 screen 4: character-pair SWAP search.
//
// A swap of two characters is a bijection on the character set, so it is
// invertible under one instruction ("A and B have been exchanged; exchange
// them back") with NO absence requirement -- unlike substitution to an absent
// target, which screen 3 showed loses because BPE has no merges for rare
// characters.
//
// Why this can beat the dictionary: the dictionary amortises a glossary entry
// over many occurrences, so it cannot touch a string that occurs once. A swap
// reprices every occurrence for free, including hapax ones. X38 section N
// measured that the prose residual is 74-88% hapax -- precisely the mass the
// dictionary cannot reach, and the mass this mechanism does reach.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);
const tok = (s: string) => encode(s).length;
const K = 14;

const show = (c: string) => (c === ' ' ? '_' : c === '\t' ? '\\t' : c === '\n' ? '\\n' : c);

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const base = tok(text);
  const name = path.split('/').pop()!;

  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const pool = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, K).map(([c]) => c);

  const results: Array<[string, string, number]> = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i], b = pool[j];
      // three-way swap via placeholders that cannot occur in the text
      const ph1 = '\u0001', ph2 = '\u0002';
      const t = text.split(a).join(ph1).split(b).join(ph2).split(ph1).join(b).split(ph2).join(a);
      results.push([a, b, tok(t) - base]);
    }
  }
  results.sort((x, y) => x[2] - y[2]);
  const top = results.slice(0, 3)
    .map(([a, b, d]) => `${show(a)}<->${show(b)}:${d >= 0 ? '+' : ''}${d}`)
    .join('  ');
  console.log(`${name.padEnd(26)} raw=${String(base).padStart(5)}  ${top}`);
}
