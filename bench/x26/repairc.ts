/**
 * X26: CHARACTER-LEVEL RePair, measured on a really rendered wire.
 *
 * The token-level RePair in bench/x26/repair.ts lost to POLYTROPOS by 26-75
 * tokens per lane. The likely reason is granularity: POLYTROPOS searches
 * CHARACTER spans, so it can name a substring that begins or ends in the middle
 * of a token. Character-level RePair has the same freedom.
 *
 * Here every symbol is a string, rules concatenate, and after each merge the
 * wire is RENDERED (tape = concat of glyph+expansion, body = concat of symbols)
 * and counted EXACTLY. The search stops when the real total stops improving, so
 * the reported number is achievable, not modelled.
 *
 * Glyphs are drawn from a Cyrillic pool; the rendering is the real CHIRON shape.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const POOL: string[] = [];
for (let c = 0x0410; c < 0x0450; c++) POOL.push(String.fromCodePoint(c));
for (let c = 0x0370; c < 0x0400; c++) POOL.push(String.fromCodePoint(c));
for (let c = 0x05d0; c < 0x05eb; c++) POOL.push(String.fromCodePoint(c));
for (let c = 0x10d0; c < 0x10f6; c++) POOL.push(String.fromCodePoint(c));
for (let c = 0x0905; c < 0x0939; c++) POOL.push(String.fromCodePoint(c));

const MINCOUNT = +(process.env.MINCOUNT || '2');
const MAXRULES = +(process.env.MAXRULES || '600');
const SEP = '¶';

function run(f: string) {
  const text = fs.readFileSync(f, 'utf8');
  const base = T(text);
  // symbols: index 0..255 = literal chars, >=256 = rules
  const exp: string[] = [];                 // expansion of rule i (i>=256)
  const glyphOf = new Map<number, string>();
  let body: number[] = Array.from(text).map((c) => c.codePointAt(0)! < 256 ? c.charCodeAt(0) : 0xffff);
  // fall back: operate on UTF-16 code units for generality
  body = [];
  for (const ch of text) { const cp = ch.codePointAt(0)!; body.push(cp); }

  const renderTape = () => {
    let s = '';
    for (let i = 0; i < exp.length; i++) s += glyphOf.get(256 + i)! + exp[i];
    return s;
  };
  const renderBody = () => {
    let s = '';
    for (const x of body) s += x >= 256 ? glyphOf.get(x)! : String.fromCodePoint(x);
    return s;
  };
  const total = () => T(renderTape() + SEP + renderBody()) + 2;

  let cur = total();
  const t0 = Date.now();
  for (let step = 0; step < MAXRULES; step++) {
    if (exp.length >= POOL.length) break;
    // count adjacent pairs over the body
    const cnt = new Map<string, number>();
    for (let i = 0; i + 1 < body.length; i++) {
      const k = body[i] + ',' + body[i + 1];
      cnt.set(k, (cnt.get(k) ?? 0) + 1);
    }
    let bestKey: string | null = null, bestN = 0;
    for (const [k, n] of cnt) if (n > bestN && n >= MINCOUNT) { bestN = n; bestKey = k; }
    if (!bestKey) break;
    const [a, b] = bestKey.split(',').map(Number);
    const id = 256 + exp.length;
    const e = (a >= 256 ? exp[a - 256] : String.fromCodePoint(a)) + (b >= 256 ? exp[b - 256] : String.fromCodePoint(b));
    exp.push(e);
    glyphOf.set(id, POOL[exp.length - 1]);
    // non-overlapping leftmost replacement
    const out: number[] = [];
    let hits = 0;
    for (let i = 0; i < body.length; ) {
      if (body[i] === a && body[i + 1] === b) { out.push(id); i += 2; hits++; }
      else { out.push(body[i]); i++; }
    }
    if (hits < MINCOUNT) { exp.pop(); glyphOf.delete(id); break; }
    const prev = body;
    body = out;
    const nt = total();
    if (nt >= cur) { body = prev; exp.pop(); glyphOf.delete(id); break; }   // not paying
    cur = nt;
  }
  console.log(f.split('/').pop()!.padEnd(38), 'raw', String(base).padStart(5),
    '| char-RePair wire', String(cur).padStart(5), '(rules', String(exp.length).padStart(4), ')',
    '| saved', String(base - cur).padStart(5),
    `(${((base - cur) / base * 100).toFixed(1)}%)`,
    '|', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}

for (const f of (process.env.F || 'bench/holdout-work/kb-article.txt').split(',')) run(f);
