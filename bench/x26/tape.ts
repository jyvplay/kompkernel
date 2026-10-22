/**
 * X26: is the TAPE order free money?
 *
 * The tape is a concatenation of (glyph, raw) pairs. BPE never crosses a chunk,
 * so the tape's cost is a function of the ADJACENCIES between consecutive
 * entries -- and entry order is a free choice up to the dependency partial
 * order (a raw may reference only glyphs defined EARLIER).
 *
 * This is an optimization nobody in the stack has touched: chiron.ts sorts the
 * tape topologically, which fixes the dependencies but leaves every
 * dependency-compatible permutation on the table.
 *
 * Measured here: (a) the spread over random dependency-respecting permutations,
 * (b) what hill-climbing reaches inside a budget.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironParseTape } from '@/lib/omega/chiron';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const SCRIPTS: Array<[string, [number, number][]]> = [
  ['hangul', [[0xAC00, 0xD7A4]]], ['katakana', [[0x30A0, 0x3100]]],
  ['cyrillic', [[0x0400, 0x0500]]], ['arabic', [[0x0600, 0x0700]]],
  ['myanmar', [[0x1000, 0x10A0]]], ['khmer', [[0x1780, 0x1800]]],
  ['cjk', [[0x4E00, 0xA000]]],
  ['polyglot', [[0x0370, 0x0400], [0x0530, 0x0590], [0x0590, 0x0600], [0x0900, 0x0980],
    [0x0980, 0x0A00], [0x0A00, 0x0A80], [0x0A80, 0x0B00], [0x0B80, 0x0C00],
    [0x0C00, 0x0C80], [0x0C80, 0x0D00], [0x0D00, 0x0D80], [0x0D80, 0x0E00],
    [0x0E00, 0x0E80], [0x10A0, 0x1100]]],
];
const scriptOf = (cp: number) => { for (const [n, rs] of SCRIPTS) for (const [a, b] of rs) if (cp >= a && cp < b) return n; return null; };

function parseTape(tape: string) {
  const out: Array<[string, string]> = [];
  const used = new Set<string>();
  let i = 0;
  const sc = scriptOf(tape.charCodeAt(0));
  if (!sc) return out;
  const rs = SCRIPTS.find(([n]) => n === sc)![1];
  const inS = (c: string) => rs.some(([a, b]) => c.codePointAt(0)! >= a && c.codePointAt(0)! < b);
  while (i < tape.length) {
    const g = tape[i];
    used.add(g);
    let j = i + 1;
    while (j < tape.length && !(inS(tape[j]) && !used.has(tape[j]))) j++;
    out.push([g, tape.slice(i + 1, j)]);
    i = j;
  }
  return out;
}

for (const f of (process.env.F || 'bench/holdout-work/kb-article.txt').split(',')) {
  const t = fs.readFileSync(f, 'utf8');
  const r: any = polytroposEncode(t, enc);
  const wire = String(r.wire);
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  const rules = parseTape(tape);
  if (rules.length < 3) { console.log(f, 'too few rules'); continue; }
  const base = T(tape);

  // dependency: rule k may reference glyphs of rules j<k only (in the ORIGINAL order)
  const glyphIndex = new Map<string, number>();
  rules.forEach(([g], k) => glyphIndex.set(g, k));
  const deps = rules.map(([g, raw]) => {
    const s = new Set<number>();
    for (const ch of raw) { const j = glyphIndex.get(ch); if (j !== undefined) s.add(j); }
    return s;
  });

  const render = (perm: number[]) => perm.map((k) => rules[k][0] + rules[k][1]).join('');
  const valid = (perm: number[]) => {
    const seen = new Set<number>();
    for (const k of perm) { for (const d of deps[k]) if (!seen.has(d)) return false; seen.add(k); }
    return true;
  };

  let rnd = 4242; const rf = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let best = base, worst = base, sum = 0, n = 0;
  const N = +(process.env.N || '400');
  for (let s = 0; s < N; s++) {
    const perm = rules.map((_, k) => k);
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rf() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    if (!valid(perm)) continue;
    const v = T(render(perm)); n++;
    sum += v; if (v < best) best = v; if (v > worst) worst = v;
  }
  console.log(f.split('/').pop()!.padEnd(40), 'rules', String(rules.length).padStart(3),
    '| tape base', String(base).padStart(4),
    '| rand(n=' + n + ') mean', (sum / Math.max(n, 1)).toFixed(0).padStart(4),
    'min', String(best).padStart(4), 'max', String(worst).padStart(4),
    '| spread', String(worst - best).padStart(3),
    '| best-vs-base', String(base - best).padStart(3));
}
