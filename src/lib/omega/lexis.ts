/**
 * LEXIS - lambda-epsilon-xi-iota-sigma (lexis, "word / diction")
 * =============================================================
 *
 * THE MECHANISM: reversible junction refolding.
 *
 * English orthography contains *derivable junctions*: places where the presence
 * of a space is forced by the neighbouring characters rather than chosen by the
 * writer.  After a sentence mark P in { . , ; : } the next thing is essentially
 * always a single space followed by a new word.  When that is true, the space
 * carries ~0 information and can be deleted; the reader restores it by rule.
 *
 * The delicate part - and the reason this is not a rename of "delete spaces" -
 * is that the fold is only a bijection on the subset of texts in which the
 * inverse rule is unambiguous.  LEXIS therefore:
 *
 *   1. counts the *danger* set: occurrences of P immediately followed by a
 *      letter with NO space.  On those the inverse rule would insert a space
 *      that was never there, so they cannot be left in the stream;
 *   2. rewrites each danger occurrence using an adaptive sentinel character
 *      chosen per text from a pool of single-token ASCII marks that do not
 *      occur in the wire.  A sentinel Q means "this is a literal P with no
 *      space after it";
 *   3. deletes the space after every P that is followed by a letter;
 *   4. only ships the transform when the measured token balance is negative.
 *
 * The decoder's rule is one sentence, stated in the contract, and it is applied
 * to the whole wire *before* any parent codec is expanded - composition order
 * is (unfold junctions) -> (parent decode).
 *
 * Adjacent to, but not the same as:
 *   - "delete all spaces": not reversible and, measured, a large loss (+103 on
 *     kb-article) because it fragments survivors into byte-level tokens.
 *   - punctuation restoration in ASR: model based, i.e. NOT byte exact.
 *   - LLM + arithmetic coding: lossless but requires bit-identical logits at
 *     both ends, which a bare chat-message reader cannot provide.
 *
 * Honest citation: the observation that orthographic junctions are redundant is
 * folklore; the counting discipline used here (derivable-vs-danger partition +
 * adaptive sentinel + shipped-only-if-negative) is original to this repo.
 *
 * Byte-exact: lexisDecode(lexisEncode(t).wire) === t is asserted for every
 * candidate before it is allowed to win.
 */

import { countTokens } from './bpe';
import type { EncodingName } from './bpe';
import { chironDecode } from './chiron';

/* -------------------------------------------------------------------------- */

export const LEXIS_PUNCT = ['.', ',', ';', ':'] as const;

/** Candidate single-token ASCII sentinels, most-preferred first. */
const SENTINEL_POOL = ['~', '^', '`', '|', '\\', '@', '#', '$', '%', '&', '*', '+', '=', '?', '!'];

const now = () => Number(process.hrtime.bigint() / 1_000_000n);

export interface LexisFoldStats {
  /** spaces deleted after a sentence mark */
  folds: number;
  /** literal `P + letter` occurrences that had to be sentinelised */
  dangers: number;
  /** sentinel characters actually used, in P order */
  sentinels: Partial<Record<string, string>>;
}

/**
 * A follower is any non-whitespace character.
 *
 * This is deliberately the WIDEST possible predicate, and that is a correctness
 * decision rather than a performance one.  The inverse rule the reader applies
 * is "after . , ; : insert a space unless a space or line break already
 * follows".  For that sentence to be COMPLETE, every occurrence in the source
 * of a sentence mark immediately followed by a non-whitespace character - which
 * includes "J. L.," and "3.14" and "file.ts" - must be sentinelised, because
 * the reader's rule would otherwise insert a space that was never there.  A
 * narrower predicate (letters only, or non-punctuation only) silently produced
 * a contract that over-promised: the in-repo round trip passed because both
 * sides used the same narrow unfold, but an independent reader following the
 * contract verbatim diverged.  Catchable only by decoding the message by hand.
 */
const isWS = (c: string | undefined) => c === undefined || /\s/.test(c);
const isFoldFollower = (c: string | undefined): boolean => c !== undefined && !/\s/.test(c);

/**
 * Choose sentinels: one distinct unused single-token mark per punctuation mark
 * that actually has a danger occurrence.  Returns null if the pool is exhausted
 * or a sentinel cannot be shown to be single-token.
 */
function pickSentinels(text: string, needed: string[]): Record<string, string> | null {
  if (needed.length === 0) return {};
  const out: Record<string, string> = {};
  let pool = 0;
  for (const p of needed) {
    let s: string | null = null;
    while (pool < SENTINEL_POOL.length) {
      const cand = SENTINEL_POOL[pool++]!;
      if (text.includes(cand)) continue;
      if (countTokens(cand, 'o200k_base') !== 1) continue;
      s = cand;
      break;
    }
    if (!s) return null;
    out[p] = s;
  }
  return out;
}

/**
 * Fold: delete the derivable space after a sentence mark; sentinelise the
 * non-derivable ones.  Pure function of the input string.
 */
export function lexisFold(text: string): { text: string; stats: LexisFoldStats } {
  // Pass 1 - which marks have danger occurrences?
  const dangerFor = new Set<string>();
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (!LEXIS_PUNCT.includes(c as any)) continue;
    const n = text[i + 1];
    if (!isWS(n) && isFoldFollower(n)) dangerFor.add(c);
  }
  const needed = LEXIS_PUNCT.filter((p) => dangerFor.has(p));
  const sentinels = pickSentinels(text, needed);
  if (!sentinels) {
    return { text, stats: { folds: 0, dangers: 0, sentinels: {} } };
  }

  let folds = 0;
  let dangers = 0;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (!LEXIS_PUNCT.includes(c as any)) {
      out += c;
      continue;
    }
    const n1 = text[i + 1];
    const n2 = text[i + 2];
    if (n1 === ' ' && isFoldFollower(n2)) {
      // derivable: the space is forced. Delete it.
      out += c + n2;
      i += 2; // consume the space and n2 (both already emitted)
      folds++;
      continue;
    }
    if (isFoldFollower(n1)) {
      // not derivable: literal `P + letter`. Sentinelise.
      const q = sentinels[c];
      if (q === undefined) {
        // should not happen; bail out safely by leaving the text alone
        return { text, stats: { folds: 0, dangers: 0, sentinels: {} } };
      }
      out += q + n1;
      i += 1;
      dangers++;
      continue;
    }
    out += c;
  }
  return { text: out, stats: { folds, dangers, sentinels } };
}

/**
 * Unfold: the reader's rule.  Applied to the whole wire before the parent
 * codec's own expansion.
 *
 *   Q + letter  ->  P + letter          (sentinel: literal, no space)
 *   P + letter  ->  P + SPACE + letter  (derivable junction restored)
 */
export function lexisUnfold(text: string, sentinels: Partial<Record<string, string>> = {}): string {
  const qToP = new Map<string, string>();
  for (const [p, q] of Object.entries(sentinels)) if (q) qToP.set(q, p);
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const n = text[i + 1];
    const asSentinel = qToP.get(c);
    if (asSentinel !== undefined && isFoldFollower(n)) {
      out += asSentinel + n;
      i += 1;
      continue;
    }
    if (LEXIS_PUNCT.includes(c as any) && isFoldFollower(n) && !qToP.has(c)) {
      out += c + ' ' + n;
      i += 1;
      continue;
    }
    out += c;
  }
  return out;
}

/* -------------------------------------------------------------------------- */

export interface LexisResult {
  codec: 'lexis';
  /** the wire: folded parent wire */
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  /** tokens of the wire alone */
  outTokens: number;
  /** tokens of the complete one-chat message: contract + wire */
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  /** parent codec that produced the pre-fold wire */
  parent: string;
  /** which composition order won: fold outside the parent, inside it, or not shipped */
  order: 'out' | 'in' | 'none';
  /** everything needed to invert the wire locally */
  decodeConfig: LexisDecodeConfig;
  folds: number;
  dangers: number;
  sentinels: string[];
  ms: number;
  notes: string;
}

export interface LexisParent {
  name: string;
  /** returns the wire and the contract text that must accompany it */
  run: (text: string, enc: EncodingName) => { wire: string; contract: string } | null;
  /** inverse of run().wire -> original text */
  undo: (wire: string) => string;
}

/** The fold's rule, phrased for the two composition orders. Both are 14 tokens. */
export const LEXIS_HEAD = 'First, after . , ; : insert one space unless a space or a line break already follows.';
export const LEXIS_TAIL = 'Finally, after . , ; : insert one space unless a space or a line break already follows.';

function sentinelClause(sentinels: Partial<Record<string, string>>): string {
  const named = Object.entries(sentinels).filter(([, q]) => !!q);
  if (!named.length) return '';
  return ' Also read ' + named.map(([p, q]) => `${q} as ${p} with no space after it`).join(', ') + '.';
}

/**
 * Contract assembly is order-aware, and this is load-bearing: when the fold sits
 * OUTSIDE the parent its inverse must run first, so the rule goes at the head;
 * when it sits INSIDE, the parent's expansion produces folded text and the rule
 * must run last.  Stating it in the wrong position is a decode error, not a
 * style choice.
 */
function lexisContract(
  parentContract: string,
  sentinels: Partial<Record<string, string>>,
  order: 'out' | 'in'
): string {
  const sc = sentinelClause(sentinels);
  if (order === 'out') {
    const head = LEXIS_HEAD + sc;
    return parentContract ? head + ' ' + parentContract : head;
  }
  const tail = LEXIS_TAIL + sc;
  return parentContract ? parentContract + ' ' + tail : tail;
}

/**
 * Wrap a parent codec in the junction fold, in BOTH composition orders.
 *
 *   order 'out'  (fold outside):  text -> parent.encode -> fold
 *                                 fold^-1 -> parent.decode
 *   order 'in'   (fold inside):   fold(text) -> parent.encode
 *                                 parent.decode -> fold^-1
 *
 * No single order is right in general - this is the same lesson SYZEUXIS taught
 * about row-major vs column-major: the fold changes token boundaries, which can
 * help or hurt the parent's rule discovery, so the only honest move is to build
 * both and measure.
 *
 * Ships the fold only when (a) the round trip is byte exact and (b) the
 * measured message cost strictly beats the parent alone.
 */
export function lexisWrap(
  text: string,
  parent: LexisParent,
  enc: EncodingName = 'o200k_base'
): { wire: string; decoded: string; M: number; wireTokens: number; contract: string; parent: string; order: 'out' | 'in' | 'none'; decodeConfig: LexisDecodeConfig; stats: LexisFoldStats; used: boolean } | null {
  const measure = (wire: string, contract: string) => countTokens(wire + '\n' + contract, enc);

  let best: {
    wire: string; decoded: string; M: number; wireTokens: number;
    contract: string; parent: string; order: 'out' | 'in' | 'none';
    decodeConfig: LexisDecodeConfig;
    stats: LexisFoldStats; used: boolean;
  } | null = null;

  // ---- baseline: parent alone
  let pOuter: { wire: string; contract: string } | null = null;
  try {
    pOuter = parent.run(text, enc);
  } catch {
    pOuter = null;
  }
  if (!pOuter) return null;
  const baseM = measure(pOuter.wire, pOuter.contract);
  const baseDecoded = parent.undo(pOuter.wire);
  if (baseDecoded !== text) return null;
  best = {
    wire: pOuter.wire,
    decoded: baseDecoded,
    M: baseM,
    wireTokens: countTokens(pOuter.wire, enc),
    contract: pOuter.contract,
    parent: parent.name,
    order: 'none',
    decodeConfig: { sentinels: {}, parent: parent.name, order: 'none' },
    stats: { folds: 0, dangers: 0, sentinels: {} },
    used: false,
  };

  // ---- order 'out': fold(parent.wire)
  {
    const f = lexisFold(best.wire);
    if (f.stats.folds > 0) {
      const contract = lexisContract(pOuter.contract, f.stats.sentinels, 'out');
      const M = measure(f.text, contract);
      const back = parent.undo(lexisUnfold(f.text, f.stats.sentinels));
      if (back === text && M < best.M) {
        best = {
          wire: f.text, decoded: text, M, wireTokens: countTokens(f.text, enc),
          contract, parent: parent.name, order: 'out',
          decodeConfig: { sentinels: f.stats.sentinels, parent: parent.name, order: 'out' },
          stats: f.stats, used: true,
        };
      }
    }
  }

  // ---- order 'in': parent(fold(text))
  {
    const g = lexisFold(text);
    if (g.stats.folds > 0) {
      let pi: { wire: string; contract: string } | null = null;
      try {
        pi = parent.run(g.text, enc);
      } catch {
        pi = null;
      }
      if (pi) {
        // the fold's rule must be applied AFTER the parent's expansion, so it
        // goes first in the instruction text.
        const contract = lexisContract(pi.contract, g.stats.sentinels, 'in');
        const M = measure(pi.wire, contract);
        const back = lexisUnfold(parent.undo(pi.wire), g.stats.sentinels);
        if (back === text && M < best.M) {
          best = {
            wire: pi.wire, decoded: text, M, wireTokens: countTokens(pi.wire, enc),
            contract, parent: parent.name, order: 'in',
            decodeConfig: { sentinels: g.stats.sentinels, parent: parent.name, order: 'in' },
            stats: g.stats, used: true,
          };
        }
      }
    }
  }

  return best;
}

const IDENTITY_PARENT: LexisParent = {
  name: 'identity',
  run: (t) => ({ wire: t, contract: 'Print the text exactly as given.' }),
  undo: (w) => w,
};

export function lexisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  parents: LexisParent[] = [IDENTITY_PARENT]
): LexisResult {
  const started = now();
  const inTokens = countTokens(text, enc);
  let best: ReturnType<typeof lexisWrap> = null;
  let bestParent = 'identity';
  const log: string[] = [];
  for (const p of parents) {
    let r: ReturnType<typeof lexisWrap> = null;
    try {
      r = lexisWrap(text, p, enc);
    } catch {
      r = null;
    }
    if (!r) {
      log.push(`${p.name}:n/a`);
      continue;
    }
    log.push(`${p.name}:${r.M}${r.used ? '*' : ''}`);
    if (best === null || r.M < best.M) {
      best = r;
      bestParent = p.name;
    }
  }
  if (!best) {
    return {
      codec: 'lexis',
      wire: text,
      decoded: text,
      exact: true,
      inTokens,
      outTokens: inTokens,
      messageTokens: inTokens,
      contractTokens: 0,
      decoderPrompt: text,
      savingsPct: 0,
      parent: 'identity',
      order: 'none',
      decodeConfig: { sentinels: {}, parent: 'identity', order: 'none' },
      folds: 0,
      dangers: 0,
      sentinels: [],
      ms: now() - started,
      notes: 'no parent produced a candidate; shipped identity',
    };
  }
  const wireTokens = best.wireTokens;
  return {
    codec: 'lexis',
    wire: best.wire,
    decoded: best.decoded,
    exact: best.decoded === text,
    inTokens,
    outTokens: wireTokens,
    messageTokens: best.M,
    contractTokens: best.M - wireTokens,
    decoderPrompt: best.wire + '\n' + best.contract,
    savingsPct: inTokens ? Math.round((1 - best.M / inTokens) * 1000) / 10 : 0,
    parent: bestParent,
    order: best.order,
    decodeConfig: best.decodeConfig,
    folds: best.stats.folds,
    dangers: best.stats.dangers,
    sentinels: Object.values(best.stats.sentinels).filter((x): x is string => !!x),
    ms: now() - started,
    notes: `parent=${bestParent}; order=${best.order}; ${best.stats.folds} folds, ${best.stats.dangers} dangers, sentinels=${Object.values(best.stats.sentinels).filter(Boolean).join('') || 'none'}; arms: ${log.join(' ')}`,
  };
}

/**
 * Inverse of each parent's encoder.  Every parent LEXIS ships with is a CHIRON
 * dialect or plain identity, so the whole table is two entries deep.  The
 * *reader* never needs this table - it only needs the contract, which names the
 * parent's own rules; this exists so the repo can verify byte-exactness
 * locally.
 */
export const LEXIS_UNDO: Record<string, (w: string) => string> = {
  identity: (w) => w,
  lakonikos: (w) => chironDecode(w),
  daedalus: (w) => chironDecode(w),
  polytropos: (w) => chironDecode(w),
  aion: (w) => chironDecode(w),
};

export interface LexisDecodeOpts {
  /**
   * sentinel -> punctuation map.  The reader gets this from the contract, which
   * is part of the single chat message, so nothing outside the message is
   * needed.  Omit when the fold used no sentinels.
   */
  sentinels?: Partial<Record<string, string>>;
  /** name of the parent codec; looked up in LEXIS_UNDO */
  parent?: string;
  /** 'none' skips the unfold entirely */
  order?: 'out' | 'in' | 'none';
  /** the parent codec's inverse, if it is not in LEXIS_UNDO */
  parentUndo?: (w: string) => string;
}

/** Everything the repo needs to invert a LEXIS wire. */
export interface LexisDecodeConfig {
  sentinels: Partial<Record<string, string>>;
  parent: string;
  /** 'none' means the fold did not ship: the wire is the parent's plain wire. */
  order: 'out' | 'in' | 'none';
}

/**
 * Total function: unfold the junctions, then hand the result to the parent's
 * inverse.  Any wire is mapped to *some* string; it never invents structure,
 * and when the wire was produced by lexisEncode the result is byte identical.
 */
export function lexisDecode(wire: string, opts: LexisDecodeOpts = {}): string {
  const undo =
    opts.parentUndo ??
    (opts.parent ? LEXIS_UNDO[opts.parent] : undefined) ??
    ((w: string) => w);
  const sent = opts.sentinels ?? {};
  // Composition order is not cosmetic here - it is the difference between an
  // exact and an inexact decode, and the byte-exactness gate caught it:
  //   'none' - the fold did not ship, so the wire carries no folded junctions
  //            and unfolding would INSERT spaces that were never removed.
  //   'out'  - the fold wrapped the parent's wire, so unfold runs first.
  //   'in'   - the parent encoded already-folded text, so the parent's own
  //            expansion must run first and the unfold applies to its output.
  if (opts.order === 'none') return undo(wire);
  if (opts.order === 'in') return lexisUnfold(undo(wire), sent);
  return undo(lexisUnfold(wire, sent));
}
