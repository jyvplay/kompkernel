/** X122 — does the CHIRON single-character glyph pool cap the dictionary?
 *  `chironParseTape` allows one glyph = one CHARACTER; the Cyrillic pool has 122
 *  one-token characters, so no CHIRON wire can carry more than ~122 rules.
 *  Here the dictionary size K is swept in SYMBOL space with an exact optimal
 *  parse, to see whether the total keeps falling past K = 122.
 *  cost = |body symbols| + Σ_used rules (1 + |rule symbols|) + frame */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = (process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : 'bench/holdout-x41/ls-l-real.txt').split('\n').filter(Boolean);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
const MAXN = Number(process.env.MAXN ?? 12);
const KS = (process.env.KS ?? '60,119,160,220,300,420,600').split(',').map(Number);

function parseCost(sym: string[], D: string[][]) {
  const N = sym.length;
  const byFirst = new Map<string, number[]>();
  for (let ri = 0; ri < D.length; ri++) { const k = D[ri]![0]!; if (!byFirst.has(k)) byFirst.set(k, []); byFirst.get(k)!.push(ri); }
  const dp = new Float64Array(N + 1);
  const step = new Int32Array(N); const use = new Int32Array(N).fill(-1);
  for (let i = N - 1; i >= 0; i--) {
    let bv = 1 + dp[i + 1], bj = 1, bu = -1;
    const cands = byFirst.get(sym[i]!);
    if (cands) for (const ri of cands) {
      const r = D[ri]!, L = r.length;
      if (i + L > N) continue;
      let ok = true;
      for (let k = 1; k < L; k++) if (sym[i + k] !== r[k]) { ok = false; break; }
      if (!ok) continue;
      const v = 1 + dp[i + L];
      if (v < bv) { bv = v; bj = L; bu = ri; }
    }
    dp[i] = bv; step[i] = bj; use[i] = bu;
  }
  const used = new Set<number>();
  let i = 0; while (i < N) { if (use[i]! >= 0) used.add(use[i]!); i += step[i]!; }
  return { body: dp[0]!, used };
}

function total(sym: string[], D: string[][], frame: number) {
  const { body, used } = parseCost(sym, D);
  let rules = 0;
  for (const ri of used) rules += 1 + D[ri]!.length;
  return { total: body + rules + frame, body, rules, usedCount: used.size };
}

for (const p of lanes) {
  const m = msgs.get(p); if (!m) { console.log(p, 'no message'); continue; }
  const s0 = m.indexOf(CHIRON_START);
  if (s0 < 0) { console.log(p, 'no frame'); continue; }
  const src = chironDecode(m.slice(s0));
  const sym = tokenStrings(src, enc).map((t) => t.s);
  const N = sym.length;
  const p0 = m.indexOf(CHIRON_SEP, s0 + 1);
  const frame = countTokens(m.slice(0, s0 + 1), enc) + 2; // contract prefix + § ¶
  const wireTok = countTokens(m, enc);
  // repeated n-grams
  const cnt = new Map<string, number>();
  for (let n = 2; n <= MAXN; n++) for (let i = 0; i + n <= N; i++) { const k = sym.slice(i, i + n).join('\u0001'); cnt.set(k, (cnt.get(k) ?? 0) + 1); }
  const cands: { r: string[]; c: number }[] = [];
  for (const [k, c] of cnt) if (c >= 2) cands.push({ r: k.split('\u0001'), c });
  // score: occurrences*(n-1) saved, minus rule cost (n+1)
  for (const cd of cands) cd['score'] = cd.c * (cd.r.length - 1) - (cd.r.length + 1);
  cands.sort((a: any, b: any) => b.score - a.score || b.c - a.c);
  console.log(`${p.split('/').pop()!.padEnd(16)} src ${src.length}ch ${N} sym | wire ${wireTok} tok (frame ${frame}) | repeated candidates ${cands.length}`);
  // greedy add loop, snapshot at each K
  const D: string[][] = [];
  const marks = new Map<number, string>();
  for (const K of KS) marks.set(K, '');
  const results: string[] = [];
  let lastTotal = N + frame;
  for (const cd of cands) {
    if (D.length >= Math.max(...KS)) break;
    D.push(cd.r);
    const t = total(sym, D, frame).total;
    if (t > lastTotal) { D.pop(); continue; }
    lastTotal = t;
    const K = D.length;
    if (marks.has(K)) results.push(`K=${K}:${t}(body ${total(sym, D, frame).body}, rules ${total(sym, D, frame).rules})`);
  }
  // prune: drop rules that no longer pay
  let improved = true; let guard = 0;
  while (improved && guard++ < 12) {
    improved = false;
    for (let ri = D.length - 1; ri >= 0; ri--) {
      const keep = D[ri]!; D.splice(ri, 1);
      const t = total(sym, D, frame).total;
      if (t <= lastTotal) { lastTotal = t; improved = true; } else D.splice(ri, 0, keep);
    }
  }
  const fin = total(sym, D, frame);
  console.log(`   greedy total after ${D.length} adds: ${fin.total} (body ${fin.body} rules ${fin.rules} used ${fin.usedCount}) vs wire ${wireTok} -> Δ ${fin.total - wireTok}`);
  if (results.length) console.log(`   curve ${results.join('  ')}`);
}
