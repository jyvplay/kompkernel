// X25 probe: greedy single-character edit search.
//
// Formal model (exact, from the o200k_base pre-tokenizer regex in src/lib/omega/bpe.ts):
//   tiktoken runs a REGEX pre-tokenizer before any BPE merge, and BPE merges never
//   cross a chunk boundary.  Therefore
//       |encode(s)| = SUM over pre-tokenizer chunks c of |encode(c)|   EXACTLY.
//   The chunk grammar is:
//       N{1,3}                 -> digits, at most THREE per chunk
//       ' ?[^space L N]+'      -> optional single leading space + a punctuation run
//       letter runs            -> optional single leading non-letter-non-digit + letters
//       \s+(?!\S) | \s+        -> whitespace
//   So the token cost of a string is a function of HOW IT CHUNKS, and rewriting a
//   string so that it chunks more favourably is a legitimate, exactly-measurable
//   compression axis.
//
// This probe asks the user's question directly and without mercy:
//   "for a given text, is there a single-character deletion, insertion or
//    substitution that reduces the token count -- and if so, is the edit
//    INVERTIBLE by a rule an LLM can state back?"
//
// It answers the first half by exhaustive search, and prints the edits it finds so
// the second half can be judged by hand.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const PRETOK =
  /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

function chunks(s: string): string[] {
  PRETOK.lastIndex = 0;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PRETOK.exec(s))) out.push(m[0]);
  return out;
}

// Insert alphabet: everything the edit could plausibly want.
const INS = (
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
  " -_.,;:!?'\"()[]{}/\\|@#$%^&*+=~`<>"
).split('');

interface Best { d: number; kind: string; at: number; ch: string; ctx: string }

/** Exhaustive single-edit scan. Returns the best (most negative) edit found. */
function scan(text: string, cur: number, sampleStride: number): Best | null {
  let best: Best | null = null;
  const n = text.length;
  const consider = (d: number, kind: string, at: number, ch: string, cand: string) => {
    if (d < 0 && (!best || d < best.d)) {
      best = { d, kind, at, ch, ctx: cand.slice(Math.max(0, at - 18), at + 18) };
    }
  };
  for (let i = 0; i < n; i += sampleStride) {
    // deletion
    const del = text.slice(0, i) + text.slice(i + 1);
    consider(T(del) - cur, 'del', i, text[i], del);
    // substitution
    for (const c of INS) {
      if (c === text[i]) continue;
      const sub = text.slice(0, i) + c + text.slice(i + 1);
      consider(T(sub) - cur, 'sub', i, c, sub);
    }
    // insertion
    for (const c of INS) {
      const ins = text.slice(0, i) + c + text.slice(i);
      consider(T(ins) - cur, 'ins', i, c, ins);
    }
  }
  return best;
}

const files = (process.env.F || '').split(',').filter(Boolean);
const stride = +(process.env.STRIDE || 1);
const maxIter = +(process.env.ITER || 12);

console.log('lane'.padEnd(30), 'base'.padStart(6), 'after'.padStart(6), 'saved'.padStart(6), 'edits');
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  let cur = text;
  let base = T(text);
  const log: string[] = [];
  for (let it = 0; it < maxIter; it++) {
    const b = scan(cur, T(cur), stride);
    if (!b) break;
    const cand = b.kind === 'del'
      ? cur.slice(0, b.at) + cur.slice(b.at + 1)
      : b.kind === 'sub'
        ? cur.slice(0, b.at) + b.ch + cur.slice(b.at + 1)
        : cur.slice(0, b.at) + b.ch + cur.slice(b.at);
    const t2 = T(cand);
    if (t2 >= T(cur)) break;              // window lied; reject
    cur = cand;
    log.push(`${b.kind}@${b.at}${b.kind === 'del' ? '' : ':' + JSON.stringify(b.ch)}`);
    if (it < 8) console.log('    ', b.kind.padEnd(4), String(b.d).padStart(3), JSON.stringify(b.ctx));
  }
  console.log(f.split('/').pop()!.padEnd(30), String(base).padStart(6), String(T(cur)).padStart(6), String(T(cur) - base).padStart(6), log.slice(0, 10).join(' '));
}
