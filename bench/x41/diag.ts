// X41 screen 0 — WHERE ARE THE REMAINING TOKENS?
//
// Eight turns have added dictionary, run-length, shape, script and exchange
// mechanisms. Each one was chosen by intuition and then measured. This screen
// inverts that: it measures FIRST, at the pre-tokenizer level, which bucket the
// remaining tokens actually live in, so the next mechanism is chosen by the
// data rather than by taste.
//
// o200k_base pre-tokenises with (approximately):
//   [^\r\n\p{L}\p{N}]? <letters>      -- ONE optional leading non-alnum glues to a word
//   \p{N}{1,3}                        -- digits in groups of AT MOST THREE
//   ?[^\s\p{L}\p{N}]+[\r\n/]*         -- optional space, then a RUN of punctuation,
//                                        plus any trailing newlines/slashes
//   \s*[\r\n]+ | \s+(?!\S) | \s+
// BPE merges never cross a pre-token boundary, so the chunk structure is a hard
// floor on the token count. That is what this measures.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const tok = (s: string) => encode(s).length;

const PAT = new RegExp([
  String.raw`[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+`,
  String.raw`[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*`,
  String.raw`\p{N}{1,3}`,
  String.raw` ?[^\s\p{L}\p{N}]+[\r\n/]*`,
  String.raw`\s*[\r\n]+`,
  String.raw`\s+(?!\S)`,
  String.raw`\s+`,
].join('|'), 'gu');

function chunks(s: string): string[] { return s.match(PAT) ?? []; }

type Bucket = { n: number; toks: number };
function bucket(): Bucket { return { n: 0, toks: 0 }; }

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

console.log('lane'.padEnd(24) + ' chars'.padStart(7) + ' toks'.padStart(6) +
  ' chunks'.padStart(8) + ' | word  digit  punct  space  | ' +
  'dig>3  spcRun  LCPgain  quote  repeat');

for (const p of lanes) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const total = tok(t);
  const cs = chunks(t);

  const word = bucket(), digit = bucket(), punct = bucket(), space = bucket();
  let digLong = 0, digLongTok = 0;
  for (const c of cs) {
    const k = tok(c);
    const lead = c.length > 0 && !/[\p{L}\p{N}]/u.test(c[0]);
    if (/^\s+$/u.test(c)) { space.n++; space.toks += k; }
    else if (/^ ?[^\s\p{L}\p{N}]+$/u.test(c.replace(/[\r\n/]+$/u, ''))) { punct.n++; punct.toks += k; }
    else if (/^[\p{N}]{1,3}$/u.test(c.replace(/^[^\r\n\p{L}\p{N}]/u, '')) && /\p{N}/u.test(c)) {
      digit.n++; digit.toks += k;
    } else { word.n++; word.toks += k; }
    if (lead) { /* leading-glue chunk, counted in its class above */ }
  }
  // digit runs of more than 3 digits in the SOURCE (these are force-split)
  for (const m of t.matchAll(/\p{N}{4,}/gu)) { digLong++; digLongTok += tok(m[0]); }

  // whitespace runs of length >= 2 (each costs its own chunk)
  let spcRun = 0, spcRunTok = 0;
  for (const m of t.matchAll(/[^\S\r\n]{2,}/gu)) { spcRun++; spcRunTok += tok(m[0]); }

  // longest common prefix over lines: delete from all lines, state it once
  const lines = t.split('\n');
  let lcp = lines[0] ?? '';
  for (const l of lines.slice(1)) {
    let i = 0; while (i < lcp.length && i < l.length && lcp[i] === l[i]) i++;
    lcp = lcp.slice(0, i);
    if (!lcp) break;
  }
  // gain = (tokens of the prefix) * (lines-1) - cost of stating it once (~1x + clause)
  const lcpTok = lcp.length ? tok(lcp) : 0;
  const lcpGain = lines.length > 2 ? lcpTok * (lines.length - 1) - lcpTok - 14 : 0;

  // quoted / bracketed spans
  let quote = 0;
  for (const m of t.matchAll(/"[^"\n]{4,}"|'[^'\n]{4,}'/gu)) quote += tok(m[0]);

  // how much of the file is repeats a dictionary could have caught
  const rep = (() => {
    const counts = new Map<string, number>();
    for (const m of t.matchAll(/\p{L}[\p{L}\p{N}_-]{5,}/gu)) {
      const w = m[0]; counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    let g = 0;
    for (const [w, n] of counts) if (n > 1) g += (n - 1) * (tok(w) - 1);
    return g;
  })();

  console.log(
    nm.padEnd(24) +
    String(t.length).padStart(7) + String(total).padStart(6) + String(cs.length).padStart(8) +
    ' | ' + String(word.toks).padStart(5) + String(digit.toks).padStart(7) +
    String(punct.toks).padStart(7) + String(space.toks).padStart(7) +
    ' | ' + String(digLongTok).padStart(5) + String(spcRunTok).padStart(8) +
    String(lcpGain).padStart(9) + String(quote).padStart(7) + String(rep).padStart(8),
  );
}
