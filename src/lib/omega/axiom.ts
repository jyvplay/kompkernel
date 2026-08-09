/**
 * ⟦ AXIOM-A1 ⟧ — Session-Anchored Cascade Binding with Zero-Amortization Recall
 * =============================================================================
 * THE GAP EVERY PRIOR CODEC LEAVES OPEN
 * -----------------------------------------------------------------------------
 * Surveyed (2023–2026): Selective-Context EMNLP-2023; LLMLingua/LongLLMLingua;
 * CompactPrompt-2025; LTSC arXiv:2506.00307; Dictionary-Encoding+ICL
 * arXiv:2604.13066; LoPace arXiv:2602.13266; GN/GCdict (Apr 2026); LCM
 * (Voltropy); and in-repo VERITAS-VX, QUASAR, HELIX, MERIDIAN, PLEXUS,
 * ANAPHORA, PULSE, SEAMFOLD, ORBIT.
 *
 * Every one of them amortizes a definition INSIDE THE CURRENT MESSAGE. A phrase
 * must repeat ≥2× *now* to pay for its own binder/header row. That admission
 * floor — (n−1)·(w−A) > D — is the single dominant loss term on real agent
 * traffic, where most repetition is ACROSS turns, not within one turn.
 *
 * GN/GCdict (the only cross-turn system found) uses history as a deflate preset
 * dictionary: byte-level, requires a decompressor program, and is NOT readable
 * by the model. LCM keeps lossless pointers but needs an engine + database and
 * puts lossy summaries in the active context. Neither is an in-context,
 * token-exact, LLM-readable wire.
 *
 * AXIOM'S CLAIM (proved below, measured in code):
 *   A phrase already bound in an EARLIER turn of the same conversation needs
 *   NO definition in this turn. The definition is already in the model's
 *   context window — it was read once and is still there. Recalling it costs
 *   exactly ONE token and amortizes over ZERO occurrences.
 *
 * ADMISSION ALGEBRA (real o200k tokens; A = 1 for a single-token ideograph)
 *   header dictionary : gain = n·w − (w + h) − n·A          n ≥ 2 required
 *   in-place binding  : gain = n·w − (w + D) − (n−1)·A      n ≥ 2 required
 *   AXIOM recall      : gain = n·(w − A)                    n ≥ 1 SUFFICES
 * At n = 1, w = 6: header −7, in-place −4, AXIOM **+5**. The floor is gone.
 * Long-tail single-occurrence spans — the majority of an agent transcript —
 * become compressible for the first time.
 *
 * THREE PRIMITIVES
 *   P1 RECALL   bare label k for a phrase bound in a previous turn. No binder
 *               emitted. Zero header. Admission threshold n ≥ 1.
 *   P2 CASCADE  new phrases bind in place (OPEN k P CLOSE) and are re-mined
 *               after every accept, so second-order spans over fresh labels
 *               become visible (PLEXUS lane, retained and re-measured).
 *   P3 LEDGER   every accepted bind is published to a persistent ledger keyed
 *               by a deterministic single-token ideograph, so the NEXT turn
 *               starts with P1 already loaded. Ledger grows monotonically and
 *               is capped by measured lifetime value, not recency.
 * All three are then entered into a real-BPE tournament against HELIX
 * (arithmetic runs) and PULSE (code-unit runs) so AXIOM is general, never a
 * narrow lane: it can only ever return the measured argmin.
 *
 * WIRE
 *   [AX1]
 *   <OPEN><CLOSE>
 *   <body>            OPEN k P CLOSE = bind k := P here; bare k = recall k
 *
 * Recalled labels carry no binder; the decoder resolves them from the ledger
 * (equivalently: the model resolves them from earlier turns it already read).
 *
 * EXACTNESS
 *   G1 encoder runs its own decoder with the same ledger and byte-compares.
 *   G2 outTokens < inTokens measured on the assembled wire, else identity.
 *   G3 no estimator anywhere; every number is gpt-tokenizer output.
 *   G4 labels are drawn only from ideographs provably ABSENT from the input,
 *      and ledger labels colliding with input characters are dropped, so no
 *      escaping is ever required and substitution is confluent.
 *
 * HAND-TRACE — 300-char hetero (prose + JSON + CSV + grid + code + chat log),
 * AXIOM_HANDTRACE_300, turn 2 of a session whose turn 1 bound
 * 一A"Ship it: retry 3x, never log secrets."丁 and 一B"assistant: I will inspect
 * the suite and patch the race."丁 :
 *   (a) RECALL fires on both prose line (w≈11) and the chat line (w≈12) even
 *       though each occurs ONCE more here. Gain = 11−1 + 12−1 = +21 tokens
 *       that every prior codec in this repo scores as 0 (n=1 → rejected).
 *   (b) CASCADE binds `,"ok":true}` (2×) and `##..##\n` (2×) in place.
 *   (c) HELIX finds no run ≥3 with a shared delimiter → identity on that lane.
 *   (d) PULSE finds no unit run ≥4 → identity on that lane.
 *   (e) Tournament emits the AXIOM wire; decode with ledger == original bytes.
 *   On a cold session (empty ledger) AXIOM degrades exactly to the cascade
 *   in-place lane, so it is never worse than PLEXUS/ANAPHORA — the Pareto
 *   guarantee holds in both regimes.
 * =============================================================================
 */
import { countTokens, tokenStrings, encodeIds, type EncodingName } from './bpe';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';
import { pulseEncode, pulseDecode } from './pulse';
import { anaphoraEncode } from './anaphora';
import { tesseraEncode, tesseraDecode } from './tessera';
import { strataEncode, strataDecode } from './strata';
import { signetEncode, signetDecode } from './signet';
import { anaphoraDecode as peelBinder } from './anaphora';

export interface AxiomEntry {
  key: string;
  phrase: string;
  hits: number;
  spanTokens: number;
  source: 'recall' | 'bind';
}

export interface AxiomLedgerEntry {
  key: string;
  phrase: string;
  uses: number;
  tokens: number;
}

export interface AxiomResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: AxiomEntry[];
  recalled: number;
  bound: number;
  mode: 'axiom' | 'helix' | 'pulse' | 'tessera' | 'strata' | 'signet' | 'identity' | 'forced-wrap';
  notes: string;
  ledgerAfter: AxiomLedgerEntry[];
  encodeMs: number;
}

const SENTINEL = '[AX1]\n';
const LEDGER_KEY = 'omega_axiom_ledger_v1';
const MAX_LEDGER = 96;
const MAX_ROUNDS = 24;
const MAX_ENTRIES = 160;
const MAX_MINE_TOKENS = 200_000;
const MAX_NGRAM_WIDTH = 6;
const TOP_CANDS = 48;
const MIN_RECALL_TOKENS = 2;

const poolCache = new Map<EncodingName, string[]>();

function ideographPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x4e00; cp <= 0x9fff && out.length < 900; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc).length === 1) out.push(ch);
  }
  poolCache.set(enc, out);
  return out;
}

/* ------------------------------- ledger I/O ------------------------------- */

export function loadAxiomLedger(): AxiomLedgerEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AxiomLedgerEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.key === 'string' && typeof e.phrase === 'string') : [];
  } catch {
    return [];
  }
}

export function saveAxiomLedger(entries: AxiomLedgerEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, MAX_LEDGER)));
  } catch {
    /* quota */
  }
}

export function clearAxiomLedger(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(LEDGER_KEY);
  } catch {
    /* ignore */
  }
}

/* --------------------------------- decode --------------------------------- */

function bodyDecode(src: string, OPEN: string, CLOSE: string, seed: Map<string, string>): string | null {
  const dict = new Map<string, string>(seed);
  const stack: { key: string; buf: string }[] = [];
  let cur = { key: '', buf: '' };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === OPEN) {
      const k = src[i + 1];
      if (k === undefined) return null;
      stack.push(cur);
      cur = { key: k, buf: '' };
      i++;
      continue;
    }
    if (c === CLOSE) {
      const parent = stack.pop();
      if (!parent) return null;
      dict.set(cur.key, cur.buf);
      parent.buf += cur.buf;
      cur = parent;
      continue;
    }
    const bound = dict.get(c);
    if (bound !== undefined) {
      cur.buf += bound;
      continue;
    }
    cur.buf += c;
  }
  if (stack.length !== 0) return null;
  return cur.buf;
}

/**
 * Total decoder.
 *
 * CONTRACT: this must decode EVERY wire axiomEncode can emit. AXIOM is a
 * tournament, so its output may be a wire from any admitted lane; a decoder
 * that only understood AX1 silently failed the round-trip on tournament wins
 * (caught by the X5/X6 regression the moment the TESSERA lane was added).
 * Dispatch on the sentinel, then fall through to the inline lanes.
 */
export function axiomDecode(wire: string, ledger: AxiomLedgerEntry[] = []): string {
  if (wire.startsWith('[SG1]\n')) return signetDecode(wire);
  if (wire.startsWith('[ST1]\n')) return strataDecode(wire);
  if (wire.startsWith('[TS1]\n')) return tesseraDecode(wire);
  if (wire.startsWith('[AN1]\n')) {
    // A binder wrapper can enclose EITHER a TS1 or an ST1 body, so the inner
    // sentinel must be re-dispatched rather than assumed. Peeling first and
    // recursing keeps one authoritative decoder for every wire AXIOM emits.
    const peeled = peelBinder(wire);
    return peeled === wire ? wire : axiomDecode(peeled, ledger);
  }
  if (!wire.startsWith(SENTINEL)) return helixDecode(pulseDecode(wire));
  const rest = wire.slice(SENTINEL.length);
  const OPEN = rest[0];
  const CLOSE = rest[1];
  if (OPEN === undefined || CLOSE === undefined || rest[2] !== '\n') return wire;
  const seed = new Map<string, string>();
  for (const e of ledger) seed.set(e.key, e.phrase);
  const decoded = bodyDecode(rest.slice(3), OPEN, CLOSE, seed);
  if (decoded === null) return wire;
  return helixDecode(decoded);
}

/* --------------------------------- encode --------------------------------- */

function countEligible(src: string, phrase: string, OPEN: string): number {
  let n = 0;
  let idx = 0;
  while ((idx = src.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    n++;
    idx += phrase.length;
  }
  return n;
}

function replaceEligible(src: string, phrase: string, out1: string, outN: string, OPEN: string): string {
  let out = '';
  let last = 0;
  let idx = 0;
  let first = true;
  while ((idx = src.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    out += src.slice(last, idx);
    out += first ? out1 : outN;
    first = false;
    idx += phrase.length;
    last = idx;
  }
  return out + src.slice(last);
}

interface CoreOut {
  wire: string;
  entries: AxiomEntry[];
  recalled: number;
  bound: number;
  ledgerAfter: AxiomLedgerEntry[];
  ok: boolean;
}

function axiomCore(text: string, enc: EncodingName, ledger: AxiomLedgerEntry[]): CoreOut {
  const fail: CoreOut = { wire: text, entries: [], recalled: 0, bound: 0, ledgerAfter: ledger, ok: false };
  const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (pool.length < 4) return fail;

  const OPEN = pool[0];
  const CLOSE = pool[1];
  const used = new Set<string>([OPEN, CLOSE]);

  // P1 RECALL — ledger labels valid only if key & phrase are collision-free.
  const usableLedger = ledger.filter(
    (e) =>
      e.key !== OPEN &&
      e.key !== CLOSE &&
      text.indexOf(e.key) === -1 &&
      e.phrase.indexOf(OPEN) === -1 &&
      e.phrase.indexOf(CLOSE) === -1 &&
      e.phrase.length > 0,
  );
  for (const e of usableLedger) used.add(e.key);
  const freeKeys = pool.filter((ch) => !used.has(ch));

  const D = countTokens(OPEN + (freeKeys[0] ?? pool[2]) + CLOSE, enc);
  const A = countTokens(freeKeys[0] ?? pool[2], enc);

  let body = text;
  const entries: AxiomEntry[] = [];
  const seed = new Map<string, string>();
  let recalled = 0;

  // Longest phrases first: a recall of a long span dominates its sub-spans.
  const recallOrder = [...usableLedger].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const e of recallOrder) {
    const w = countTokens(e.phrase, enc);
    if (w < MIN_RECALL_TOKENS) continue;
    const n = countEligible(body, e.phrase, OPEN);
    if (n < 1) continue;
    // n ≥ 1 suffices: definition already exists in the conversation.
    if (n * (w - A) <= 0) continue;
    const next = replaceEligible(body, e.phrase, e.key, e.key, OPEN);
    body = next;
    seed.set(e.key, e.phrase);
    entries.push({ key: e.key, phrase: e.phrase, hits: n, spanTokens: w, source: 'recall' });
    recalled += n;
  }

  // P2 CASCADE — mine, bind in place, re-tokenize, repeat.
  let keyIdx = 0;
  let bestBody = body;
  let bestEntries = entries.slice();
  let bestTok = countTokens(SENTINEL + OPEN + CLOSE + '\n' + body, enc);

  for (let round = 0; round < MAX_ROUNDS && keyIdx < freeKeys.length && entries.length < MAX_ENTRIES; round++) {
    const toks = tokenStrings(body, enc);
    const T = Math.min(toks.length, MAX_MINE_TOKENS);
    if (T < 2) break;

    interface Cand {
      span: string;
      width: number;
      freq: number;
    }
    const seen = new Set<string>();
    const cands: Cand[] = [];
    for (let n = 2; n <= Math.min(MAX_NGRAM_WIDTH, T); n++) {
      const counts = new Map<string, { count: number; first: number }>();
      for (let i = 0; i + n <= T; i++) {
        let k = '';
        for (let j = 0; j < n; j++) k += toks[i + j].id + ':';
        const e = counts.get(k);
        if (e) e.count++;
        else counts.set(k, { count: 1, first: i });
      }
      for (const [, info] of counts) {
        if (info.count < 2) continue;
        let span = '';
        for (let j = 0; j < n; j++) span += toks[info.first + j].s;
        if (span.length < 2 || seen.has(span)) continue;
        if (span.indexOf(OPEN) !== -1 || span.indexOf(CLOSE) !== -1) continue;
        if (span.indexOf('\uFFFD') !== -1 && text.indexOf('\uFFFD') === -1) continue;
        seen.add(span);
        cands.push({ span, width: n, freq: info.count });
      }
    }
    if (cands.length === 0) break;
    cands.sort((a, b) => b.freq * (b.width - 1) - a.freq * (a.width - 1));

    let accepted = false;
    const cur = countTokens(SENTINEL + OPEN + CLOSE + '\n' + body, enc);
    for (const cand of cands.slice(0, TOP_CANDS)) {
      if (keyIdx >= freeKeys.length) break;
      const hits = countEligible(body, cand.span, OPEN);
      if (hits < 2) continue;
      if ((hits - 1) * (cand.width - A) - D <= 0) continue;
      const key = freeKeys[keyIdx];
      const next = replaceEligible(body, cand.span, OPEN + key + cand.span + CLOSE, key, OPEN);
      const nextWire = SENTINEL + OPEN + CLOSE + '\n' + next;
      if (countTokens(nextWire, enc) >= cur) continue;
      if (bodyDecode(next, OPEN, CLOSE, seed) !== text) continue;
      body = next;
      entries.push({ key, phrase: cand.span, hits, spanTokens: cand.width, source: 'bind' });
      keyIdx++;
      accepted = true;
      const wt = countTokens(SENTINEL + OPEN + CLOSE + '\n' + body, enc);
      if (wt < bestTok) {
        bestTok = wt;
        bestBody = body;
        bestEntries = entries.slice();
      }
      break;
    }
    if (!accepted) break;
  }

  body = bestBody;
  const finalEntries = bestEntries;
  if (finalEntries.length === 0) return fail;

  const wire = SENTINEL + OPEN + CLOSE + '\n' + body;
  if (bodyDecode(body, OPEN, CLOSE, seed) !== text) return fail;

  // P3 LEDGER — publish binds; keep by measured lifetime value.
  const map = new Map<string, AxiomLedgerEntry>();
  for (const e of ledger) map.set(e.key, { ...e });
  for (const e of finalEntries) {
    const prev = map.get(e.key);
    const tokens = countTokens(e.phrase, enc);
    if (prev && prev.phrase === e.phrase) {
      prev.uses += e.hits;
      prev.tokens = tokens;
    } else if (!prev) {
      map.set(e.key, { key: e.key, phrase: e.phrase, uses: e.hits, tokens });
    }
  }
  const ledgerAfter = [...map.values()]
    .sort((a, b) => b.uses * b.tokens - a.uses * a.tokens)
    .slice(0, MAX_LEDGER);

  const bound = finalEntries.filter((e) => e.source === 'bind').length;
  return { wire, entries: finalEntries, recalled, bound, ledgerAfter, ok: true };
}

/**
 * P3 HARVEST — publish high-value spans to the ledger REGARDLESS of which lane
 * won this turn. Recall value is a property of the conversation, not of whether
 * this particular message happened to compress. Without this, a turn that emits
 * identity teaches the session nothing and cross-turn recall never starts.
 */
function harvestLedger(
  text: string,
  enc: EncodingName,
  ledger: AxiomLedgerEntry[],
  extra: AxiomEntry[],
): AxiomLedgerEntry[] {
  const map = new Map<string, AxiomLedgerEntry>();
  const byPhrase = new Map<string, AxiomLedgerEntry>();
  for (const e of ledger) {
    map.set(e.key, { ...e });
    byPhrase.set(e.phrase, map.get(e.key)!);
  }

  const candidates: { phrase: string; hits: number }[] = extra.map((e) => ({
    phrase: e.phrase,
    hits: e.hits,
  }));

  // Line-level spans: the dominant recall unit in chat transcripts and logs.
  if (text.length <= 400_000) {
    const counts = new Map<string, number>();
    for (const line of text.split('\n')) {
      if (line.length < 8) continue;
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    for (const [line, n] of counts) candidates.push({ phrase: line, hits: n });
  }

  const pool = ideographPool(enc);
  const taken = new Set<string>(map.keys());
  const scored = candidates
    .filter((c) => c.phrase.length >= 8)
    .map((c) => ({ ...c, tokens: countTokens(c.phrase, enc) }))
    .filter((c) => c.tokens >= MIN_RECALL_TOKENS + 1)
    .sort((a, b) => b.tokens * b.hits - a.tokens * a.hits);

  for (const c of scored) {
    if (map.size >= MAX_LEDGER) break;
    const prev = byPhrase.get(c.phrase);
    if (prev) {
      prev.uses += c.hits;
      continue;
    }
    const key = pool.find((ch) => !taken.has(ch) && text.indexOf(ch) === -1);
    if (!key) break;
    taken.add(key);
    const entry: AxiomLedgerEntry = { key, phrase: c.phrase, uses: c.hits, tokens: c.tokens };
    map.set(key, entry);
    byPhrase.set(c.phrase, entry);
  }

  return [...map.values()].sort((a, b) => b.uses * b.tokens - a.uses * a.tokens).slice(0, MAX_LEDGER);
}

export function axiomEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  ledger: AxiomLedgerEntry[] = [],
): AxiomResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AxiomResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    recalled: 0,
    bound: 0,
    mode: 'identity',
    notes,
    ledgerAfter: ledger,
    encodeMs: ms(),
  });
  if (!text) return identity('empty');

  const core = axiomCore(text, enc, ledger);
  const h = helixEncode(text, enc);
  const p = pulseEncode(text, enc);
  // Char-augmented in-place miner: catches mid-token spans the token-aligned
  // cascade cannot see. Without it AXIOM loses hand-trace-shaped inputs.
  const an = anaphoraEncode(text, enc);
  // Columnar transposition lane: raises the ceiling on record-structured input
  // (logs, CSV, grids, transcripts) that no substitution lane can reach.
  const ts = tesseraEncode(text, enc);
  // Typed-column lane: refines TESSERA by replacing literal column enumerations
  // with closed-form column rules wherever the tokenizer says they are cheaper.
  const st = strataEncode(text, enc);
  // Class-signature lane: same typed column coders, but families are found by
  // character-class signature instead of LCS, so digit fields stay whole.
  const sg = signetEncode(text, enc);
  const harvested = harvestLedger(text, enc, core.ok ? core.ledgerAfter : ledger, core.entries);

  type Cand = {
    wire: string;
    mode: AxiomResult['mode'];
    entries: AxiomEntry[];
    recalled: number;
    bound: number;
    ledgerAfter: AxiomLedgerEntry[];
    /** Each lane is verified with ITS OWN decoder; a wire from a foreign
     *  sentinel must not be judged by the AX1 parser (that silently rejects
     *  otherwise-winning lanes — caught by the hand-trace regression). */
    verify?: (w: string) => string;
  };
  const cands: Cand[] = [
    { wire: text, mode: 'identity', entries: [], recalled: 0, bound: 0, ledgerAfter: ledger },
  ];
  if (core.ok) {
    cands.push({
      wire: core.wire,
      mode: 'axiom',
      entries: core.entries,
      recalled: core.recalled,
      bound: core.bound,
      ledgerAfter: core.ledgerAfter,
    });
  }
  if (h.mode === 'factored') {
    cands.push({ wire: h.wire, mode: 'helix', entries: [], recalled: 0, bound: 0, ledgerAfter: ledger });
  }
  if (p.mode === 'pulse') {
    cands.push({ wire: p.wire, mode: 'pulse', entries: [], recalled: 0, bound: 0, ledgerAfter: ledger });
  }
  if (an.mode === 'anaphoric' && an.wire.startsWith('[AN1]\n')) {
    // Re-frame the AN1 body under the AX1 sentinel: the binder grammar is
    // identical, so this is a pure header swap and keeps ONE decoder
    // authoritative for every wire AXIOM can emit (no foreign-sentinel gate).
    const reframed = SENTINEL + an.wire.slice('[AN1]\n'.length);
    cands.push({
      wire: reframed,
      mode: 'axiom',
      entries: an.entries.map((e) => ({
        key: e.key,
        phrase: e.phrase,
        hits: e.hits,
        spanTokens: e.winTokens,
        source: 'bind' as const,
      })),
      recalled: 0,
      bound: an.entries.length,
      ledgerAfter: ledger,
    });
  }
  if (ts.mode === 'tessera') {
    cands.push({
      wire: ts.wire,
      mode: 'tessera',
      entries: [],
      recalled: 0,
      bound: 0,
      ledgerAfter: ledger,
      verify: tesseraDecode,
    });
  }
  if (st.mode === 'strata') {
    cands.push({
      wire: st.wire,
      mode: 'strata',
      entries: [],
      recalled: 0,
      bound: 0,
      ledgerAfter: ledger,
      verify: strataDecode,
    });
  }
  if (sg.mode === 'signet') {
    cands.push({
      wire: sg.wire,
      mode: 'signet',
      entries: [],
      recalled: 0,
      bound: 0,
      ledgerAfter: ledger,
      verify: signetDecode,
    });
  }
  // Compose: AXIOM body then HELIX over the body (arithmetic inside bound text).
  if (core.ok) {
    const nl = core.wire.indexOf('\n', SENTINEL.length);
    if (nl > 0) {
      const head = core.wire.slice(0, nl + 1);
      const b = core.wire.slice(nl + 1);
      const h2 = helixEncode(b, enc);
      if (h2.mode === 'factored') {
        cands.push({
          wire: head + h2.wire,
          mode: 'axiom',
          entries: core.entries,
          recalled: core.recalled,
          bound: core.bound,
          ledgerAfter: core.ledgerAfter,
        });
      }
    }
  }

  let best = cands[0];
  let bestTok = inTokens;
  for (const c of cands) {
    const dec = c.verify ? c.verify(c.wire) : axiomDecode(c.wire, ledger);
    if (dec !== text) continue;
    const tok = countTokens(c.wire, enc);
    if (tok < bestTok) {
      bestTok = tok;
      best = c;
    }
  }
  // Harvest is unconditional: a turn that does not compress must still teach
  // the session, otherwise cross-turn recall can never bootstrap.
  best = { ...best, ledgerAfter: best.ledgerAfter === ledger ? harvested : best.ledgerAfter };

  if (best.mode === 'identity') {
    if (text.startsWith(SENTINEL)) {
      const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
      if (pool.length >= 2) {
        const w = SENTINEL + pool[0] + pool[1] + '\n' + text;
        if (axiomDecode(w, ledger) === text) {
          const ot = countTokens(w, enc);
          return {
            wire: w,
            decoded: text,
            exact: true,
            inTokens,
            outTokens: ot,
            savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
            entries: [],
            recalled: 0,
            bound: 0,
            mode: 'forced-wrap',
            notes: 'forced wrap: input begins with AX1 sentinel',
            ledgerAfter: ledger,
            encodeMs: ms(),
          };
        }
      }
    }
    return {
      ...identity('tournament: identity won (no lane shrank under exact gate)'),
      ledgerAfter: harvested,
    };
  }

  return {
    wire: best.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct: inTokens ? ((inTokens - bestTok) / inTokens) * 100 : 0,
    entries: best.entries,
    recalled: best.recalled,
    bound: best.bound,
    mode: best.mode,
    notes:
      best.mode === 'axiom'
        ? `${best.bound} new binds + ${best.recalled} zero-cost recalls from session ledger · byte-exact`
        : `lane=${best.mode} won the real-BPE tournament · byte-exact`,
    ledgerAfter: best.ledgerAfter,
    encodeMs: ms(),
  };
}

export const AXIOM_SYSTEM_PROMPT = [
  '# ⟦ AXIOM-A1 ⟧ — session-anchored, byte-exact, zero-header wire',
  'A message may open with:',
  '  [AX1]',
  '  OC            <- line 2 declares two delimiter characters: OPEN then CLOSE',
  '  <body>',
  'Reading rules:',
  '1. OPEN k P CLOSE  binds the single character k to phrase P, written out in',
  '   full right where it belongs. Read P normally and remember k = P.',
  '2. A bare k afterwards means P. Binders may nest; resolve inner first.',
  '3. A bare label with NO binder in this message was bound in an EARLIER TURN',
  '   of this same conversation. Scroll back: the binding is already in context.',
  '   This is why the message carries no dictionary — you have already read it.',
  '4. HELIX markers may also appear:',
  HELIX_SYSTEM_PROMPT,
  '5. Everything else is literal. Reconstruction is byte-exact; nothing was cut.',
  'OUTPUT CONTRACT: reuse a label when your reply repeats its phrase; keep code',
  'fences, identifiers, numbers and quoted values verbatim; answer densely.',
].join('\n');

/* -------------------------------- self tests ------------------------------- */

export interface AxiomSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

/** 300-char hetero: prose + JSON + CSV + grid + code + chat-history log. */
export const AXIOM_HANDTRACE_300 =
  'Ship it: retry 3x, never log secrets.\n' +
  '{"id":7,"ok":true},{"id":8,"ok":true}\n' +
  'id,ms\na,12\nb,12\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.';

export function axiomSelfTest(enc: EncodingName = 'o200k_base'): AxiomSelfTest[] {
  const log = Array.from(
    { length: 40 },
    (_, i) =>
      `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
  const idLog = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(',');
  const cases: { name: string; text: string }[] = [
    { name: 'X0 empty', text: '' },
    { name: 'X1 short', text: 'hi' },
    { name: 'X2 hand300 cold', text: AXIOM_HANDTRACE_300 },
    { name: 'X3 sentinel adversary', text: '[AX1]\n一丁\nnot a wire' },
    { name: 'X4 id-run (helix lane)', text: idLog },
    { name: 'X5 json-log', text: log },
    { name: 'X6 code-rep', text: 'function add(a, b) { return a + b; }\n'.repeat(20) },
    { name: 'X7 run-length (pulse lane)', text: 'A'.repeat(800) + 'B'.repeat(600) },
    { name: 'X8 ideograph-bearing input', text: '中文 中文 中文 payload 中文 中文 中文 payload' },
  ];
  const out: AxiomSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = axiomEncode(c.text, enc, []);
      const rt = axiomDecode(r.wire, []) === c.text;
      const ok = rt && r.exact && (r.mode === 'forced-wrap' || r.outTokens <= r.inTokens);
      out.push({
        name: c.name,
        pass: ok,
        details: `mode=${r.mode} bind=${r.bound} recall=${r.recalled} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }

  // Cross-turn witness: turn 1 cold, turn 2 warm on the SAME transcript shape.
  try {
    const turn1 = axiomEncode(AXIOM_HANDTRACE_300, enc, []);
    const turn2Text =
      'Ship it: retry 3x, never log secrets.\n' +
      'assistant: I will inspect the suite and patch the race.\n' +
      'status: green, no further action.';
    const cold = axiomEncode(turn2Text, enc, []);
    const warm = axiomEncode(turn2Text, enc, turn1.ledgerAfter);
    const exact = axiomDecode(warm.wire, turn1.ledgerAfter) === turn2Text;
    out.push({
      name: 'X9 cross-turn recall beats cold',
      pass: exact && warm.outTokens < cold.outTokens,
      details: `cold ${cold.inTokens}→${cold.outTokens} (${cold.savingsPct.toFixed(1)}%) vs warm ${warm.inTokens}→${warm.outTokens} (${warm.savingsPct.toFixed(1)}%) recalls=${warm.recalled} exact=${exact}`,
    });
  } catch (e) {
    out.push({ name: 'X9 cross-turn recall beats cold', pass: false, details: (e as Error).message });
  }

  try {
    const r = axiomEncode(log, enc, []);
    out.push({ name: 'X10 log-savings>5%', pass: r.savingsPct > 5, details: `${r.savingsPct.toFixed(1)}%` });
  } catch (e) {
    out.push({ name: 'X10 log-savings>5%', pass: false, details: (e as Error).message });
  }
  return out;
}
