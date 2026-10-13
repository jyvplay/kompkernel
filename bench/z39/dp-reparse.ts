// Z39 experiment: does an optimal (token-aligned, DP) re-parse of the ORIGINAL text against a FIXED rule set beat the
// greedy application order that VERITAS-P uses? Same rule set, same wire, same decoder; only the body differs.
// Exact o200k counts of the whole wire decide. Phrases are the flat (expanded) strings.
import fs from 'node:fs';
import { tokenStrings, countTokens } from '@/lib/omega/bpe';
import { veritasPSearch, DEFAULT_VXP_OPTS } from '@/lib/omega/veritas-p';
import { wireR } from '@/lib/omega/veritas-r';
import { escBody, veritasADecode } from '@/lib/omega/veritas-a';
import { nestedHeaderPhrases } from '@/lib/omega/veritas-n';
import type { VeritasSEntry } from '@/lib/omega/veritas-s';

// flat phrase of each entry: expand nested keys (earlier keys inside later phrases are expanded by the decoder)
function flatPhrases(entries: VeritasSEntry[]): Map<string, string> {
  const m = new Map<string, string>();
  const nh = nestedHeaderPhrases(entries);
  const expand = (s: string, depth = 0): string => {
    if (depth > 50) return s;
    let out = '';
    for (const ch of s) {
      const e = entries.find((x) => x.key === ch);
      out += e && depth < 50 ? expand(nh.get(ch) ?? e.phrase, depth + 1) : ch;
    }
    return out;
  };
  for (const e of entries) m.set(e.key, expand(nh.get(e.key) ?? e.phrase));
  return m;
}

// token-aligned DP: cost = number of symbols (1 per literal token, 1 per key occurrence). Returns the new body (escaped).
function dpBody(text: string, entries: VeritasSEntry[], enc: 'o200k_base'): string {
  const toks = tokenStrings(text, enc);
  const starts: number[] = []; // char offset of each token start, plus end
  let off = 0;
  for (const t of toks) { starts.push(off); off += t.s.length; }
  starts.push(off);
  const n = toks.length;
  const idxOfChar = new Map<number, number>();
  starts.forEach((c, i) => idxOfChar.set(c, i));
  const flat = flatPhrases(entries);
  // occurrences: token-index pairs (i, j) with text[starts[i]..starts[j]) === phrase, both boundaries aligned
  const occ: { i: number; j: number; key: string }[] = [];
  for (const [key, ph] of flat) {
    if (!ph.length) continue;
    let p = text.indexOf(ph);
    while (p !== -1) {
      const i = idxOfChar.get(p), j = idxOfChar.get(p + ph.length);
      if (i !== undefined && j !== undefined) occ.push({ i, j, key });
      p = text.indexOf(ph, p + 1);
    }
  }
  const byEnd = new Map<number, { i: number; key: string }[]>();
  for (const o of occ) { if (!byEnd.has(o.j)) byEnd.set(o.j, []); byEnd.get(o.j)!.push({ i: o.i, key: o.key }); }
  const best = new Float64Array(n + 1), from: ({ kind: 'lit' } | { kind: 'key'; key: string; i: number })[] = new Array(n + 1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    best[j] = best[j - 1] + 1; from[j] = { kind: 'lit' };
    for (const o of byEnd.get(j) ?? []) {
      const c = best[o.i] + 1;
      if (c < best[j] || (c === best[j] && from[j]?.kind === 'lit')) { best[j] = c; from[j] = { kind: 'key', key: o.key, i: o.i }; }
    }
  }
  // backtrack
  const parts: string[] = [];
  let j = n;
  while (j > 0) {
    const f = from[j];
    if (f.kind === 'lit') { parts.push(escBody(toks[j - 1].s)); j -= 1; }
    else { parts.push(f.key); j = f.i; }
  }
  return parts.reverse().join('');
}

const files = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const s = veritasPSearch(text, 'o200k_base', DEFAULT_VXP_OPTS);
  const greedyWire = wireR(s.state.entries, s.state.body);
  const body2 = dpBody(text, s.state.entries, 'o200k_base');
  const dpWire = wireR(s.state.entries, body2);
  const ok = veritasADecode(dpWire) === text;
  console.log(JSON.stringify({ f: f.split('/').pop(), in: countTokens(text, 'o200k_base'), entries: s.state.entries.length, greedyCount: countTokens(greedyWire, 'o200k_base'), dpCount: countTokens(dpWire, 'o200k_base'), dpExact: ok, ms: Date.now() - t0 }));
}
