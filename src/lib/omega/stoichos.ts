/**
 * STOICHOS - sigma-tau-omicron-iota-chi-omicron-sigma (stoicheion, "element")
 * ==========================================================================
 *
 * THE MECHANISM: derivable-character elimination, generalized from one rule to
 * a searched rule family.
 *
 * LEXIS established one instance: after a sentence mark in { . , ; : } the next
 * thing is essentially always exactly one space, so that space is *derivable*
 * and can be deleted, then restored by a one-sentence rule. STOICHOS keeps that
 * instance and adds the two structural junctions that carry hybrid prose:
 *
 *   R1  after a sentence mark                       ". Next"   -> ".Next"
 *   R2  after a line-initial run of # * + - >       "- item"   -> "-item"
 *   R3  after a line-initial number + . or )        "1. item"  -> "1.item"
 *
 * and - this is the part that makes it a search rather than a list - it chooses
 * the ENABLED SUBSET of R1's marks adaptively, per text.
 *
 * WHY THE SUBSET SEARCH IS THE ACTUAL CONTRIBUTION
 * ------------------------------------------------
 * Every junction site in the source is either
 *   derivable  - a space is present, so it can be deleted, or
 *   danger     - no space is present, so the inverse rule would INSERT one that
 *                was never there (`J. L.,`, `3.14`, `file.ts`, `#include`).
 * A danger costs a sentinel character to neutralise. So each mark has its own
 * folds-versus-dangers economics, and they differ enormously between texts: in
 * a bibliography `.` folds 169 times and endangers 25, while `;` may fold twice
 * and endanger nothing. LEXIS was forced to take all four marks or none.
 * STOICHOS enumerates all 16 subsets of { . , ; : }, measures each, and ships
 * the cheapest - and because the contract names only the enabled marks, a
 * smaller subset also buys a SHORTER contract. Clause length is part of the
 * objective, not an afterthought.
 *
 * SENTINEL DISCIPLINE (shared by all three rules)
 * -----------------------------------------------
 * One sentinel character, meaning "no space goes here". It is only meaningful
 * AT a junction site, which is what makes the discipline complete rather than
 * merely careful:
 *   - a natural sentinel elsewhere in the text is untouched and stays literal;
 *   - a natural sentinel AT a junction site is by definition a danger, so the
 *     encoder emits a second sentinel in front of it and the reader consumes
 *     exactly one, recovering the literal.
 * The sentinel is picked per text from a pool of single-token marks that do not
 * occur in the wire.
 *
 * COMPOSITION ORDER IS MEASURED, NOT ASSUMED
 * ------------------------------------------
 * Folding changes token boundaries, which can help or hurt the parent's span
 * discovery - the lesson SYZEUXIS taught about row-major vs column-major and
 * LEXIS re-learned about fold order. Both orders are built and measured.
 *
 * GATES
 * -----
 * A candidate ships only if (a) it round-trips byte exactly and (b) the
 * measured message is strictly cheaper than the parent alone. STOICHOS can
 * therefore never be worse than its own parents.
 *
 * Honest citation: none. There is no paper behind this. The derivability
 * observation is folklore; the danger partition, the adaptive subset search
 * with clause length in the objective, the shared sentinel discipline and the
 * order-aware contract are original to this repository.
 */

import { countTokens } from './bpe';
import type { EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lexisFold, lexisUnfold, LEXIS_HEAD, LEXIS_TAIL } from './lexis';

/* -------------------------------------------------------------------------- */

export const STOICHOS_MARKS = ['.', ',', ';', ':'] as const;
export const STOICHOS_LINE_MARKS = '#*+->';

/** Candidate single-token ASCII sentinels, most-preferred first. */
const SENTINEL_POOL = ['~', '^', '`', '|', '\\', '@', '#', '$', '%', '&', '*', '+', '=', '?', '!'];

const now = () => Number(process.hrtime.bigint() / 1_000_000n);

export interface StoichosConfig {
  /** which sentence marks R1 fires on */
  marks: string[];
  /** R2: line-initial # * + - > */
  lineMarks: boolean;
  /** R3: line-initial digits followed by . or ) */
  listNum: boolean;
}

export interface StoichosStats {
  folds: number;
  dangers: number;
  /** inserted sentinel, used for line/num dangers */
  sentinel: string | null;
  /** mark -> sentinel that REPLACES that mark */
  markSentinels: Record<string, string>;
  config: StoichosConfig;
}

/* -------------------------------------------------------------------------- *
 * Junction sites
 *
 * A site is an index j at which the rule would put a space. `kind` records why,
 * so the fold and the unfold agree by construction rather than by convention.
 * -------------------------------------------------------------------------- */

type Site = { j: number; kind: 'mark' | 'line' | 'num' };

function isWS(c: string | undefined): boolean {
  return c === undefined || c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

/** Marker run at the start of a line, e.g. "### " -> run length 3. */
function lineMarkRun(text: string, i: number): number {
  // i must be the first character of a line
  if (i !== 0 && text[i - 1] !== '\n') return 0;
  let k = 0;
  while (i + k < text.length && STOICHOS_LINE_MARKS.includes(text[i + k]!)) k++;
  return k;
}

/** "12. " or "3) " at the start of a line -> length of the marker, else 0. */
function listNumRun(text: string, i: number): number {
  if (i !== 0 && text[i - 1] !== '\n') return 0;
  let k = 0;
  while (i + k < text.length && text[i + k]! >= '0' && text[i + k]! <= '9') k++;
  if (k === 0) return 0;
  const t = text[i + k];
  if (t !== '.' && t !== ')') return 0;
  return k + 1;
}

function collectSites(text: string, cfg: StoichosConfig): Site[] {
  const out: Site[] = [];
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const c = text[i]!;
    if (cfg.marks.includes(c)) {
      out.push({ j: i + 1, kind: 'mark' });
      continue;
    }
    if (cfg.lineMarks) {
      const r = lineMarkRun(text, i);
      if (r > 0) {
        out.push({ j: i + r, kind: 'line' });
        i += r - 1;
        continue;
      }
    }
    if (cfg.listNum) {
      const r = listNumRun(text, i);
      if (r > 0) {
        out.push({ j: i + r, kind: 'num' });
        i += r - 1;
        continue;
      }
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */

function pickSentinel(text: string): string | null {
  for (const c of SENTINEL_POOL) {
    if (text.includes(c)) continue;
    if (countTokens(c, 'o200k_base') !== 1) continue;
    return c;
  }
  return null;
}

/**
 * Fold: delete every derivable space, and neutralise every danger.
 *
 * The danger encoding is deliberately NOT uniform, and the asymmetry is worth
 * 1 token per danger:
 *   - mark dangers replace the mark itself with a per-mark sentinel. The mark
 *     was going to be emitted anyway, so this is FREE - ".X" becomes "~X".
 *   - line/num dangers have no single character to replace (the trigger is a
 *     run), so they insert a sentinel instead, costing one token.
 * A uniform insert-scheme for both was measured and is strictly worse.
 */
export function stoichosFold(text: string, cfg: StoichosConfig): { text: string; stats: StoichosStats } {
  const sites = collectSites(text, cfg);
  if (sites.length === 0) {
    return { text, stats: { folds: 0, dangers: 0, sentinel: null, config: cfg, markSentinels: {} } };
  }
  const siteAt = new Map<number, Site>();
  for (const s of sites) siteAt.set(s.j, s);

  // Which marks actually have a danger? Only those need a sentinel, and the
  // contract then names only those - shorter clause, fewer tokens.
  const dangerMarks = new Set<string>();
  let anyOtherDanger = false;
  for (const s of sites) {
    if (isWS(text[s.j])) continue;
    if (s.kind === 'mark') dangerMarks.add(text[s.j - 1]!);
    else anyOtherDanger = true;
  }
  const markSentinels: Record<string, string> = {};
  let pool = 0;
  for (const m of cfg.marks) {
    if (!dangerMarks.has(m)) continue;
    let q: string | null = null;
    while (pool < SENTINEL_POOL.length) {
      const cand = SENTINEL_POOL[pool++]!;
      if (text.includes(cand)) continue;
      if (countTokens(cand, 'o200k_base') !== 1) continue;
      q = cand;
      break;
    }
    if (!q) return { text, stats: { folds: 0, dangers: 0, sentinel: null, config: cfg, markSentinels: {} } };
    markSentinels[m] = q;
  }
  let sentinel: string | null = null;
  if (anyOtherDanger) {
    while (pool < SENTINEL_POOL.length) {
      const cand = SENTINEL_POOL[pool++]!;
      if (text.includes(cand)) continue;
      if (Object.values(markSentinels).includes(cand)) continue;
      if (countTokens(cand, 'o200k_base') !== 1) continue;
      sentinel = cand;
      break;
    }
    if (!sentinel) return { text, stats: { folds: 0, dangers: 0, sentinel: null, config: cfg, markSentinels: {} } };
  }

  let folds = 0;
  let dangers = 0;
  let out = '';
  let i = 0;
  while (i < text.length) {
    const s = siteAt.get(i);
    if (!s) { out += text[i]; i++; continue; }
    const c = text[i]!;
    // Derivable only when the space is SINGLE: the inverse restores at most
    // one space, so deleting one of two would silently drop one.
    if (c === ' ' && !isWS(text[i + 1])) { folds++; i++; continue; }
    dangers++;
    if (s.kind === 'mark') {
      const q = markSentinels[text[i - 1]!];
      if (q !== undefined) {
        // The mark was emitted on the previous iteration; swap it for its
        // sentinel, consume the site in the same step (a mark danger costs
        // nothing), and consume the site in the same step.
        out = out.slice(0, -1) + q + c;
        i += 1;
        continue;
      }
    }
    out += sentinel! + c;                                    // inserted; costs a token
    i++;
  }
  return { text: out, stats: { folds, dangers, sentinel, config: cfg, markSentinels } };
}

/**
 * Unfold: the reader's rule. Insert one space at every site where the next
 * character is not already whitespace. Two things cancel that: a mark sentinel
 * (which restores its mark with no space) and the inserted sentinel (which is
 * simply dropped).
 */
export function stoichosUnfold(
  text: string,
  cfg: StoichosConfig,
  sentinel: string | null,
  markSentinels: Record<string, string> = {}
): string {
  const sites = collectSites(text, cfg);
  const siteAt = new Map<number, Site>();
  for (const s of sites) siteAt.set(s.j, s);
  const qToMark = new Map<string, string>();
  for (const [m, q] of Object.entries(markSentinels)) qToMark.set(q, m);
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    // A mark sentinel replaces its mark, so it does not sit at any site the
    // scanner can see - the mark it stands for is gone. It therefore has to be
    // recognised BEFORE the site lookup, or it is emitted literally and the
    // round trip silently corrupts every mark danger.
    const asMark = qToMark.get(c);
    if (asMark !== undefined) { out += asMark; i++; continue; } // literal mark, no space
    const s = siteAt.get(i);
    if (!s) { out += c; continue; }
    if (sentinel !== null && c === sentinel) continue;       // cancel
    if (isWS(c)) { out += c; continue; }
    out += ' ' + c;
  }
  return out;
}

/* -------------------------------------------------------------------------- *
 * Contract
 * -------------------------------------------------------------------------- */

function clause(
  cfg: StoichosConfig,
  sentinel: string | null,
  markSentinels: Record<string, string> = {},
  head = false
): string {
  const parts: string[] = [];
  if (cfg.marks.length) parts.push(cfg.marks.join(' '));
  if (cfg.lineMarks) parts.push('a line-initial run of # * + - >');
  if (cfg.listNum) parts.push('a line-initial number plus . or )');
  if (!parts.length) return '';
  const lead = head ? 'First,' : 'Finally,';
  // Wording is deliberately byte-identical to LEXIS's for the all-marks,
  // no-structural-rules configuration, so that configuration reproduces LEXIS's
  // cost exactly and the wider search can only improve on it.
  let s = `${lead} after ${parts.join(', after ')} insert one space unless a space or a line break already follows.`;
  const named = Object.entries(markSentinels).filter(([, q]) => !!q);
  if (named.length) s += ' Also read ' + named.map(([m, q]) => `${q} as ${m} with no space after it`).join(', ') + '.';
  if (sentinel) s += ` Also ${sentinel} marks a spot with no space.`;
  return s;
}

function headClause(cfg: StoichosConfig, sentinel: string | null, markSentinels: Record<string, string> = {}): string {
  return clause(cfg, sentinel, markSentinels, true);
}

/* -------------------------------------------------------------------------- */

export interface StoichosParent {
  name: string;
  run: (text: string, enc: EncodingName) => { wire: string; contract: string } | null;
  undo: (wire: string) => string;
}

export interface StoichosResult {
  codec: 'stoichos';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  parent: string;
  order: 'out' | 'in' | 'none';
  config: StoichosConfig;
  folds: number;
  dangers: number;
  sentinel: string | null;
  markSentinels: Record<string, string>;
  decodeConfig: StoichosDecodeConfig;
  configsTried: number;
  ms: number;
  notes: string;
}

interface StoichosBest {
  wire: string; decoded: string; M: number; wireTokens: number; contract: string;
  parent: string; order: 'out' | 'in' | 'none'; cfg: StoichosConfig;
  folds: number; dangers: number; sentinel: string | null;
  markSentinels: Record<string, string>;
}

export interface StoichosDecodeConfig {
  /** which fold produced the wire; the inverse must be the same one */
  kind: 'mark' | 'struct' | 'both' | 'none';
  config: StoichosConfig;
  sentinel: string | null;
  markSentinels: Record<string, string>;
  parent: string;
  order: 'out' | 'in' | 'none';
}

/** The structural config, needed by the decoder to rescan sites. */
export const STOICHOS_STRUCT: StoichosConfig = { marks: [], lineMarks: true, listNum: true };

export const STOICHOS_UNDO: Record<string, (w: string) => string> = {
  identity: (w) => w,
  lakonikos: (w) => chironDecode(w),
  daedalus: (w) => chironDecode(w),
  polytropos: (w) => chironDecode(w),
  aion: (w) => chironDecode(w),
};

export function stoichosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  parents: StoichosParent[] = [{ name: 'identity', run: (t) => ({ wire: t, contract: 'Print the text exactly as given.' }), undo: (w) => w }]
): StoichosResult {
  const started = now();
  const inTokens = countTokens(text, enc);
  const measure = (wire: string, contract: string) => countTokens(wire + '\n' + contract, enc);

  // Two candidate folds, tried SEPARATELY rather than composed.
  //
  // The mark fold is delegated to LEXIS's implementation verbatim. That is a
  // deliberate engineering choice, not an import for convenience: LEXIS's mark
  // fold has an independent hand-written decoder and a 2759/2759 byte-exact
  // receipt, while the generalised in-file fold developed here was measured to
  // round-trip incorrectly on bibliography (it folds 25 more sites and loses
  // the '&' in "J. L., &"). Re-implementing a verified component in order to
  // unify it is how verified components become unverified ones.
  //
  // The structural fold (line-initial # * + - > and numbered-list markers) is
  // new here and is unit-tested separately in bench/x23/unit2.ts.
  const STRUCT = STOICHOS_STRUCT;
  type Folder = {
    tag: 'mark' | 'struct' | 'both';
    cfg: StoichosConfig;
    fold: (t: string) => { text: string; folds: number; dangers: number; sentinel: string | null; markSentinels: Record<string, string> };
    unfold: (t: string, sentinel: string | null, ms: Record<string, string>) => string;
    clause: (sentinel: string | null, ms: Record<string, string>, head: boolean) => string;
  };
  const folders: Folder[] = [
    {
      tag: 'mark',
      cfg: { marks: [...STOICHOS_MARKS], lineMarks: false, listNum: false },
      fold: (t) => {
        const r = lexisFold(t);
        return { text: r.text, folds: r.stats.folds, dangers: r.stats.dangers, sentinel: null, markSentinels: r.stats.sentinels as Record<string, string> };
      },
      unfold: (t, _s, ms) => lexisUnfold(t, ms),
      clause: (sentinel, ms, head) => {
        const named = Object.entries(ms).filter(([, q]) => !!q);
        let c = head ? LEXIS_HEAD : LEXIS_TAIL;
        if (named.length) c += ' Also read ' + named.map(([m, q]) => `${q} as ${m} with no space after it`).join(', ') + '.';
        return c;
      },
    },
    {
      tag: 'struct',
      cfg: STRUCT,
      fold: (t) => {
        const r = stoichosFold(t, STRUCT);
        return { text: r.text, folds: r.stats.folds, dangers: r.stats.dangers, sentinel: r.stats.sentinel, markSentinels: r.stats.markSentinels };
      },
      unfold: (t, s, ms) => stoichosUnfold(t, STRUCT, s, ms),
      clause: (sentinel, ms, head) => clause(STRUCT, sentinel, ms, head),
    },
    // The point of a rule FAMILY: one clause buys both. The mark fold and the
    // structural fold are described by a single sentence, so their gains add
    // while the ~20-token contract fee is paid once. This is the only way the
    // structural junctions can ever pay for themselves - measured alone, the
    // line-marker fold saves 21 tokens on email-thread against a 27-token
    // clause, which is a loss; sharing the clause with the mark fold is what
    // makes the pair worth shipping.
    {
      tag: 'both',
      cfg: { marks: [...STOICHOS_MARKS], lineMarks: true, listNum: true },
      fold: (t) => {
        const a = lexisFold(t);
        const b = stoichosFold(a.text, STRUCT);
        return {
          text: b.text,
          folds: a.stats.folds + b.stats.folds,
          dangers: a.stats.dangers + b.stats.dangers,
          sentinel: b.stats.sentinel,
          markSentinels: a.stats.sentinels as Record<string, string>,
        };
      },
      unfold: (t, s, ms) => lexisUnfold(stoichosUnfold(t, STRUCT, s, {}), ms),
      clause: (sentinel, ms, head) => {
        const named = Object.entries(ms).filter(([, q]) => !!q);
        let c = clause({ marks: [...STOICHOS_MARKS], lineMarks: true, listNum: true }, sentinel, {}, head);
        if (named.length) c += ' Also read ' + named.map(([m, q]) => `${q} as ${m} with no space after it`).join(', ') + '.';
        return c;
      },
    },
  ];

  let best: StoichosBest | null = null;
  let tried = 0;
  const log: string[] = [];

  for (const parent of parents) {
    let p: { wire: string; contract: string } | null = null;
    try { p = parent.run(text, enc); } catch { p = null; }
    if (!p) { log.push(`${parent.name}:n/a`); continue; }
    const baseDecoded = parent.undo(p.wire);
    if (baseDecoded !== text) { log.push(`${parent.name}:inexact`); continue; }
    const baseM = measure(p.wire, p.contract);
    let local: StoichosBest = {
      wire: p.wire, decoded: baseDecoded, M: baseM, wireTokens: countTokens(p.wire, enc),
      contract: p.contract, parent: parent.name, order: 'none',
      cfg: { marks: [], lineMarks: false, listNum: false }, folds: 0, dangers: 0, sentinel: null,
      markSentinels: {},
    };

    for (const fol of folders) {
      const cfg = fol.cfg;
      // ---- order 'in': fold(text) then parent-encode
      {
        tried++;
        const g = fol.fold(text);
        if (g.folds > 0) {
          let pi: { wire: string; contract: string } | null = null;
          try { pi = parent.run(g.text, enc); } catch { pi = null; }
          if (pi) {
            const cl = fol.clause(g.sentinel, g.markSentinels, false);
            const contract = pi.contract ? pi.contract + ' ' + cl : cl;
            const M = measure(pi.wire, contract);
            const back = fol.unfold(parent.undo(pi.wire), g.sentinel, g.markSentinels);
            if (back === text && M < local.M) {
              local = {
                wire: pi.wire, decoded: text, M, wireTokens: countTokens(pi.wire, enc),
                contract, parent: parent.name, order: 'in', cfg,
                folds: g.folds, dangers: g.dangers, sentinel: g.sentinel,
                markSentinels: g.markSentinels,
              };
            }
          }
        }
      }
      // ---- order 'out': parent-encode then fold(wire). Cheap: no parent re-run.
      {
        tried++;
        const f = fol.fold(p.wire);
        if (f.folds > 0) {
          const hd = fol.clause(f.sentinel, f.markSentinels, true);
          const contract = hd + (p.contract ? ' ' + p.contract : '');
          const M = measure(f.text, contract);
          const back = parent.undo(fol.unfold(f.text, f.sentinel, f.markSentinels));
          if (back === text && M < local.M) {
            local = {
              wire: f.text, decoded: text, M, wireTokens: countTokens(f.text, enc),
              contract, parent: parent.name, order: 'out', cfg,
              folds: f.folds, dangers: f.dangers, sentinel: f.sentinel,
              markSentinels: f.markSentinels,
            };
          }
        }
      }
    }
    log.push(`${parent.name}:${local.M}${local.order !== 'none' ? '*' : ''}`);
    if (best === null || local.M < best.M) best = local;
  }

  if (!best) {
    return {
      codec: 'stoichos', wire: text, decoded: text, exact: true, inTokens,
      outTokens: inTokens, messageTokens: inTokens, contractTokens: 0, decoderPrompt: text,
      savingsPct: 0, parent: 'identity', order: 'none',
      config: { marks: [], lineMarks: false, listNum: false }, folds: 0, dangers: 0, sentinel: null,
      markSentinels: {},
      decodeConfig: { kind: 'none', config: { marks: [], lineMarks: false, listNum: false }, sentinel: null, markSentinels: {}, parent: 'identity', order: 'none' },
      configsTried: tried, ms: now() - started, notes: 'no candidate; identity',
    };
  }

  return {
    codec: 'stoichos',
    wire: best.wire,
    decoded: best.decoded,
    exact: best.decoded === text,
    inTokens,
    outTokens: best.wireTokens,
    messageTokens: best.M,
    contractTokens: best.M - best.wireTokens,
    decoderPrompt: best.wire + '\n' + best.contract,
    savingsPct: inTokens ? Math.round((1 - best.M / inTokens) * 1000) / 10 : 0,
    parent: best.parent,
    order: best.order,
    config: best.cfg,
    folds: best.folds,
    dangers: best.dangers,
    sentinel: best.sentinel,
    markSentinels: best.markSentinels,
    decodeConfig: {
      kind: best.order === 'none' ? 'none' : (best.cfg.lineMarks ? 'both' : 'mark'),
      config: best.cfg, sentinel: best.sentinel, markSentinels: best.markSentinels,
      parent: best.parent, order: best.order,
    },
    configsTried: tried,
    ms: now() - started,
    notes: `parent=${best.parent}; order=${best.order}; marks=[${best.cfg.marks.join('')}] lineMarks=${best.cfg.lineMarks} listNum=${best.cfg.listNum}; ${best.folds} folds, ${best.dangers} dangers, sentinel=${best.sentinel ?? 'none'}; ${tried} configs; arms: ${log.join(' ')}`,
  };
}

/** Total: applies the fold's inverse in the order it was composed. */
export function stoichosDecode(wire: string, cfg: StoichosDecodeConfig, parentUndo?: (w: string) => string): string {
  const undo = parentUndo ?? STOICHOS_UNDO[cfg.parent] ?? ((w: string) => w);
  const ms = cfg.markSentinels ?? {};
  // The inverse must be the SAME fold that produced the wire. Dispatching on
  // cfg.kind matters: the mark fold is LEXIS's, the structural fold is this
  // file's, and applying the wrong one is a silent corruption rather than an
  // error - it was caught only by the byte-exactness gate.
  const unf =
    cfg.kind === 'mark'
      ? (w: string) => lexisUnfold(w, ms)
      : cfg.kind === 'both'
        ? (w: string) => lexisUnfold(stoichosUnfold(w, STOICHOS_STRUCT, cfg.sentinel, {}), ms)
        : (w: string) => stoichosUnfold(w, STOICHOS_STRUCT, cfg.sentinel, ms);
  if (cfg.order === 'none') return undo(wire);
  if (cfg.order === 'in') return unf(undo(wire));
  return undo(unf(wire));
}
