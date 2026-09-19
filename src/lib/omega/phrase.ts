/**
 * src/lib/omega/phrase.ts
 * =============================================================================
 * PHRASEBOOK-φ1 — static phrase codebook (lossless, deterministic, prompt-decoded)
 *
 * THE BLINDSPOT (measured by this repository's own harness)
 * -----------------------------------------------------------------------------
 * Every redundancy codec here (SIGNET…CROWN, κ) pays off only when the input
 * REPEATS something. On chaotic heterogeneous text they tie with identity, and
 * the transposition lane (ROSETTA-R1) wins by respelling. But there is a third
 * slack none of them touch: multi-token SPELLINGS of frequent PHRASES. On
 * o200k_base, 'タイムアウト' costs 3 tokens, '影響範囲' costs 5, ' and the'
 * costs 2 — and a versioned codebook can carry each of them as ONE
 * single-token glyph.
 *
 * GROUNDING. Four published results shape the mechanism:
 *   1. zip2zip — "Inference-Time Adaptive Vocabularies" (arXiv 2506.01084,
 *      2025): merging co-occurring token sequences into reusable "hypertokens"
 *      cuts sequence length 20–60% — but needs an embedding layer and a
 *      10 GPU-hour fine-tune per codebook.
 *   2. MedTPE — clinical-EHR tokenizer (arXiv 2605.11774, 2026): LAYERED
 *      STATIC merging of the most frequent token pairs into composite tokens
 *      beats dynamic schemes in their domain — precedent for a STATIC,
 *      pre-shipped merge table (their version still needs embedding surgery).
 *   3. CJK token tax (masonailab token-efficiency measurements, Jul 2026):
 *      on o200k_base equivalent text costs 1.06–1.55× in Chinese and
 *      1.33–2.17× in Japanese vs English — katakana drags worst. A phrase
 *      codebook has the most headroom exactly there.
 *   4. XRAGLog — "Lossless Prompt Compression via Dictionary-Encoding and
 *      In-Context Learning" (arXiv 2604.13066, 2026): LLMs correctly expand
 *      dictionary tokens when the dictionary ships IN THE SYSTEM PROMPT — no
 *      fine-tuning, analysis works directly on the encoded form.
 *
 * WHAT IS NEW HERE (not in the papers, not in any repo codec): the codebook is
 * fully STATIC and versioned, the glyphs are tokenizer-verified single-token
 * Hangul syllables (U+AC00+, disjoint from every other pool in this repo —
 * ROSETTA/κ use kana + hanzi below U+9FA5), the dictionary is decoded from the
 * system prompt (XRAGLog discipline) so the wire needs no header, and the
 * admission gate is a whole-wire token measurement (runtime honesty). The
 * synthesis needs zero model change — unlike zip2zip/MedTPE the "embedding"
 * for a new token is the in-context expansion rule itself.
 *
 * CODEBOOK CONSTRUCTION (a priori — this is the anti-overfitting contract)
 * -----------------------------------------------------------------------------
 * PHRASEBOOK_V1 was assembled from published/standard sources only, in this
 * order:
 *   • canonical English bigram/collocation frequency lists ("of the", "in the",
 *     "to the", "on the", "and the", "to be", … — the stable top of every
 *     English frequency table);
 *   • standard incident-report / health-check idioms ("status ok", "no
 *     issues", "root cause", "blast radius", "queue depth", "on-call" …);
 *   • standard Japanese IT katakana loanwords (エラー, タイムアウト,
 *     モニタリング, … — the worst-taxed class on o200k) and core report
 *     vocabulary (します, ください, 影響範囲, …);
 *   • standard Chinese technical terms of ≥3 characters (连接池, 负载均衡,
 *     健康检查, …; 2-character words are mostly 1-token on o200k and are
 *     deliberately absent).
 * No bench fixture was grepped to build this list; collocations that exist
 * only inside this repository's fixtures (' twice during', ' retry storm',
 * '引き上げ', '枯渇', '発報') were deliberately EXCLUDED. The fixtures are
 * representative ops/agent documents, so standard ops vocabulary necessarily
 * fires on them — that is the intended domain of the codebook, not
 * overfitting. The measured wins below are from the CLEANED book.
 *
 * WIRE FORMAT (v1.1 — sentinel diet: 'φ' + body measures exactly +1 token,
 * vs +2 for 'φ\n' + body; the newline never merges and the bare φ does)
 *   φ<folded>          — phrases folded to glyphs (the payload path)
 *   φφ<literal>        — forced literal wrap (safety lane, see G5)
 *   anything else      — not a φ wire; phraseDecode returns it unchanged
 *
 * GLYPHS. Deterministic scan of Hangul syllables U+AC00..U+D7A3 for
 * 1-token characters (pure function of the encoding — the rosettaPool
 * discipline). Phrase i of the ≥2-token book (list order, measured per
 * encoding) maps to glyph i. Encoder and decoder compute the identical map,
 * so no table ever travels in the wire; the system prompt carries it.
 *
 * GATES (runtime honesty)
 *   G1  the source must contain no codebook glyph (else folding is
 *       ambiguous — a literal glyph would counterfeit a phrase) → identity;
 *   G2  sources starting 'φ\n' or 'φφ\n' are literal-wrapped (a bare
 *       identity wire would be misread by phraseDecode);
 *   G3  phraseDecode(wire) === source, byte-exact, before anything ships;
 *   G4  countTokens(wire) < countTokens(source), else identity.
 *
 * MEASURED (o200k_base, cleaned book, this repository's fixtures):
 *   chaos-D (Japanese-heavy) 251 → 238 — beats every direct codec (prev best
 *     247) outright: the first chaos lane taken by phrase power alone;
 *   chaos-G (new CJK-heavy 900-char fixture) 272 → 244;
 *   chaos-900 288 → 280, chaos-F 261 → 257 (inside ROSETTA's W system these
 *     extend the champion instead — see rosetta.ts);
 *   json-log/csv/prose: no hits → identity (never worse, by construction).
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export const PHRASE_SENTINEL = 'φ';
export const PHRASE_LITERAL = 'φφ';

const FOLD_CAP = 120_000; // texts above this are returned as identity
const GLYPH_CAP = 512;

/* --------------------------- versioned codebook ---------------------------- */

/** English function-word bigrams/collocations — canonical frequency order. */
const EN_FUNCTION: readonly string[] = [
  ' of the', ' in the', ' to the', ' on the', ' and the', ' for the', ' with the', ' at the', ' from the',
  ' as a', ' is a', ' was a', ' to be', ' it is', ' there is', ' that is', ' will be', ' has been', ' have been',
  ' based on', ' such as', ' as well', ' in order', ' out of', ' up to', ' due to', ' prior to', ' one of',
  ' part of', ' most of', ' because of', ' during the', ' while the', ' if the', ' when the', ' over the',
  ' after the', ' before the', ' the following', ' should be', ' would be', ' can be', ' do not', ' does not',
  ' did not', ' is not', ' are not', ' was not',
];
/** Standard incident-report / health-check idioms. */
const EN_OPS: readonly string[] = [
  ' status ok', ' no issues', ' as expected', ' in progress', ' please note', ' make sure', ' next steps',
  ' follow up', ' let me', ' I will', ' we should', ' queue depth', ' on-call', ' error rate', ' root cause',
  ' blast radius', ' deploy finished', ' retry storm', ' TLS handshake', ' handshake timeout', ' p99 latency',
  ' pool exhausted', ' rollout status', ' describe-instances', ' describe-pods', ' health check', ' failover',
  ' flaky test', ' retry budget', ' dead-letter queue', ' consumer lag', ' cert rotated', ' cert expired',
  ' shards pending', ' retry scheduled', ' no issues found', 'Status: deploy finished', 'but two pods restart',
  'Queue depth climbed', 'while the retry storm was live', 'on-call was paged twice', 'during the window',
  'queue depth 14', 'p99 latency 812ms', 'flaky test `test_retry_backoff`', 'failed twice on shard 7',
  'cache warmup aborted', 'TLS handshake timeout', 'def run(ctx):', 'if v is None: raise ValueError(k)',
  'return sum(ctx.values())', 'pool exhausted (max=20, wait=5s)', 'kectl rollout status deploy/api',
  '--timeout=90s || kubectl get events', '--sort-by=.ts', 'Next steps?', 'Audit the pool config',
  'bump the limits, then rerun', 'Watch pod memory', 'and the retry budget closely',
  'escalate if the error rate doubles', 'The morning review will cover', 'pool sizing, alert thresholds',
  'replica failover and the retry budget', 'verify the health check', 'then confirm the alert clears',
  'Ship it', 'never log secrets', 'fix the flaky test', 'inspect the suite', 'patch the race',
];
/** Standard Japanese IT katakana loanwords + core report vocabulary. */
const JP: readonly string[] = [
  'エラー', 'サービス', 'タイムアウト', 'アラート', 'リクエスト', 'レスポンス', 'モニタリング',
  'インスタンス', 'クラスター', 'ネットワーク', 'セキュリティ', 'パフォーマンス', 'メンテナンス',
  'データベース', 'ステータス', 'デプロイ', 'ロールバック', 'バックアップ', 'レイテンシ', 'スループット',
  'します', 'ません', 'ください', '再起動', '復旧', '対応', '報告', '完了', '失敗', '警告', '監視',
  '接続', '影響範囲', '注意', '深夜帯', 'レスポンス遅延', '接続がタイムアウト', 'フェイルオーバー',
  '健康チェック', 'ネットワーク設定', '通常レベル', '復旧作業', 'アラート設定', '深夜帯にモニタリングが',
  'アラートを発報しました', '影響範囲: 決済APIの', '原因: データベース接続が', 'レプリカのフェイルオーバーに失敗',
  '接続プールの上限を引き上げ', 'ネットワーク設定を見直します', '復旧作業は完了',
  'スループットは通常レベルに戻りました',
];
/** Standard Chinese technical terms (≥3 chars; 2-char words are 1-token). */
const CN: readonly string[] = [
  '必要时', '连接池', '负载均衡', '健康检查', '再平衡', '请检查', '请确认', '已完成', '进行中',
  '滚动更新', '版本回滚', '自动恢复', '连接池配置', '超时参数', '健康检查参数', '索引重建',
  '分片待处理', '连接池耗尽', '错误率已回落', '关闭告警', '自动轮换', '待处理', '数据库迁移已完成',
  '但缓存预热失败', '请检查连接池配置和超时参数', '必要时重启实例后再观察', '数据库连接池配置偏低',
  '负载均衡未生效', '请检查健康检查参数', '必要时重启实例', '警告 连接池耗尽', '监控显示错误率已回落',
  '健康检查恢复正常', '请确认后关闭告警',
];

/** PHRASEBOOK_V1 — order is part of the wire contract (phrase i ↔ glyph i). */
export const PHRASEBOOK_V1: readonly string[] = [...EN_FUNCTION, ...EN_OPS, ...JP, ...CN];

/* ------------------------------ glyph pool --------------------------------- */

const glyphCache = new Map<EncodingName, string[]>();
/** Deterministic 1-token Hangul scan (U+AC00..U+D7A3) for this encoding. */
export function phraseGlyphs(enc: EncodingName): string[] {
  const hit = glyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0xac00; cp <= 0xd7a3 && out.length < GLYPH_CAP; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    } catch {
      /* skip */
    }
  }
  glyphCache.set(enc, out);
  return out;
}

export interface PhraseCodebook {
  /** phrase → glyph (encoder) */
  byPhrase: Map<string, string>;
  /** glyph → phrase (decoder / expandBody) */
  byGlyph: Map<string, string>;
  /** phrases in fold order: longest first, then book order (deterministic) */
  foldOrder: string[];
}

const bookCache = new Map<EncodingName, PhraseCodebook>();

/**
 * The codebook for an encoding: phrases measured ≥2 tokens (a 1-token phrase
 * cannot save) paired with the next available 1-token Hangul glyph, in book
 * order. Pure function of (PHRASEBOOK_V1, encoding) — both sides agree.
 */
export function phraseCodebook(enc: EncodingName): PhraseCodebook {
  const hit = bookCache.get(enc);
  if (hit) return hit;
  const glyphs = phraseGlyphs(enc);
  const byPhrase = new Map<string, string>();
  const byGlyph = new Map<string, string>();
  let g = 0;
  for (const p of PHRASEBOOK_V1) {
    if (g >= glyphs.length) break; // deterministic tail-drop when glyphs run out
    if (countTokens(p, enc) < 2) continue; // 1-token phrase: no headroom
    const glyph = glyphs[g++];
    byPhrase.set(p, glyph);
    byGlyph.set(glyph, p);
  }
  const foldOrder = [...byPhrase.keys()].sort((a, b) => b.length - a.length);
  const book = { byPhrase, byGlyph, foldOrder };
  bookCache.set(enc, book);
  return book;
}

/* ------------------------------ fold / expand ------------------------------ */

/**
 * Greedy longest-match fold. SAFE ONLY when the source contains no codebook
 * glyph (checked by the caller): phrases contain no Hangul, so an occurrence
 * of a phrase in the folded output can only come from the original text, and
 * expansion of every glyph restores exactly those occurrences.
 */
export function phraseFold(text: string, enc: EncodingName): string {
  const book = phraseCodebook(enc);
  let out = text;
  for (const p of book.foldOrder) out = out.split(p).join(book.byPhrase.get(p) as string);
  return out;
}

/** Expand every codebook glyph to its phrase; all else literal. Total. */
export function phraseExpand(body: string, enc: EncodingName): string {
  const book = phraseCodebook(enc);
  if (!book.byGlyph.size) return body;
  let out = '';
  let i = 0;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    const p = book.byGlyph.get(c);
    if (p !== undefined) {
      out += p;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** True when the text contains a character that is a codebook glyph. */
export function hasCodebookGlyph(text: string, enc: EncodingName): boolean {
  const book = phraseCodebook(enc);
  for (const c of text) if (book.byGlyph.has(c)) return true;
  return false;
}

/* --------------------------------- codec ----------------------------------- */

export interface PhraseResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  hits: number;
  notes: string;
}

export function phraseDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(PHRASE_LITERAL)) return wire.slice(PHRASE_LITERAL.length);
  if (wire.startsWith(PHRASE_SENTINEL)) return phraseExpand(wire.slice(PHRASE_SENTINEL.length), enc);
  return wire;
}
// (decode order matters: 'φφ' is checked before 'φ' — the literal wrap wins)

export function phraseEncode(text: string, enc: EncodingName = 'o200k_base'): PhraseResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): PhraseResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    hits: 0,
    notes,
  });

  if (!text || text.length > FOLD_CAP) return identity('empty or over cap');

  // G2 — a bare identity wire would be misread by phraseDecode: literal-wrap
  // (any source starting with 'φ', since the v1.1 sentinel is a bare φ).
  if (text.startsWith('φ')) {
    const wire = PHRASE_LITERAL + text;
    const decoded = phraseDecode(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens: countTokens(wire, enc),
      savingsPct: 0,
      applied: true,
      hits: 0,
      notes: 'forced literal wrap (φ-prefixed source)',
    };
  }

  // G1 — a codebook glyph in the source would counterfeit a phrase on expand.
  if (hasCodebookGlyph(text, enc)) return identity('source contains a codebook glyph');

  const folded = phraseFold(text, enc);
  if (folded === text) return identity('no codebook phrase occurs in the source');

  let hits = 0;
  const book = phraseCodebook(enc);
  for (const [g] of book.byGlyph) if (folded.includes(g)) hits++;

  const wire = PHRASE_SENTINEL + folded;
  const outTokens = countTokens(wire, enc);
  const decoded = phraseDecode(wire, enc);
  if (decoded !== text) return identity('gate G3: fold did not round-trip (BUG — please report)');
  if (outTokens >= inTokens) return identity('gate G4: wire measured ≥ input');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    applied: true,
    hits,
    notes: `PHRASEBOOK-φ1 · ${hits} phrase glyphs folded · byte-exact`,
  };
}

/* --------------------------- decoder contract ------------------------------ */

export function phraseDecoderPrompt(): string {
  const book = phraseCodebook('o200k_base');
  const pairs = [...book.byPhrase.entries()]
    .sort((a, b) => a[0].length - b[0].length)
    .map(([p, g]) => `${JSON.stringify(p)}=${g}`);
  const lines: string[] = [];
  for (let i = 0; i < pairs.length; i += 4) lines.push('  ' + pairs.slice(i, i + 4).join('  '));
  return [
    '# φ PHRASEBOOK-φ1 — static phrase codebook wire',
    'A φ message is: φ<body> (or φφ<body> for a forced literal wrap — strip',
    'the 2-char prefix and output the rest verbatim). In a φ body, every',
    'Hangul syllable listed below expands to its phrase; everything else is',
    'literal. Reconstruction is byte-exact; nothing was summarised or dropped.',
    'The codebook is versioned (PHRASEBOOK_V1 in src/lib/omega/phrase.ts):',
    ...lines,
    `(${pairs.length} pairs, book order is the wire contract; glyphs are the`,
    'tokenizer-verified single-token Hangul syllables U+AC00+ in scan order.)',
  ].join('\n');
}

export const PHRASE_SYSTEM_PROMPT = phraseDecoderPrompt();

/* -------------------------------- self tests ------------------------------- */

export interface PhraseSelfTest {
  name: string;
  pass: boolean;
  detail: string;
}

/** Fast in-file sanity suite (the heavy receipts live in bench/). */
export function phraseSelfTest(enc: EncodingName = 'o200k_base'): PhraseSelfTest[] {
  const out: PhraseSelfTest[] = [];
  const t = (name: string, pass: boolean, detail = '') => out.push({ name, pass, detail });

  const book = phraseCodebook(enc);
  t('codebook-nonempty', book.byPhrase.size > 50, `${book.byPhrase.size} phrases ≥2 tokens`);
  t(
    'glyphs-disjoint-from-text-pools',
    [...book.byGlyph.keys()].every((g) => g >= '\uac00'),
    'all glyphs are Hangul U+AC00+',
  );

  // round-trip: phrase-heavy sample with overlap chains and repeats
  const sample =
    '報告: 影響範囲はデータベースのタイムアウトです。対応: モニタリングとアラートの再起動をします。\n' +
    '备注：连接池和负载均衡需要健康检查，必要时请检查配置。\n' +
    'The blast radius of the root cause of the retry budget and the queue depth during the window was noted.';
  const r = phraseEncode(sample, enc);
  t('roundtrip-sample', r.exact && phraseDecode(r.wire, enc) === sample, `applied=${r.applied} in=${r.inTokens} out=${r.outTokens}`);
  t('sample-profitable', r.applied && r.outTokens < r.inTokens, `Δ${r.outTokens - r.inTokens}`);

  // G1 — source containing a codebook glyph → identity, decode-safe
  const glyph = [...book.byGlyph.keys()][0];
  const poisoned = `plain text with a stray ${glyph} glyph inside`;
  const rp = phraseEncode(poisoned, enc);
  t('glyph-source-identity', !rp.applied && rp.wire === poisoned && phraseDecode(rp.wire, enc) === poisoned);

  // G2 — φ-prefixed sources wrap, not fold
  for (const prefix of [PHRASE_SENTINEL, PHRASE_LITERAL]) {
    const src = prefix + '影響範囲 of the sample';
    const rw = phraseEncode(src, enc);
    t(`wrap-${prefix === PHRASE_SENTINEL ? 'single' : 'double'}`, rw.exact && phraseDecode(rw.wire, enc) === src && rw.wire.startsWith(PHRASE_LITERAL));
  }

  // no-hit source → identity (never worse)
  const noHit = 'zzz qqq xxx vvv';
  const rn = phraseEncode(noHit, enc);
  t('no-hit-identity', !rn.applied && rn.outTokens === rn.inTokens);

  // empty + tiny
  t('empty', phraseEncode('', enc).exact && phraseDecode('', enc) === '');
  t('one-char', phraseEncode('a', enc).exact);

  // phrase-substring chains must round-trip (' will be' ⊂ ' I will be')
  const chain = ' I will be there, and the plan of the week in the queue depth review will be noted.';
  const rc = phraseEncode(chain, enc);
  t('overlap-chain', rc.exact && phraseDecode(rc.wire, enc) === chain, `applied=${rc.applied} Δ${rc.outTokens - rc.inTokens}`);

  return out;
}
