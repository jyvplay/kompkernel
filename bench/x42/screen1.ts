// X42 screen 1 — CONSTANT DIGIT AFFIXES inside numeric templates.
//
// SYSTOLE (X41) showed that a separator can be deleted because its position is
// implied by the shape of the number. The same argument applies to the DIGITS
// themselves: if every occurrence of a template carries the same digit at the
// same position, that digit carries no information and can be deleted and
// stated once.
//
//   vix prices    17240000 18190000 19220000 ...   -> trailing "0000" constant
//   aapl dates    20140102 20140103 20140106 ...   -> leading  "2014" constant
//
// Only a constant PREFIX and a constant SUFFIX are considered, and only when
// they hold for 100 % of occurrences. Both restrictions exist for the reader:
// "prepend 2014" and "append 0000" are single, local, checkable operations,
// whereas deleting an interior position would force the reader to interleave
// two digit strings, which is precisely the counting task that
// arXiv 2605.02028 shows models fail at.
//
// This is deliberately measured BEFORE being believed, because a very similar
// idea ("fixed-precision trailing zeros") is already recorded as dead in this
// repository -- dead, it turns out, without the template framing.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';
import { systoleRuns, systoleShapeOf, systoleDigits } from '@/lib/omega/systole';

const tok = (s: string) => encode(s).length;
const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

const SEPSET = new Set(['.', ':', ';', '-']);
const strip = (s: string) => [...s].filter((c) => !SEPSET.has(c)).join('');

function lcp(a: string[], n: number): string {
  if (!n) return '';
  let p = a[0];
  for (let i = 1; i < n; i++) {
    let j = 0; while (j < p.length && j < a[i].length && p[j] === a[i][j]) j++;
    p = p.slice(0, j); if (!p) break;
  }
  return p;
}
function lcs(a: string[], n: number): string {
  if (!n) return '';
  let s = a[0];
  for (let i = 1; i < n; i++) {
    let j = 0;
    while (j < s.length && j < a[i].length && s[s.length - 1 - j] === a[i][a[i].length - 1 - j]) j++;
    s = s.slice(s.length - j); if (!s) break;
  }
  return s;
}

for (const p of lanes) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const groups = new Map<string, string[]>();
  for (const r of systoleRuns(t)) {
    const sh = systoleShapeOf(r.s);
    if (systoleDigits(sh) < 4) continue;
    (groups.get(sh) ?? groups.set(sh, []).get(sh)!).push(strip(r.s));
  }
  let best = 0, tot = 0;
  const rows: string[] = [];
  for (const [sh, vals] of groups) {
    if (vals.length < 3) continue;
    const P = lcp(vals, vals.length), S = lcs(vals, vals.length);
    // cannot delete everything; keep at least one digit
    const cut = Math.min(P.length, vals[0].length - 1);
    const pre = P.slice(0, cut);
    const suf = pre.length + S.length < vals[0].length ? S : '';
    if (!pre.length && !suf.length) continue;
    let ws = 0, ns = 0;
    for (const v of vals) {
      ws += tok(v);
      ns += tok(v.slice(pre.length, v.length - suf.length));
    }
    const save = ws - ns;
    tot += save; if (save > best) best = save;
    rows.push(`   ${sh.padEnd(10)} n=${String(vals.length).padStart(4)} ` +
      `pre=${JSON.stringify(pre).padEnd(8)} suf=${JSON.stringify(suf).padEnd(8)} ` +
      `${String(ws).padStart(5)} -> ${String(ns).padStart(5)}  save=${String(save).padStart(5)}  e.g. ${vals[0]}`);
  }
  if (!rows.length) { console.log(nm.padEnd(25) + ' (none)'); continue; }
  rows.sort((a, b) => Number(b.match(/save=\s*(-?\d+)/)![1]) - Number(a.match(/save=\s*(-?\d+)/)![1]));
  console.log(`\n${nm}   totalSave=${tot}`);
  for (const r of rows.slice(0, 5)) console.log(r);
}
