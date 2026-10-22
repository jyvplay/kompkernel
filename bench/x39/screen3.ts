// X39 screen 3: the delimiter-demotion mechanism is only lossless if the
// decoder can tell a substituted delimiter from a real one.  Two safe shapes:
//
//   (a) ABSENT TARGET  -- map the delimiter c to a character t that does not
//       occur anywhere in the document.  "every t is a c" is unambiguous.
//   (b) SWAP           -- exchange c with a character s.  A bijection, so
//       "swap c and s throughout" is unambiguous regardless of counts.
//
// This screen asks the empirical question that decides whether either can pay:
// WHICH target characters does o200k_base actually merge forward cheaply?
// Tension to resolve: a character absent from the document is, by the same
// rarity argument, likely to be one BPE never learned merges for.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);
const tok = (s: string) => encode(s).length;

// Printable ASCII, plus a few Unicode look-alikes worth pricing.
const TARGETS: string[] = [];
for (let i = 0x20; i < 0x7f; i++) TARGETS.push(String.fromCharCode(i));
for (const u of ['·', '•', '│', '─', '·', '∶', '⋮', ' ', ' ', '\t']) TARGETS.push(u);

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const base = tok(text);
  const name = path.split('/').pop()!;

  // Candidate delimiters: chars that are frequent and non-alphanumeric.
  const freq = new Map<string, number>();
  for (const ch of text) {
    if (/[0-9A-Za-z]/.test(ch)) continue;
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  const cands = [...freq.entries()]
    .filter(([, n]) => n >= 40)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [c, n] of cands) {
    const present = new Set(text);
    const scored: Array<[string, number]> = [];
    for (const t of TARGETS) {
      if (t === c) continue;
      scored.push([t, tok(text.split(c).join(t)) - base]);
    }
    scored.sort((a, b) => a[1] - b[1]);
    // best target that is ABSENT from the document (safe shape (a))
    const safeAbsent = scored.find(([t]) => !present.has(t));
    const best = scored[0];
    const fmt = (x: [string, number] | undefined) =>
      x ? `"${x[0] === ' ' ? '_' : x[0]}"${x[1] >= 0 ? '+' : ''}${x[1]}` : 'none';
    const ch = c === '\t' ? '\\t' : c === '\n' ? '\\n' : c;
    console.log(
      `${name.padEnd(26)} c="${ch}" x${String(n).padStart(4)}  ` +
      `best=${fmt(best)}  bestAbsent=${fmt(safeAbsent)}`,
    );
  }
}
