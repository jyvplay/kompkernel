/** X74 prototype: STOICHEION — recompute each column in its OWN alphabet.
 *  Stage 1: use stadionFold to get a byte-exact fixed-width cut (TSV normal form).
 *  Stage 2: per column, choose the cheapest of {const, dict+index, literal, AP}.
 *  Stage 3: emit one line per column and measure the COMPLETE message.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { stadionFold } from '../../src/lib/omega/stadion';
const enc: any = 'o200k_base';
const IDX = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SEP = '\u2021';   // ‡
const END = '\u00a4';   // ¤

function esc(s: string): string { return s.split(SEP).join(SEP+SEP).split(END).join(END+END); }

function encColumn(vals: string[]): { text: string; kind: string; cost: number } {
  const R = vals.length;
  const uniq = [...new Set(vals)];
  const cands: { text: string; kind: string }[] = [];
  // literal, row order
  cands.push({ kind: 'L', text: 'L' + vals.map(esc).join(SEP) });
  // const
  if (uniq.length === 1) cands.push({ kind: 'C', text: 'C' + esc(vals[0]) });
  // dictionary + index string (1 char per row when |uniq| <= 62, else 2 chars)
  if (uniq.length <= IDX.length) {
    const idx = vals.map(v => IDX[uniq.indexOf(v)]).join('');
    cands.push({ kind: 'D', text: 'D' + uniq.map(esc).join(SEP) + END + idx });
  }
  // dictionary + RLE index
  if (uniq.length <= IDX.length) {
    const raw = vals.map(v => IDX[uniq.indexOf(v)]);
    let rle = ''; let i = 0;
    while (i < raw.length) { let j = i; while (j < raw.length && raw[j] === raw[i]) j++; rle += raw[i] + String(j - i) + '.'; i = j; }
    cands.push({ kind: 'R', text: 'R' + uniq.map(esc).join(SEP) + END + rle });
    void R;
  }
  let best = cands[0], bestCost = T(best.text, enc);
  for (const c of cands.slice(1)) { const t = T(c.text, enc); if (t < bestCost) { best = c; bestCost = t; } }
  return { text: best.text, kind: best.kind, cost: bestCost };
}

const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = T(t, enc);
  const fold = stadionFold(t);
  if (!fold) { console.log(`${p.split('/').pop()!.padEnd(24)} NO FOLD  raw ${raw}`); continue; }
  const lines = fold.normal.split('\n');
  const rows = lines.map(l => l.split('\t'));
  const C = rows[0].length;
  if (!rows.every(r => r.length === C)) { console.log(`${p.split('/').pop()!.padEnd(24)} ragged`); continue; }
  const cols: string[][] = Array.from({ length: C }, (_, c) => rows.map(r => r[c]));
  const encs = cols.map(encColumn);
  const header = `S${C}.${rows.length} w=${fold.widths.map(w=>w).join(',')}`;
  const msg = header + '\n' + encs.map(e => e.text).join('\n');
  const mt = T(msg, enc);
  const f = F.get(p);
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(4)} frontier ${String(f).padStart(4)} | STOICH ${String(mt).padStart(4)} delta ${f?String(mt-f).padStart(5):'  ?'} | ${encs.map(e=>e.kind).join('')} widths ${fold.widths.length}`);
}
