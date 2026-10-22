// X41 screen 1 — POSITIONAL SEPARATOR ELISION (template detection)
//
// The diagnostic showed that on vix and aapl, 37-38 % of raw tokens live in
// digit runs longer than 3 digits, and that BPE buys almost nothing there
// (3408 chunks -> 3412 tokens: one token per chunk).
//
// The reason is the o200k_base pre-tokeniser rule \p{N}{1,3}: a digit run is
// CUT every three digits, and BPE merges never cross a pre-token boundary. So
// "2026" is irreducibly two tokens, and every separator sitting inside a
// structured number costs a chunk of its own.
//
//   "2026-09-30T07:59:52.6403938810"   -> 17 pre-tokens
//   "20260930T0759526403938810"        -> 10 pre-tokens
//
// The separators are not merely removed, they are removed AND the digit runs
// regroup, which is where most of the saving comes from. Nothing here is lost:
// the separator positions are implied by the shape of the number, and the shape
// is stated once.
//
// This screen finds, per lane, every maximal run of [digits and separators],
// reduces it to a shape signature, and measures what deleting the separators
// would cost or save. It ships nothing; it only measures.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const tok = (s: string) => encode(s).length;
const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

// A structured numeric run: digits, with single separators between digit groups.
// Deliberately excludes sign and exponent so we never change a value.
const RUN = /(?<![\p{L}\p{N}._])\p{N}+(?:[.,:;\-]\p{N}+)+(?![\p{L}\p{N}._])/gu;

// shape: e.g. 2026-09-30T07:59:52.6403938810 -> "4-2-2T2:2:2.10"
function shapeOf(s: string): string {
  let out = '', n = 0;
  for (const ch of s) {
    if (/\p{N}/u.test(ch)) { n++; }
    else { if (n) { out += String(n); n = 0; } out += ch; }
  }
  if (n) out += String(n);
  return out;
}
const SEPS = new Set([',', '.', ':', ';', '-']);

for (const p of lanes) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const groups = new Map<string, { n: number; withSep: number; noSep: number; sample: string }>();
  let matched = 0;
  for (const m of t.matchAll(RUN)) {
    const s = m[0];
    if (s.length < 4) continue;
    matched++;
    const sh = shapeOf(s);
    const stripped = [...s].filter((c) => !SEPS.has(c)).join('');
    let g = groups.get(sh);
    if (!g) { g = { n: 0, withSep: 0, noSep: 0, sample: s }; groups.set(sh, g); }
    g.n++; g.withSep += tok(s); g.noSep += tok(stripped);
  }
  if (!groups.size) { console.log(nm.padEnd(24) + ' (no structured numeric runs)'); continue; }
  const rows = [...groups.entries()]
    .sort((a, b) => (b[1].withSep - b[1].noSep) - (a[1].withSep - a[1].noSep));
  const totalGain = rows.reduce((s, [, g]) => s + (g.withSep - g.noSep), 0);
  console.log(`\n${nm}  runs=${matched}  totalSavingIfAllStripped=${totalGain}  rawTok=${tok(t)}`);
  for (const [sh, g] of rows.slice(0, 6)) {
    const save = g.withSep - g.noSep;
    console.log(`   shape ${sh.padEnd(22)} n=${String(g.n).padStart(4)}  ` +
      `${String(g.withSep).padStart(5)} -> ${String(g.noSep).padStart(5)}  ` +
      `save=${String(save).padStart(5)}${save > 20 ? '   <= CANDIDATE' : ''}   e.g. ${g.sample}`);
  }
}
