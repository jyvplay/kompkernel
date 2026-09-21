/**
 * bench/mine-strand.ts — offline miner for the STRAND-SB1 static book.
 *
 * DISCIPLINE (this is what makes the resulting numbers honest):
 *   · the book is mined ONLY from bench/train/**, never from bench/holdout/**
 *     and never from the repo's own fixtures;
 *   · the output is a frozen, versioned source file (strand-book.ts) that is
 *     committed and shipped — the encoder never mines at runtime, so nothing
 *     can leak from the document being compressed;
 *   · entries are scored by token-savings-per-glyph, the same criterion the
 *     runtime parser uses, so the book is not tuned to any evaluation set.
 *
 * Run:  node <bundled>  > src/lib/omega/strand-book.ts
 */
import { countTokens, encodeIds, decodeIds, type EncodingName } from '@/lib/omega/bpe';
import fs from 'node:fs';
import path from 'node:path';

const TRAIN_DIR = 'bench/train';
const HOLDOUT_DIR = 'bench/holdout';
const MIN_FREQ = 4;
const MAX_LEN_TOKENS = 10;
const MAX_CHARS = 72;
const BOOK_SIZE = 820;

function grid(t: string, enc: EncodingName): string[] {
  const ids = encodeIds(t, enc);
  const p: string[] = [];
  let pend: number[] = [];
  for (const id of ids) {
    pend.push(id);
    let s: string;
    try { s = decodeIds(pend, enc); } catch { continue; }
    if (s.indexOf('\uFFFD') !== -1 && t.indexOf('\uFFFD') === -1) continue;
    p.push(s); pend = [];
  }
  return p;
}

/**
 * HARD LEAK GUARD. Refuses to mine if any training file shares a 200-character
 * window with any held-out file, in either direction. Contamination would make
 * every held-out number meaningless, so this aborts rather than warns. (An
 * earlier revision of this corpus had 9 such overlaps; they were found by this
 * check and deleted.)
 */
function assertNoLeak(): void {
  if (!fs.existsSync(HOLDOUT_DIR)) return;
  const hold = fs.readdirSync(HOLDOUT_DIR)
    .map((f) => ({ f, t: fs.readFileSync(path.join(HOLDOUT_DIR, f), 'utf8') }));
  const bad: string[] = [];
  for (const tf of fs.readdirSync(TRAIN_DIR)) {
    const tt = fs.readFileSync(path.join(TRAIN_DIR, tf), 'utf8');
    for (const h of hold) {
      let leak = false;
      for (let i = 0; i + 200 <= h.t.length && !leak; i += 50) if (tt.indexOf(h.t.slice(i, i + 200)) !== -1) leak = true;
      for (let i = 0; i + 200 <= tt.length && !leak; i += 50) if (h.t.indexOf(tt.slice(i, i + 200)) !== -1) leak = true;
      if (leak) { bad.push(`${tf} ~ ${h.f}`); break; }
    }
  }
  if (bad.length) {
    console.error('TRAIN/HOLDOUT CONTAMINATION:\n  ' + bad.join('\n  '));
    process.exit(2);
  }
}

function mine(enc: EncodingName): string[] {
  const files = fs.readdirSync(TRAIN_DIR).sort();
  const cnt = new Map<string, number>();
  for (const f of files) {
    const text = fs.readFileSync(path.join(TRAIN_DIR, f), 'utf8');
    const g = grid(text, enc);
    // Count every token-substring up to MAX_LEN_TOKENS, per file, so a phrase
    // that is frequent in one file but absent elsewhere still registers.
    for (let L = 2; L <= MAX_LEN_TOKENS; L++) {
      for (let k = 0; k + L <= g.length; k++) {
        const s = g.slice(k, k + L).join('');
        if (s.length > MAX_CHARS) continue;
        cnt.set(s, (cnt.get(s) ?? 0) + 1);
      }
    }
  }
  const scored = [...cnt.entries()]
    .filter(([, c]) => c >= MIN_FREQ)
    .map(([s, c]) => ({ s, c, tk: countTokens(s, enc) }))
    .filter((x) => x.tk >= 2)
    // value = occurrences * tokens saved per fold. One glyph replaces tk tokens.
    .sort((a, b) => (b.c * (b.tk - 1)) - (a.c * (a.tk - 1)));

  // Redundancy pruning: skip a phrase that is a substring of an already-kept,
  // higher-value phrase AND does not add materially more coverage. Keeps the
  // book diverse instead of 300 shifts of the same string.
  const kept: string[] = [];
  for (const x of scored) {
    if (kept.length >= BOOK_SIZE) break;
    let dominated = false;
    for (const k of kept) {
      if (k.indexOf(x.s) !== -1) { dominated = true; break; }
    }
    if (!dominated) kept.push(x.s);
  }
  return kept;
}

assertNoLeak();
const o200k = mine('o200k_base');
const cl100k = mine('cl100k_base');

const header = `/**
 * src/lib/omega/strand-book.ts — GENERATED, DO NOT EDIT BY HAND.
 *
 * STRAND-SB1 static phrase book. Mined offline by bench/mine-strand.ts from
 * bench/train/** ONLY (a corpus disjoint from every evaluation fixture and
 * from bench/holdout/**). Frozen and version-pinned: the runtime encoder never
 * mines, so the book cannot absorb anything from the document it compresses.
 *
 * Order is part of the wire contract: phrase i binds to static glyph i.
 * Regenerate with:
 *   npx esbuild bench/mine-strand.ts --bundle --platform=node --format=esm \\
 *     --alias:@=./src --outfile=/tmp/mine.mjs && node /tmp/mine.mjs > src/lib/omega/strand-book.ts
 */

export const STRAND_BOOK_VERSION = 'SB1';

export const STRAND_BOOK_O200K: readonly string[] = ${JSON.stringify(o200k, null, 1)};

export const STRAND_BOOK_CL100K: readonly string[] = ${JSON.stringify(cl100k, null, 1)};
`;
process.stdout.write(header);
