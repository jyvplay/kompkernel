// X39 screen 5: swap search restricted to a STRUCTURE-PRESERVING pool.
//
// Screen 4's biggest wins swapped with newline or with digits. Those are
// bijections and therefore lossless, but they destroy line structure and make
// the tape unreadable, which (a) breaks every downstream structural codec and
// (b) violates the one-chat-decodable constraint in spirit: the reader can no
// longer use its language prior to help it place the glossary glyphs.
//
// This screen restricts the pool to punctuation, symbols, space and tab --
// characters whose exchange leaves every word and every line break intact.
// Both invertible shapes are priced:
//   SWAP  c1 <-> c2            "A and B have been exchanged"
//   SUBST c1 -> t, t absent    "every t is a c"
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);
const tok = (s: string) => encode(s).length;

const POOL = (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']).filter((c) => c !== '\n');
const show = (c: string) => (c === ' ' ? '␠' : c === '\t' ? '\\t' : c);

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const base = tok(text);
  const name = path.split('/').pop()!;
  const present = new Set(text);

  const swaps: Array<[string, string, number]> = [];
  for (let i = 0; i < POOL.length; i++) {
    for (let j = i + 1; j < POOL.length; j++) {
      const a = POOL[i], b = POOL[j];
      if (!present.has(a) && !present.has(b)) continue;
      const ph1 = '\u0001', ph2 = '\u0002';
      const t = text.split(a).join(ph1).split(b).join(ph2).split(ph1).join(b).split(ph2).join(a);
      swaps.push([a, b, tok(t) - base]);
    }
  }
  swaps.sort((x, y) => x[2] - y[2]);

  // substitution to an absent target
  const subs: Array<[string, string, number]> = [];
  for (const c of POOL) {
    const n = text.split(c).length - 1;
    if (n < 20) continue;
    for (const t of POOL) {
      if (t === c || present.has(t)) continue;
      subs.push([c, t, tok(text.split(c).join(t)) - base]);
    }
  }
  subs.sort((x, y) => x[2] - y[2]);

  const fmt = (r: Array<[string, string, number]>) =>
    r.length === 0 ? 'none'
      : r.slice(0, 2).map(([a, b, d]) => `${show(a)}${r === subs ? '>' : '<->'}${show(b)}:${d >= 0 ? '+' : ''}${d}`).join(' ');

  console.log(`${name.padEnd(26)} raw=${String(base).padStart(5)}  swap[${fmt(swaps)}]  subst[${fmt(subs)}]`);
}
