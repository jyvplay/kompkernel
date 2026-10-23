// X41 screen 2 — template detection, corrected for DECODABILITY.
//
// Two defects in screen 1, both matters of whether a bare reader can actually
// undo the transform:
//
//  1. The run regex refused to end at a letter, so "2026-09-30T07:59:52..." was
//     truncated to "2026-09" and the real template was never seen.
//  2. Treating ',' as a separator merged an entire CSV row into ONE template:
//     "1990-01-02,17.240000,17.240000,17.240000,17.240000" -> a 40-digit blob.
//     A 40-digit positional restore is exactly the kind of counting an LLM
//     gets wrong, so it is excluded on principle, not on measurement.
//
// The governing constraint is that the reader must re-insert separators by
// POSITION in a short string. So: no ',' (keeps CSV fields separate), and a
// hard cap on template width.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const tok = (s: string) => encode(s).length;
const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

const SEPS = new Set(['.', ':', '-', ';']);
const MAXDIG = 14;                       // reader must count this far, at most
const RUN = /(?<![\p{N}._])\p{N}+(?:[.:;\-]\p{N}+)+(?![\p{N}._])/gu;

function shapeOf(s: string): string {
  let out = '', n = 0;
  for (const ch of s) {
    if (/\p{N}/u.test(ch)) n++;
    else { if (n) { out += String(n); n = 0; } out += ch; }
  }
  if (n) out += String(n);
  return out;
}
const strip = (s: string) => [...s].filter((c) => !SEPS.has(c)).join('');

for (const p of lanes) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const groups = new Map<string, { n: number; ws: number; ns: number; sample: string }>();
  for (const m of t.matchAll(RUN)) {
    const s = m[0];
    const sh = shapeOf(s);
    const digits = [...s].filter((c) => /\p{N}/u.test(c)).length;
    if (digits > MAXDIG) continue;            // unreadable by position
    if (digits < 3) continue;
    const st = strip(s);
    let g = groups.get(sh);
    if (!g) { g = { n: 0, ws: 0, ns: 0, sample: s }; groups.set(sh, g); }
    g.n++; g.ws += tok(s); g.ns += tok(st);
  }
  if (!groups.size) { console.log(nm.padEnd(24) + ' (none)'); continue; }
  const rows = [...groups.entries()].sort((a, b) =>
    (b[1].ws - b[1].ns) - (a[1].ws - a[1].ns));
  const total = rows.reduce((s, [, g]) => s + (g.ws - g.ns), 0);
  console.log(`\n${nm}   rawTok=${tok(t)}   totalRawSaving=${total}`);
  for (const [sh, g] of rows.slice(0, 8)) {
    const save = g.ws - g.ns;
    const dig = g.sample.replace(/[^\p{N}]/gu, '').length;
    console.log(`   ${sh.padEnd(12)} n=${String(g.n).padStart(4)} dig=${String(dig).padStart(2)}  ` +
      `${String(g.ws).padStart(5)} -> ${String(g.ns).padStart(5)}  save=${String(save).padStart(5)}` +
      `${save >= 20 ? '  <-- ' : '      '} e.g. ${g.sample} -> ${strip(g.sample)}`);
  }
}
