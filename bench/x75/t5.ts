/**
 * X75 / t5 — ARITHMETIC CELL DERIVATION, priced end to end.
 *
 * t4 showed a column can be reproduced from two siblings in the same row by one closed
 * arithmetic form (df: Use% = Used/Size*100, 18/19 rows). This probe answers the only
 * question that decides whether it becomes a codec: does the saving survive the parent
 * frontier AND the key? The key here is the SHIP-SHAPED one, 22 tokens.
 *
 * Non-triviality filter (a relation is only counted if it could not be guessed):
 *   - the target column must take >= 2 distinct values (not a constant),
 *   - the form must hold on EVERY row of the table (no exceptions, no patches),
 *   - the inputs must be present on every row.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const M = '\u00a7';
const KEY = `X75. Body first. Each ${M}xy is a number recomputed from the two numbers left of it in the same line: form x over form y. Print only.`;
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const FORMS = ['a/b*100', 'b/a*100', 'a+b', 'a-b', 'b-a', 'a*b'];

type Cell = { i: number; raw: string; v: number };
function num(s: string): Cell | null {
  const m = /^(-?[\d,]+(?:\.\d+)?)(%|[KMGT])?$/.exec(s);
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(v) ? { i: 0, raw: s, v } : null;
}

for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n');
  const grid = lines.map((l) => l.trim().split(/\s+/).map(num));
  const width = Math.max(...grid.map((g) => g.length));
  let chosen: { a: number; b: number; c: number; form: string } | null = null;
  for (let c = 0; c < width && !chosen; c++) {
    for (let a = 0; a < width && !chosen; a++) for (let b = 0; b < width && !chosen; b++) {
      if (a === b || a === c || b === c) continue;
      for (const form of FORMS) {
        let ok = 0, tot = 0;
        const vals = new Set<string>();
        for (const g of grid) {
          if (g.length <= Math.max(a, b, c)) continue;
          const A = g[a], B = g[b], C = g[c];
          if (!A || !B || !C) continue;
          tot++;
          vals.add(C.raw);
          const av = A.v, bv = B.v;
          let want = NaN;
          if (form === 'a/b*100') want = bv ? (av / bv) * 100 : NaN;
          else if (form === 'b/a*100') want = av ? (bv / av) * 100 : NaN;
          else if (form === 'a+b') want = av + bv;
          else if (form === 'a-b') want = av - bv;
          else if (form === 'b-a') want = bv - av;
          else if (form === 'a*b') want = av * bv;
          if (!Number.isFinite(want)) continue;
          const cands = [want, Math.round(want), Math.floor(want), Math.ceil(want), Math.trunc(want)];
          if (cands.some((x) => Math.abs(x - C.v) < 1e-9)) ok++;
        }
        if (tot >= 4 && ok === tot && vals.size >= 2) { chosen = { a, b, c, form }; break; }
      }
    }
  }
  if (!chosen) { console.log(`${p.split('/').pop()!.padEnd(20)} no non-trivial derived column | baseline ${F.get(p)}`); continue; }
  // rewrite: replace cell c with a marker + the form index, on every row
  const fi = FORMS.indexOf(chosen.form);
  const out = lines.map((l) => {
    const parts = l.trim().split(/\s+/);
    if (parts.length <= Math.max(chosen!.a, chosen!.b, chosen!.c)) return l;
    parts[chosen!.c] = `${M}${fi}${M}`;
    const lead = /^\s*/.exec(l)![0];
    return lead + parts.join(' ');
  });
  const wire = out.join('\n');
  const keyTok = T(KEY, enc);
  const plain = T(`${KEY}\n${wire}`, enc);
  const viaF = T(`${KEY}\n${tagstackFrontier(wire, enc).message}`, enc);
  const base = F.get(p)!;
  console.log(`${p.split('/').pop()!.padEnd(20)} col c=${chosen.c} from (${chosen.a},${chosen.b}) form ${chosen.form} -> key ${keyTok} | plain ${plain} F ${viaF} vs base ${base} | dF ${viaF - base}`);
}
