/**
 * X91 CENSUS — how much HIGH-ENTROPY, NON-REPEATING material does the corpus carry,
 * by alphabet class? PYKNOSIS arbitrages a 16-symbol hex run from 1.740 to 2.201
 * chars/token (-20.9%) and is shipped. It cannot touch material whose alphabet is
 * larger than 16: base62 identifiers, base64 blobs, mixed-case session ids. This
 * census decides whether that gap is worth a mechanism or is empty.
 *
 * A run counts only if it is NON-REPEATING (occurs once in its own document),
 * because a repeating run is the tape's business and is already extracted.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';
const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);

const dirs = fs.readdirSync('bench').filter(d => d.startsWith('holdout') && fs.statSync(path.join('bench', d)).isDirectory());
const files: string[] = [];
for (const d of dirs) for (const f of fs.readdirSync(path.join('bench', d))) files.push(path.join('bench', d, f));

const PYK = 'etaoinsrhldcumyp'; // shipped PYKNOSIS alphabet
const HEXMAP = new Map<string, string>([...PYK].map((c, i) => ['0123456789abcdef'[i], c]));

type Klass = 'hex' | 'base62' | 'base64' | 'digits' | 'wordish';
function classify(r: string): Klass {
  if (/^[0-9]+$/.test(r)) return 'digits';
  if (/^[0-9a-fA-F]+$/.test(r)) return 'hex';
  if (/[^A-Za-z0-9+\/=_\-]/.test(r)) return 'wordish';
  if (/[+\/=]/.test(r) || (/[A-Z]/.test(r) && /[a-z]/.test(r) && /[0-9]/.test(r) && r.length >= 20)) return 'base64';
  if (/[A-Z]/.test(r) && /[a-z]/.test(r)) return 'base62';
  return 'wordish';
}

const agg = new Map<Klass, { runs: number; chars: number; toks: number; lanes: Set<string> }>();
for (const k of ['hex', 'base62', 'base64', 'digits', 'wordish'] as Klass[]) agg.set(k, { runs: 0, chars: 0, toks: 0, lanes: new Set() });
let totalSrcTok = 0;
const perLane: { lane: string; b62: number; b62tok: number; hex: number }[] = [];

for (const f of files) {
  let src: string;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  totalSrcTok += ct(src);
  const runs = src.match(/[A-Za-z0-9+\/=_\-]{10,}/g) || [];
  let b62 = 0, b62tok = 0, hex = 0;
  for (const r0 of runs) {
    const r = r0.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    if (r.length < 10) continue;
    const k = classify(r);
    // non-repeating test: does this exact run occur more than once in the document?
    const occ = src.split(r).length - 1;
    if (occ > 1) continue;                       // the tape's business
    if (k === 'wordish') continue;               // ordinary identifiers/words: not high entropy
    // DENSITY FILTER (PYKNOSIS's own diagnostic, bench/x34/dense.ts): a run is only
    // badly-priced material if the tokenizer charges it MORE than ~3 chars/token.
    // Without this the classifier sweeps in hyphenated English (HugePages_Total,
    // build-essential) at 4.75 ch/tok, which is word-like and not high entropy at
    // all -- a contaminated census that would have justified building nothing.
    const rt = ct(r);
    if (r.length / rt >= 3.0) continue;
    const a = agg.get(k)!;
    a.runs++; a.chars += r.length; a.toks += ct(r); a.lanes.add(f);
    if (k === 'base62') { b62 += r.length; b62tok += ct(r); }
    if (k === 'hex') hex += r.length;
  }
  if (b62 || hex) perLane.push({ lane: f.replace('bench/', ''), b62, b62tok, hex });
}

console.log('=== NON-REPEATING high-entropy runs across', files.length, 'lanes (source total', totalSrcTok, 'tokens) ===');
console.log('class'.padEnd(9), 'runs   chars   tokens  ch/tok   lanes');
for (const [k, a] of agg) {
  if (!a.runs) continue;
  console.log(k.padEnd(9), String(a.runs).padStart(5), String(a.chars).padStart(8), String(a.toks).padStart(7),
    (a.chars / a.toks).toFixed(2).padStart(8), String(a.lanes.size).padStart(6));
}
perLane.sort((x, y) => y.b62tok - x.b62tok);
console.log('\n=== top lanes by base62 token cost (the class PYKNOSIS cannot re-spell) ===');
for (const p of perLane.slice(0, 12)) console.log(' ', p.lane.padEnd(46), `b62=${String(p.b62).padStart(5)}ch/${String(p.b62tok).padStart(4)}tok  hex=${p.hex}ch`);

// ---- sample the class that dominates, so the number can be believed or rejected ----
console.log('\n=== SAMPLE of the 30 longest "base64"-classified non-repeating runs (is it really high entropy?) ===');
const samples: { f: string; r: string; t: number }[] = [];
for (const f of files) {
  let src: string; try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const r0 of (src.match(/[A-Za-z0-9+\/=_\-]{10,}/g) || [])) {
    const r = r0.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    if (r.length < 10) continue;
    if (classify(r) !== 'base64') continue;
    if (src.split(r).length - 1 > 1) continue;
    const t = ct(r);
    if (r.length / t >= 3.0) continue;
    samples.push({ f, r, t });
  }
}
samples.sort((a, b) => b.t - a.t);
for (const s of samples.slice(0, 30)) console.log(`  ${String(s.t).padStart(3)}tok ${(s.r.length / s.t).toFixed(2)}ch/tok  ${s.r.slice(0, 60).padEnd(60)} ${s.f.replace('bench/', '')}`);
console.log(`\nclass totals: ${samples.length} runs, ${samples.reduce((a, s) => a + s.t, 0)} tokens`);
