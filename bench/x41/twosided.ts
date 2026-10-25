/**
 * X41 — TWO-SIDED LINE DELTA against the previous line, measured on real material.
 *
 * For line i > 0, let p be the length of the common PREFIX with line i-1 and s
 * the length of the common SUFFIX with line i-1 (s computed after p, so the two
 * never overlap). The line is written as
 *
 *      ~p,s:middle          where middle = line[p .. len-s]
 *
 * which is the most general single-neighbour delta: prefix-only (front coding,
 * s=0) and suffix-only (s=0/prefix 0) are special cases, and pure duplication is
 * p+s = len (middle empty).
 *
 * Measured here with the tokenizer, no codec, no contract. Every marker costs
 * what the tokenizer charges for it, so the numbers are honest to within the
 * clause the codec must still pay (~10-15 tokens once).
 *
 *   raw       the file
 *   delta     every line delta-coded (each line pays its own marker)
 *   deltaR    delta only where the middle is strictly shorter than the line by
 *             more than the marker's cost, else the line verbatim — the form a
 *             real encoder would ship
 *   bothOnly  p-only and s-only variants, to show which side does the work
 */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').filter(Boolean);

function commonPrefix(a: string, b: string): number {
  let k = 0;
  const m = Math.min(a.length, b.length);
  while (k < m && a[k] === b[k]) k++;
  return k;
}
function commonSuffix(a: string, b: string, from: number): number {
  let k = 0;
  const m = Math.min(a.length, b.length) - from;
  while (k < m && a[a.length - 1 - k] === b[b.length - 1 - k]) k++;
  return k;
}

function encodeTwo(lines: string[], opts: { rightFold: boolean }): string {
  const out: string[] = [];
  let prev = '';
  for (const l of lines) {
    let p = commonPrefix(l, prev);
    let s = commonSuffix(l, prev, p);
    const middle = l.slice(p, l.length - s);
    const cand = '~' + p + ',' + s + ':' + middle;
    // a real encoder ships the shorter of the two, measured in characters here
    out.push(opts.rightFold && cand.length >= l.length ? l : cand);
    prev = l;
  }
  return out.join('\n');
}

for (const p of lanes) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  const raw = countTokens(t, enc);
  const all = countTokens(encodeTwo(lines, { rightFold: false }), enc);
  const chosen = countTokens(encodeTwo(lines, { rightFold: true }), enc);
  // one-sided baselines on the same rule, for attribution
  const preOnly = countTokens(
    (() => { const o: string[] = []; let prev = ''; for (const l of lines) { const p = commonPrefix(l, prev); o.push('~' + p + ':' + l.slice(p)); prev = l; } return o.join('\n'); })(), enc);
  const sufOnly = countTokens(
    (() => { const o: string[] = []; let prev = ''; for (const l of lines) { const s = commonSuffix(l, prev, 0); o.push('~' + s + ':' + l.slice(0, l.length - s)); prev = l; } return o.join('\n'); })(), enc);
  console.log(
    p.split('/').pop()!.padEnd(22),
    'raw=' + String(raw).padStart(5),
    'two=' + String(all).padStart(5) + '(' + String(all - raw).padStart(5) + ')',
    'twoR=' + String(chosen).padStart(5) + '(' + String(chosen - raw).padStart(5) + ')',
    'pre=' + String(preOnly - raw).padStart(5),
    'suf=' + String(sufOnly - raw).padStart(5),
  );
}
