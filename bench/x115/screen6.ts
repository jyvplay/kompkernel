/** X115/X116 screen 6: length-entailment. A numeric cell is exactly the UTF-8
 * byte length of another cell (or the target after " -> "). This is a
 * recomputable measure, not a repeated substring. Raw screen only. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const MARKS = ['ℓ', '◇', '※', '⌀', '∅'];
const bytes = (s: string) => Buffer.byteLength(s, 'utf8');
function cells(line: string) { return [...line.matchAll(/\S+/g)].map(m => ({ s: m[0], at: m.index ?? 0 })); }
function replaceCell(line: string, at: number, old: string, neu: string) { return line.slice(0, at) + neu + line.slice(at + old.length); }

const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const cs = lines.map(cells);
  let best: any = null;
  // candidate relations: (numeric column i, source column j, transform whole|arrow-target)
  const arities = new Map<number, number[]>();
  cs.forEach((c, i) => { if (c.length >= 4) { if (!arities.has(c.length)) arities.set(c.length, []); arities.get(c.length)!.push(i); } });
  for (const [n, idx] of arities) {
    if (idx.length < 4) continue;
    for (let i = 0; i < n; i++) {
      if (!idx.every(li => /^\d+$/.test(cs[li]![i]!.s))) continue;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        for (const mode of ['whole', 'arrow'] as const) {
          let hits = 0;
          for (const li of idx) {
            const row = cs[li]!;
            const src = mode === 'whole' ? row[j]!.s : (() => { const k = row.findIndex(c => c.s === '->'); return k >= 0 && k + 1 < row.length ? row.slice(k + 1).map(c => c.s).join(' ') : null; })();
            if (src === null) continue;
            if (Number(row[i]!.s) === bytes(src)) hits++;
          }
          if (hits >= 4 && hits / idx.length >= 0.8) {
            for (const mark of MARKS) {
              if (text.includes(mark)) continue;
              const out = lines.map((line, li) => {
                if (!idx.includes(li)) return line;
                const row = cs[li]!;
                const src = mode === 'whole' ? row[j]!.s : (() => { const k = row.findIndex(c => c.s === '->'); return k >= 0 && k + 1 < row.length ? row.slice(k + 1).map(c => c.s).join(' ') : null; })();
                if (src === null || Number(row[i]!.s) !== bytes(src)) return line;
                return replaceCell(line, row[i]!.at, row[i]!.s, mark);
              });
              const contract = mode === 'whole'
                ? `${mark} in ${n}-cell lines: cell ${i + 1}=UTF8 bytes of cell ${j + 1}.`
                : `${mark} in ${n}-cell lines: cell ${i + 1}=UTF8 bytes after ->.`;
              const wire = contract + '\n' + out.join('\n') + (final ? '\n' : '');
              const tok = T(wire);
              if (!best || tok < best.tokens) best = { tokens: tok, delta: tok - T(text), hits, n, i, j, mode, mark, contract, exact: true };
            }
          }
        }
      }
    }
  }
  rows.push({ path: p, raw: T(text), best });
  console.log(`${p.split('/').pop()!.padEnd(22)} raw=${T(text)} best=${best ? `${best.tokens} (${best.delta}) hits=${best.hits} c${best.i + 1}=len(${best.mode === 'whole' ? 'c' + (best.j + 1) : 'arrow'}) mark=${best.mark}` : 'none'}`);
}
const base = rows.reduce((a, r) => a + r.raw, 0);
const after = rows.reduce((a, r) => a + (r.best ? r.best.tokens : r.raw), 0);
console.log(`TOTAL raw ${base} best ${after} delta ${after - base}`);
fs.mkdirSync('bench/x115/receipts', { recursive: true });
fs.writeFileSync('bench/x115/receipts/screen6.json', JSON.stringify({ schema: 'kompkernel-x115-screen6-v1', note: 'length-entailment raw screen; no parent gate', totals: { base, after, delta: after - base }, rows }, null, 2) + '\n');
