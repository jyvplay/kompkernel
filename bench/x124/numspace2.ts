/**
 * X124 — greedy, per-context version of the space-before-number junction.
 *
 * The global rule loses on most lanes because the danger set (a number that
 * was never preceded by a space: "libfoo.so.1", "x86_64", "1.2.3-4") outnumbers
 * the elidable set. The junction is a FUNCTION of the character the reader sees
 * immediately before the number, so the encoder chooses the SET S of preceding
 * characters for which a space is restored:
 *
 *   for c in S:  "c 4" -> "c4"                     (one token saved)
 *                "c4"  -> "c" + MARK + "4"         (a danger, marked)
 *   for c not in S: untouched.
 *
 * A number directly after a digit can never be elided (the runs would merge),
 * and a number at line start needs no space. Two punctuation characters in a
 * row are one o200k token, so a punctuation MARK after a punctuation character
 * is free -- which is why the danger bill is much smaller than the danger count
 * on punctuation-heavy lanes.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const MARK_CANDIDATES = ['~', '^', '`', '¢', '£', '¤', '¥', '¨', '©', 'ª', '«', '¬', '®', '¯', '°', '±', '²'];
const isDigit = (c: string) => c >= '0' && c <= '9';
const isLetter = (c: string) => /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/.test(c);

/** class key for the character seen before a number */
function classOf(c: string): string {
  if (isLetter(c)) return 'LETTER';
  if (c === ' ' || c === '\t') return 'WS';
  if (c === '\n' || c === '\r') return 'NL';
  return 'P:' + c;
}

interface Site { at: number; cls: string; kind: 'elide' | 'danger' | 'skip' }
function sites(src: string): Site[] {
  const out: Site[] = [];
  for (let i = 0; i < src.length; i++) {
    if (!isDigit(src[i])) continue;
    const prev = i > 0 ? src[i - 1] : '';
    if (isDigit(prev)) continue;                 // not a run start
    if (prev === '' || prev === '\n' || prev === '\r') { out.push({ at: i, cls: 'NL', kind: 'skip' }); continue; }
    if (prev === ' ' || prev === '\t') {
      const before = i > 1 ? src[i - 2] : '';
      if (before === ' ' || before === '\t' || isDigit(before)) { out.push({ at: i, cls: 'WS', kind: 'skip' }); continue; }
      out.push({ at: i, cls: classOf(before), kind: 'elide' });
      continue;
    }
    out.push({ at: i, cls: classOf(prev), kind: 'danger' });
  }
  return out;
}

function apply(src: string, S: Set<string>, mark: string): string {
  const st = sites(src);
  if (!st.length) return src;
  const drop = new Set<number>();   // indices of spaces to delete
  const ins = new Map<number, string>(); // index -> text to insert before
  for (const s of st) {
    if (s.kind === 'skip') continue;
    if (!S.has(s.cls)) continue;
    if (s.kind === 'elide') drop.add(s.at - 1);
    else ins.set(s.at, mark);
  }
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const insText = ins.get(i);
    if (insText !== undefined) out += insText;
    if (drop.has(i)) continue;
    out += src[i];
  }
  return out;
}

let totRaw = 0, totBest = 0;
console.log('lane                          raw   best   delta  classes chosen');
for (const p of lanes) {
  const src = fs.readFileSync(p, 'utf8');
  const mark = MARK_CANDIDATES.find((m) => !src.includes(m));
  if (!mark) { console.log(`${p.split('/').pop()!.padEnd(30)} no mark`); continue; }
  const raw = countTokens(src, enc);
  const st = sites(src);
  const byClass = new Map<string, { e: number; d: number }>();
  for (const s of st) { if (s.kind === 'skip') continue; const b = byClass.get(s.cls) ?? { e: 0, d: 0 }; if (s.kind === 'elide') b.e++; else b.d++; byClass.set(s.cls, b); }
  const classes = [...byClass.entries()].sort((a, b) => (b[1].e - b[1].d) - (a[1].e - a[1].d));
  const S = new Set<string>();
  let bestTok = raw;
  for (let round = 0; round < classes.length; round++) {
    let pick: string | null = null; let pickTok = bestTok;
    for (const [cls] of classes) {
      if (S.has(cls)) continue;
      const t = new Set(S); t.add(cls);
      const tok = countTokens(apply(src, t, mark), enc);
      if (tok < pickTok) { pickTok = tok; pick = cls; }
    }
    if (pick === null) break;
    S.add(pick); bestTok = pickTok;
  }
  const contract = 10 + 2 * S.size; // rough: one clause plus one token per named class
  const net = bestTok - raw + contract;
  totRaw += raw; totBest += bestTok;
  const desc = [...S].map((c) => `${c}(${byClass.get(c)!.e}/${byClass.get(c)!.d})`).join(' ');
  console.log(`${p.split('/').pop()!.padEnd(30)}${String(raw).padStart(6)}${String(bestTok).padStart(7)}${String(bestTok - raw).padStart(8)}  net+contract ${String(net).padStart(5)}  ${desc.slice(0, 110)}`);
}
console.log(`TOTAL raw ${totRaw} best ${totBest} delta ${totBest - totRaw}`);
