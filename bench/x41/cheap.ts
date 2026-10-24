/**
 * X41 — CHEAP TRANSFORM CENSUS on real material (tokenizer only, no codec).
 *
 * For each lane, the token count of the file after each candidate transform,
 * with no contract, no header, no gate. This is an upper bound on what the
 * transform could contribute; the codec must additionally pay a clause and
 * survive the gate, so treat every number here as optimistic.
 *
 *   raw     the file
 *   pad     every run of >=2 spaces replaced by one space  (layout padding)
 *   front   path-style front coding: each line replaced by its shared prefix
 *           length with the previous line plus the divergent suffix, written as
 *           "|k|suffix". Lines are taken in the order they appear.
 *   frontS  the same, with the lines SORTED first (the classic precondition),
 *           plus one permutation cost estimate of 1 token per line, because a
 *           sorted wire cannot restore the original order for free.
 */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').filter(Boolean);

function front(lines: string[]): string {
  const out: string[] = [];
  let prev = '';
  for (const l of lines) {
    let k = 0;
    while (k < l.length && k < prev.length && l[k] === prev[k]) k++;
    out.push('|' + k + '|' + l.slice(k));
    prev = l;
  }
  return out.join('\n');
}

for (const p of lanes) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, enc);
  const pad = countTokens(t.replace(/ {2,}/g, ' '), enc);
  const lines = t.split('\n');
  const fr = countTokens(front(lines), enc);
  const sorted = [...lines].sort();
  const frS = countTokens(front(sorted), enc) + lines.length; // + permutation proxy
  const ws = countTokens(t.replace(/[ \t]+/g, ' '), enc);
  console.log(
    p.split('/').pop()!.padEnd(22),
    'raw=' + String(raw).padStart(5),
    'pad=' + String(pad).padStart(5) + '(' + String(pad - raw).padStart(4) + ')',
    'ws=' + String(ws).padStart(5) + '(' + String(ws - raw).padStart(4) + ')',
    'front=' + String(fr).padStart(5) + '(' + String(fr - raw).padStart(4) + ')',
    'frontS=' + String(frS).padStart(5) + '(' + String(frS - raw).padStart(4) + ')',
  );
}
