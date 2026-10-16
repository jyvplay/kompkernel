// X19: are adjacent glyph references in the wire merged into single o200k tokens?
// If two rule references sit next to each other and (g1 g2) is one vocab token, the
// pair costs 1 token instead of 2. This measures how often that already happens and
// how much is left on the table.
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lines = fs.readFileSync('node_modules/gpt-tokenizer/data/o200k_base.tiktoken', 'utf8').trim().split('\n');
const VOCAB = new Set();
const SINGLE = new Set();
for (const l of lines) { const p = l.split(' '); if (p.length < 2) continue; const s = Buffer.from(p[0], 'base64').toString('utf8'); VOCAB.add(s); if ([...s].length === 1) SINGLE.add(s); }
const T = s => encode(s).length;

// all two-character vocab tokens
const PAIRS = new Set();
for (const s of VOCAB) if ([...s].length === 2) PAIRS.add(s);
// pairs whose two chars are themselves single tokens
const PAIRS_SS = new Set();
for (const p of PAIRS) { const [a, b] = [...p]; if (SINGLE.has(a) && SINGLE.has(b)) PAIRS_SS.add(p); }
console.log('vocab', VOCAB.size, 'single-char tokens', SINGLE.size, '2-char tokens', PAIRS.size, '2-char with both halves single-token', PAIRS_SS.size);

// build a directed pair graph over single-token chars: a -> {b}
const out = new Map();
for (const p of PAIRS_SS) { const [a, b] = [...p]; (out.get(a) ?? out.set(a, new Set()).get(a)).add(b); }
const indeg = new Map();
for (const p of PAIRS_SS) { const [a, b] = [...p]; indeg.set(b, (indeg.get(b) ?? 0) + 1); }
const outdeg = [...out.entries()].map(([a, s]) => [a, s.size]).sort((x, y) => y[1] - x[1]);
console.log('chars with most outgoing pair-tokens:', outdeg.slice(0, 25).map(([a, n]) => `${a}(${a.codePointAt(0).toString(16)}):${n}`).join(' '));
console.log('total pair edges', PAIRS_SS.size);

const dir = 'bench/x16/lakonikos-d';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.wire.txt')).sort();
let totPairs = 0, totMerged = 0, totWire = 0;
for (const f of files) {
  const t = fs.readFileSync(`${dir}/${f}`, 'utf8');
  totWire += T(t);
  const ch = [...t];
  let pairs = 0, merged = 0;
  for (let i = 0; i + 1 < ch.length; i++) {
    const a = ch[i], b = ch[i + 1];
    if (a.codePointAt(0) < 128 || b.codePointAt(0) < 128) continue;
    if (!SINGLE.has(a) || !SINGLE.has(b)) continue;
    pairs++;
    if (PAIRS_SS.has(a + b)) merged++;
  }
  totPairs += pairs; totMerged += merged;
  console.log(`${f.padEnd(46)} wireTok=${String(T(t)).padStart(5)} nonascii-adj-pairs=${String(pairs).padStart(5)} alreadyOneToken=${String(merged).padStart(5)} (${pairs ? (100 * merged / pairs).toFixed(1) : '0'}%)`);
}
console.log(`TOTAL wire ${totWire}  adjacent single-token non-ASCII pairs ${totPairs}  already merged ${totMerged} (${(100 * totMerged / totPairs).toFixed(1)}%)  unmerged ${totPairs - totMerged}`);
