// X42 screen 0 — WHAT IS LEFT, measured rather than guessed.
//
// X41 established that prose-01 sits at 4.57 chars/token and that its WORD-level
// repeat budget (43 tok) is smaller than what the stack already takes out of it
// (48 tok), i.e. word repetition is exhausted. This screen asks the three
// questions that have never been measured:
//
//   1. PHRASE repetition. Every dictionary in this stack has been evaluated on
//      single tokens. Multi-word phrases that recur are a different object and
//      have never been counted.
//   2. CASE. Capitalised word-initials are distinct BPE tokens from their
//      lowercase forms. Nobody has measured how much that costs.
//   3. WHITESPACE RUNS. Runs of 2+ spaces buy a pre-token of their own.
//
// And it recomputes, per lane, the SATURATION RATIO: what the stack already
// removes against what is available to remove. A ratio above 1 means the
// mechanism class is exhausted and looking there again is wasted effort.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const tok = (s: string) => encode(s).length;
const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

// frontier measured at the end of X41
const FRONTIER: Record<string, number> = {
  'vix-daily-1990.csv': 550, 'aapl-2014.csv': 1407, 'openstack-loghub-26.log': 894,
  'dump.sql': 608, 'git-numstat.txt': 1906, 'npm-ls.txt': 901, 'find-listing.txt': 1218,
  'ls-full-iso.txt': 366, 'kb-article.txt': 622, 'prose-01.txt': 737, 'readme.txt': 646,
  'bibliography.txt': 667, 'email-thread.txt': 488, 'chart.svg': 417, 'page.html': 547,
  'meeting-transcript.txt': 384, 'component.jsx': 264, 'pom.xml': 242,
};

const WORD = /[\p{L}][\p{L}\p{N}'_-]*/gu;

function words(t: string): string[] { return t.match(WORD) ?? []; }

/** Dictionary gain for a multiset of strings: sum over items of (k-1)(tok-1) - 1. */
function dictGain(counts: Map<string, number>): number {
  let g = 0;
  for (const [s, k] of counts) {
    if (k < 2) continue;
    const t = tok(s);
    const gain = (k - 1) * (t - 1) - 1;      // pay t once for the entry, 1 per use
    if (gain > 0) g += gain;
  }
  return g;
}

console.log('lane'.padEnd(25) +
  'raw'.padStart(6) + 'front'.padStart(6) + 'saved'.padStart(6) +
  ' | wordRep'.padStart(9) + ' phr2'.padStart(7) + ' phr3'.padStart(7) +
  ' phr4'.padStart(7) + ' | case'.padStart(7) + ' wsRun'.padStart(7) +
  ' | sat'.padStart(6) + ' c/tk'.padStart(6));

for (const p of lanes) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const raw = tok(t);
  const front = FRONTIER[nm] ?? NaN;
  const saved = raw - front;

  // 1a word repeats
  const wc = new Map<string, number>();
  for (const w of words(t)) wc.set(w, (wc.get(w) ?? 0) + 1);
  const wordRep = dictGain(wc);

  // 1b phrase repeats, n = 2,3,4
  const ws = words(t);
  const phraseRep: number[] = [];
  for (const n of [2, 3, 4]) {
    const pc = new Map<string, number>();
    for (let i = 0; i + n <= ws.length; i++) {
      const ph = ws.slice(i, i + n).join(' ');
      pc.set(ph, (pc.get(ph) ?? 0) + 1);
    }
    phraseRep.push(dictGain(pc));
  }

  // 2 case: capitalised word-initials
  let caseTok = 0;
  const cased = new Set<string>();
  for (const m of t.matchAll(/(?<![\p{L}\p{N}])[\p{Lu}][\p{L}]*/gu)) {
    const w = m[0];
    cased.add(w);
    caseTok += tok(w) - tok(w.toLowerCase());   // >0 when case costs extra
  }

  // 3 whitespace runs of 2+
  let wsRun = 0;
  for (const m of t.matchAll(/[^\S\r\n]{2,}|\t+/gu)) wsRun += tok(m[0]);

  const budget = wordRep + Math.max(...phraseRep);
  const sat = budget > 0 ? saved / budget : NaN;

  console.log(
    nm.padEnd(25) +
    String(raw).padStart(6) + String(front).padStart(6) + String(saved).padStart(6) +
    ' | ' + String(wordRep).padStart(7) +
    String(phraseRep[0]).padStart(7) + String(phraseRep[1]).padStart(7) +
    String(phraseRep[2]).padStart(7) +
    ' | ' + String(caseTok).padStart(5) + ' (' + String(cased.size).padStart(3) + ')' +
    String(wsRun).padStart(7) +
    ' | ' + (isNaN(sat) ? '   -' : sat.toFixed(2).padStart(5)) +
    (raw / front).toFixed(2).padStart(6),
  );
}
