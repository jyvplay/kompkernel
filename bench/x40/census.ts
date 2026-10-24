/**
 * X40 step 0 — where are the tokens, by character class?
 *
 * No codec here. For each lane this walks the tokenizer's own tokens and assigns
 * every token to the class of the SOURCE characters it covers, so the report says
 * "this many o200k tokens are spent on timestamps / digits / paths / whitespace",
 * measured, not estimated. It is the input to choosing what X40 attacks.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';

// character classes, applied to the source text
const TS = /[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?/g;
const TIME = /(?<![0-9])[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?/g;
const DATE = /(?<![0-9])[0-9]{4}-[0-9]{2}-[0-9]{2}(?![0-9])/g;
const NUM = /(?<![0-9A-Za-z_.])[0-9][0-9.]*/g;
const PATH = /(?:\/|\.\/)[A-Za-z0-9_@.\/-]{2,}/g;
const HEX = /(?<![0-9A-Za-z])[0-9a-f]{8,}(?![0-9A-Za-z])/g;

function marks(text: string, re: RegExp, cls: string, out: (string | null)[]) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    for (let i = m.index; i < m.index + m[0].length; i++) out[i] = out[i] ?? cls;
  }
}

for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, 'utf8');
  const cls: (string | null)[] = new Array(text.length).fill(null);
  // order matters: the more specific class wins because `??=` keeps the first
  marks(text, TS, 'ts', cls);
  marks(text, HEX, 'hex', cls);
  marks(text, DATE, 'date', cls);
  marks(text, TIME, 'time', cls);
  marks(text, NUM, 'num', cls);
  marks(text, PATH, 'path', cls);
  for (let i = 0; i < text.length; i++) {
    if (!cls[i] && /\s/.test(text[i])) cls[i] = 'ws';
  }
  const toks = tokenStrings(text, enc);
  let off = 0;
  const mass: Record<string, number> = {};
  let spaceChars = 0, boundaryToks = 0;
  for (const t of toks) {
    // classify by the token's own span, ignoring the whitespace it carries: a
    // token " the" is a WORD token, not a whitespace token. Only spans that are
    // pure whitespace count as whitespace.
    const span = t.s;
    let c = 'ws';
    for (let i = 0; i < span.length; i++) {
      const ch = span[i];
      if (/\s/.test(ch)) { spaceChars++; continue; }
      if (/[0-9]/.test(ch) || /[.!:@\/+\-]/.test(ch)) { c = cls[off + i] ?? 'num'; continue; }
      c = 'word';
      break;
    }
    if (/\s$/.test(span)) boundaryToks++;
    mass[c] = (mass[c] ?? 0) + 1;
    off += t.s.length;
  }
  if (off !== text.length) throw new Error('offset drift on ' + p);
  const total = toks.length;
  const pct = (k: string) => ((100 * (mass[k] ?? 0)) / total).toFixed(1);
  console.log(
    p.split('/').pop()!.padEnd(24),
    'tok=' + String(total).padStart(5),
    'ts=' + String(mass.ts ?? 0).padStart(4) + '(' + pct('ts') + '%)',
    'date=' + String(mass.date ?? 0).padStart(3),
    'time=' + String(mass.time ?? 0).padStart(3),
    'num=' + String(mass.num ?? 0).padStart(4),
    'hex=' + String(mass.hex ?? 0).padStart(4),
    'path=' + String(mass.path ?? 0).padStart(4),
    'ws=' + String(mass.ws ?? 0).padStart(4),
    'word=' + String(mass.word ?? 0).padStart(4),
    'spaceChars=' + String(spaceChars).padStart(5),
    'bnd=' + String(boundaryToks).padStart(4),
  );
}
