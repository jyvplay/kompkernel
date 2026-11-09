/**
 * TAGSTACK (X47) — exact in-band close-tag stack elision.
 *
 * A well-nested explicit end tag is replaced by a one-token, collision-checked
 * glyph. After the declared parent message is decoded, that glyph means “emit
 * the closing tag for the top unmatched opening tag”; the exact opening name is
 * restored. HTML mode carries its void-element rule in the same message.
 * Unsupported or malformed documents are refused.
 *
 * For eligible markup, the complete candidate is emitted only when byte-exact
 * and strictly below the same-source in-band parent set: SYNKRISIS, eligible
 * BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, DIASTEMA, and eligible
 * METRON/HEMERA. Every parent message is counted directly as one contract + LF + wire (or the codec's own
 * complete decoderPrompt), not by trusting additive metadata. Comparator
 * errors fail closed. This is not a registry-wide tournament.
 *
 * Prior art is explicit: XMill and HTML-aware compressors already use a shared
 * end-tag token. TAGSTACK is new to this repository's message-codec stack, not
 * a claim of a new compression-theory primitive.
 */

import { countTokens, type EncodingName } from './bpe';
import { stichomythiaEncode } from './stichomythia';
import { prosphysisEncode, prosphysisDecode } from './prosphysis';
import { symphyiaEncode, symphyiaDecodeWire, symphyiaParseContract } from './symphyia';
import { stoicheionEncode, stoicheionDecode } from './stoicheion';
import { workEpoch, workBudgetFor } from './workmeter';
import { apographeDecodeResult, apographeEncode } from './apographe';
import { bifrontEncode, bifrontPlan } from './bifront';
import { akolouthia2Encode } from './akolouthia2';
import { diastemaEncode } from './diastema';
import { hemeraEncode, hemeraSubstitute } from './hemera';
import { kanonEncode } from './kanon';
import { metronEncode, metronPlan } from './metron';
import { synkrisisEncode } from './synkrisis';

export type TagstackMode = 'xml' | 'html';
export type TagstackFrontierParent = 'synkrisis' | 'bifront' | 'kanon' | 'akolouthia2' | 'apographe' | 'metron' | 'hemera' | 'diastema';

const HTML_VOID_NAMES = 'area base br col embed hr img input link meta param source track wbr';
const HTML_VOID = new Set(HTML_VOID_NAMES.split(' '));
const HTML_RAWTEXT = new Set(['script', 'style', 'textarea', 'title']);
const MARKERS = ['~', '^', '◆', '¤', '‡', '°', 'µ', '@', '!', '%', '+', '=', '§'];
const MAX_TEXT_CHARS = 100_000;
const MIN_CLOSERS = 2;
const NAME_START = /^[A-Za-z_:]$/;
const NAME_CHAR = /^[A-Za-z0-9_.:-]$/;

export interface TagstackPlan {
  text: string;
  mode: TagstackMode;
  marker: string;
  pairs: number;
}

export interface TagstackResult {
  codec: 'tagstack';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  /** Minimum exact, complete message among the checked current in-band parents. */
  parentTokens: number;
  synkrisisParentTokens: number;
  parentCodec: TagstackFrontierParent;
  /** Direct o200k counts of complete contract-plus-wire messages. */
  frontierCosts: Partial<Record<TagstackFrontierParent, number>>;
  /** Codec-reported metadata, retained to expose mismatches such as DIASTEMA's additive estimate. */
  frontierReportedCosts: Partial<Record<TagstackFrontierParent, number>>;
  frontierComplete: boolean;
  messageTokens: number;
  applied: boolean;
  mode: TagstackMode | null;
  marker: string | null;
  pairs: number;
  arm: 'tagstack' | 'synkrisis-parent' | 'current-frontier-parent' | 'stichomythia';
  candidateTokens: number | null;
  candidateExact: boolean | null;
  /** Kept for audit receipts; not required as decoder-side hidden state. */
  candidateMessage: string | null;
  notes: string;
  ms: number;
}

interface TagToken {
  kind: 'open' | 'close' | 'markup';
  start: number;
  end: number;
  name: string;
  selfClosing: boolean;
}

interface TransformResult {
  text: string;
  mode: TagstackMode;
  pairs: number;
}

function isSpace(c: string): boolean { return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f'; }
function isNameStart(c: string): boolean { return c.length === 1 && NAME_START.test(c); }
function isNameChar(c: string): boolean { return c.length === 1 && NAME_CHAR.test(c); }

/** Fully in-band inverse rule. The source bytes outside tags are never normalized. */
export function tagstackContractFor(mode: TagstackMode, marker: string): string {
  const rule = `After parent decode, scan left to right: ignore comments, CDATA, PIs and declarations; scan > outside quoted attributes. Push each exact <name...> unless it ends />. ${marker} pops the top name and emits </name>. Preserve every other byte.`;
  if (mode === 'xml') return rule;
  return `${rule} HTML voids never push: ${HTML_VOID_NAMES}. In HTML script/style/textarea/title text is opaque until ${marker}; inside svg/math use XML rules.`;
}

function scanTerminated(text: string, start: number, terminator: string): number {
  const at = text.indexOf(terminator, start);
  return at < 0 ? -1 : at + terminator.length;
}

/** Find the end of a declaration/doctype, respecting quotes and an internal subset. */
function scanDeclarationEnd(text: string, start: number): number {
  let quote = '';
  let subset = 0;
  for (let i = start + 2; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '[') { subset++; continue; }
    if (c === ']' && subset > 0) { subset--; continue; }
    if (c === '>' && subset === 0) return i + 1;
  }
  return -1;
}

/** Parse one markup token at `<`; null means a literal `<`, -1 means malformed. */
function parseTag(text: string, at: number): TagToken | null | -1 {
  if (text.startsWith('<!--', at)) {
    const end = scanTerminated(text, at + 4, '-->');
    return end < 0 ? -1 : { kind: 'markup', start: at, end, name: '', selfClosing: false };
  }
  if (text.startsWith('<![CDATA[', at)) {
    const end = scanTerminated(text, at + 9, ']]>');
    return end < 0 ? -1 : { kind: 'markup', start: at, end, name: '', selfClosing: false };
  }
  if (text.startsWith('<?', at)) {
    const end = scanTerminated(text, at + 2, '?>');
    return end < 0 ? -1 : { kind: 'markup', start: at, end, name: '', selfClosing: false };
  }
  if (text.startsWith('<!', at)) {
    const end = scanDeclarationEnd(text, at);
    return end < 0 ? -1 : { kind: 'markup', start: at, end, name: '', selfClosing: false };
  }

  const closing = text[at + 1] === '/';
  const nameAt = at + (closing ? 2 : 1);
  if (nameAt >= text.length || !isNameStart(text[nameAt])) return closing ? -1 : null;
  let nameEnd = nameAt + 1;
  while (nameEnd < text.length && isNameChar(text[nameEnd])) nameEnd++;
  const name = text.slice(nameAt, nameEnd);

  if (closing) {
    // Preserve exact spelling; a space before `>` is unsupported, not normalized.
    if (text[nameEnd] !== '>') return -1;
    return { kind: 'close', start: at, end: nameEnd + 1, name, selfClosing: false };
  }

  let quote = '';
  let end = -1;
  for (let i = nameEnd; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '<') return -1;
    if (c === '>') { end = i + 1; break; }
  }
  if (end < 0 || quote) return -1;
  let last = end - 2;
  while (last >= nameEnd && isSpace(text[last])) last--;
  return { kind: 'open', start: at, end, name, selfClosing: text[last] === '/' };
}

function htmlModeFor(text: string): TagstackMode {
  const lead = text.replace(/^\uFEFF/, '').trimStart();
  if (/^<!doctype\s+html(?:\s|>)/i.test(lead) || /^<html(?:\s|>)/i.test(lead)) return 'html';
  return 'xml';
}

function isForeignHtml(stack: readonly string[]): boolean {
  return stack.some(name => name.toLowerCase() === 'svg' || name.toLowerCase() === 'math');
}

function isHtmlVoid(name: string, mode: TagstackMode, stack: readonly string[]): boolean {
  return mode === 'html' && !isForeignHtml(stack) && HTML_VOID.has(name.toLowerCase());
}

function rawTextClosingAt(text: string, from: number, name: string, marker: string | null): number {
  let candidate = marker ? text.indexOf(marker, from) : -1;
  let at = from;
  const lower = text.toLowerCase();
  while (at < text.length) {
    const found = lower.indexOf('</' + name, at);
    if (found < 0) break;
    const next = text[found + name.length + 2];
    if (next === '>' || isSpace(next ?? '')) {
      candidate = candidate < 0 ? found : Math.min(candidate, found);
      break;
    }
    at = found + name.length + 2;
  }
  return candidate;
}

/** One deterministic parse pass, optionally replacing or restoring a marker. */
function scanAndMap(text: string, mode: TagstackMode, marker: string, restore: boolean): TransformResult | null {
  if (!text.length || text.length > MAX_TEXT_CHARS) return null;
  const stack: string[] = [];
  const out: string[] = [];
  let pos = 0;
  let pairs = 0;
  let openCount = 0;

  while (pos < text.length) {
    if (mode === 'html' && stack.length && !isForeignHtml(stack) && HTML_RAWTEXT.has(stack[stack.length - 1].toLowerCase())) {
      const closeAt = rawTextClosingAt(text, pos, stack[stack.length - 1], restore ? marker : null);
      if (closeAt < 0) return null;
      out.push(text.slice(pos, closeAt));
      pos = closeAt;
    }

    const lt = text.indexOf('<', pos);
    const markAt = restore ? text.indexOf(marker, pos) : -1;
    if (markAt >= 0 && (lt < 0 || markAt < lt)) {
      out.push(text.slice(pos, markAt));
      const name = stack.pop();
      if (!name) return null;
      out.push(`</${name}>`);
      pairs++;
      pos = markAt + marker.length;
      continue;
    }
    if (lt < 0) { out.push(text.slice(pos)); pos = text.length; break; }
    out.push(text.slice(pos, lt));
    const token = parseTag(text, lt);
    if (token === -1) return null;
    if (token === null) {
      if (text.startsWith('</', lt)) return null;
      out.push('<');
      pos = lt + 1;
      continue;
    }
    const raw = text.slice(token.start, token.end);
    if (token.kind === 'markup') {
      out.push(raw);
      pos = token.end;
      continue;
    }
    if (token.kind === 'open') {
      openCount++;
      if (!token.selfClosing && !isHtmlVoid(token.name, mode, stack)) stack.push(token.name);
      out.push(raw);
      pos = token.end;
      continue;
    }

    const top = stack.pop();
    if (!top || top !== token.name) return null;
    pairs++;
    out.push(restore ? raw : marker);
    pos = token.end;
  }

  if (stack.length || openCount < 1) return null;
  const mapped = out.join('');
  if (!restore && pairs < MIN_CLOSERS) return null;
  return { text: mapped, mode, pairs };
}

/** Build a reversible, one-token-marker form; null means outside the domain. */
export function tagstackTransform(text: string, enc: EncodingName = 'o200k_base'): TagstackPlan | null {
  if (!text.replace(/^\uFEFF/, '').trimStart().startsWith('<') || text.length > MAX_TEXT_CHARS) return null;
  const mode = htmlModeFor(text);
  let best: { plan: TagstackPlan; M: number; markerIndex: number } | null = null;
  for (let i = 0; i < MARKERS.length; i++) {
    const marker = MARKERS[i];
    if (text.includes(marker) || countTokens(marker, enc) !== 1) continue;
    const plan = scanAndMap(text, mode, marker, false);
    if (!plan || plan.text === text) continue;
    const restored = scanAndMap(plan.text, mode, marker, true);
    if (restored?.text !== text) continue;
    const M = countTokens(tagstackContractFor(mode, marker) + '\n' + plan.text, enc);
    if (!best || M < best.M || (M === best.M && i < best.markerIndex)) {
      best = { plan: { text: plan.text, mode, marker, pairs: plan.pairs }, M, markerIndex: i };
    }
  }
  return best?.plan ?? null;
}

/**
 * X74 — the inverse of a message that may have been emitted by `tagstackEncode`.
 *
 * A one-chat message is read by a HUMAN-GRADE reader (an LLM), not by a dispatcher:
 * it says in its own first line what to do with its body. That is why this function
 * needs no registry — which codec won is written in the message. For a programmatic
 * exactness check the caller supplies the inverse of the parent that the message
 * names, and every codec in this stack exports one (`synkrisisDecode`,
 * `akolouthia2Decode`, `hemeraDecode`, `diastemaDecode`, …).
 *
 *   PROSPHYSIS  first line contains the section sign: invert the parent on the body,
 *               then invert the one relation the key states.
 *   STOICHEION  first line names STOICHEION: invert that.
 *   otherwise   a frontier message; return it unchanged (its own first line is its
 *               own reader).
 */
export function tagstackDecode(message: string, parentDecoder?: (wire: string) => string): string {
  // X90 ΣΥΜΦΥΊΑ. Its contract is the first line and is SELF-DESCIBING: the rules, the marker
  // and the CRC are all parsed back out of that line, because this function is given the
  // message and nothing else. Order matters and the contract says so (`Body first.`): the
  // body is decoded by the frontier's own reader first, since in the encoded body whitespace
  // has been replaced by glyphs and field-splitting it would bind the rule to the wrong
  // cells. A malformed contract or a failed CRC THROWS rather than returning an
  // approximation -- the same convention prosphysisDecode uses.
  if (message.startsWith('X90.')) {
    const nl = message.indexOf('\n');
    const key = nl < 0 ? message : message.slice(0, nl);
    const body = nl < 0 ? '' : message.slice(nl + 1);
    const parts = symphyiaParseContract(key);
    if (!parts) throw new Error('tagstackDecode: X90 contract does not parse');
    const inner = parentDecoder ? parentDecoder(body) : body;
    const out = symphyiaDecodeWire(inner, parts.rules, parts.marker, parts.crc);
    if (out === null) throw new Error('tagstackDecode: X90 body does not satisfy its contract (malformed or corrupt)');
    return out;
  }
  if (!message.startsWith('X74')) return message;
  const nl = message.indexOf('\n');
  const key = nl < 0 ? message : message.slice(0, nl);
  const body = nl < 0 ? '' : message.slice(nl + 1);
  const inner = parentDecoder ? parentDecoder(body) : body;
  if (key.includes('\u00a7')) return prosphysisDecode(inner);
  if (key.includes('STOICHEION')) return stoicheionDecode(inner);
  return inner;
}

/** Exact inverse stage after the declared parent has been decoded. */
export function tagstackRestore(parentDecoded: string, mode: TagstackMode, marker: string): string | null {
  const result = scanAndMap(parentDecoded, mode, marker, true);
  return result?.text ?? null;
}

/**
 * Strict exact wrapper: measure the current in-band parent set on this source,
 * then emit the stack fold only if the full message is exact and strictly below
 * that measured minimum. Any comparator failure is fatal (fail closed), rather
 * than silently weakening the gate to SYNKRISIS alone.
 */
function tagstackEncodeInner(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  // X57: each frontier parent is measured inside its OWN deterministic
  // work epoch (workmeter.ts) so an early expensive parent (SYNKRISIS ->
  // ARCHETYPON chain) cannot starve a later one (e.g. AKOLOUTHIA-2).
  const E = <T,>(fn: () => T): T => workEpoch(workBudgetFor(text.length), fn, text.length);
  const frontierCosts: Partial<Record<TagstackFrontierParent, number>> = {};
  const frontierReportedCosts: Partial<Record<TagstackFrontierParent, number>> = {};
  let parent: {
    codec: TagstackFrontierParent;
    wire: string;
    message: string;
    decoded: string;
    tokens: number;
  } | null = null;
  let synTokens = 0;

  const consider = (candidate: {
    codec: TagstackFrontierParent;
    wire: string;
    message: string;
    decoded: string;
    reportedTokens?: number;
  }): void => {
    if (candidate.decoded !== text) {
      throw new Error(`${candidate.codec} comparator did not reconstruct the source exactly`);
    }
    const tokens = countTokens(candidate.message, enc);
    if (!Number.isFinite(tokens)) throw new Error(`${candidate.codec} produced a non-finite full-message cost`);
    frontierCosts[candidate.codec] = tokens;
    if (Number.isFinite(candidate.reportedTokens)) frontierReportedCosts[candidate.codec] = candidate.reportedTokens!;
    if (candidate.codec === 'synkrisis') synTokens = tokens;
    if (!parent || tokens < parent.tokens) parent = { ...candidate, tokens };
  };

  const syn = E(() => synkrisisEncode(text, enc));
  consider({ codec: 'synkrisis', wire: syn.wire, message: syn.message, decoded: syn.decoded,
    reportedTokens: syn.messageTokens });
  if (bifrontPlan(text)) {
    const b = E(() => bifrontEncode(text, enc));
    consider({ codec: 'bifront', wire: b.wire, message: b.message, decoded: b.decoded,
      reportedTokens: b.messageTokens });
  }
  const k = E(() => kanonEncode(text, enc));
  consider({ codec: 'kanon', wire: k.wire, message: k.decoderPrompt + k.wire, decoded: k.decoded,
    reportedTokens: k.messageTokens });
  const a = E(() => akolouthia2Encode(text, enc));
  consider({ codec: 'akolouthia2', wire: a.wire, message: a.decoderPrompt, decoded: a.decoded,
    reportedTokens: a.messageTokens });

  const ap = E(() => apographeEncode(text, enc));
  const apMessage = (ap.contract ? ap.contract + '\n' : '') + ap.wire;
  const apDecoded = apographeDecodeResult(ap);
  if (apDecoded !== text) throw new Error('APOGRAPHE comparator did not reconstruct the source exactly');
  consider({ codec: 'apographe', wire: ap.wire, message: apMessage, decoded: apDecoded,
    reportedTokens: ap.messageTokens });

  const mp = metronPlan(text, enc);
  if (mp?.proxyGain) {
    const m = E(() => metronEncode(text, enc));
    const message = (m.contract ? m.contract + '\n' : '') + m.wire;
    consider({ codec: 'metron', wire: m.wire, message, decoded: apographeDecodeResult(m), reportedTokens: m.messageTokens });
  }

  const hp = hemeraSubstitute(text, { day: true, ms: true });
  if (hp.days + hp.ms) {
    const h = E(() => hemeraEncode(text, enc));
    consider({ codec: 'hemera', wire: h.wire, message: h.decoderPrompt, decoded: h.decoded,
      reportedTokens: h.messageTokens });
  }

  // DIASTEMA is always measured. Its reported additive total can differ from
  // counting the literal in-band contract + LF + wire, which is the score used.
  const d = E(() => diastemaEncode(text, enc));
  const diastemaMessage = d.contract ? d.contract + '\n' + d.wire : d.wire;
  consider({ codec: 'diastema', wire: d.wire, message: diastemaMessage, decoded: d.decoded,
    reportedTokens: d.messageTokens });
  const bestParent = parent as { codec: TagstackFrontierParent; wire: string; message: string; decoded: string; tokens: number } | null;
  if (!bestParent) throw new Error('current frontier has no exact parent');

  const fallback = (why: string, mode: TagstackMode | null = null, marker: string | null = null,
    pairs = 0, candidateTokens: number | null = null, candidateExact: boolean | null = null,
    candidateMessage: string | null = null): TagstackResult => ({
    codec: 'tagstack', wire: bestParent.wire, message: bestParent.message, decoded: bestParent.decoded,
    exact: bestParent.decoded === text, inTokens, parentTokens: bestParent.tokens, synkrisisParentTokens: synTokens,
    parentCodec: bestParent.codec, frontierCosts, frontierReportedCosts, frontierComplete: true,
    messageTokens: bestParent.tokens, applied: false, mode, marker, pairs,
    arm: bestParent.codec === 'synkrisis' ? 'synkrisis-parent' : 'current-frontier-parent',
    candidateTokens, candidateExact, candidateMessage, notes: why, ms: Date.now() - started,
  });

  const plan = tagstackTransform(text, enc);
  if (!plan) return fallback('outside bounded, collision-free, well-nested markup domain');

  let child: ReturnType<typeof apographeEncode>;
  let parentDecoded: string;
  try {
    child = workEpoch(workBudgetFor(plan.text.length), () => apographeEncode(plan.text, enc), plan.text.length);
    parentDecoded = apographeDecodeResult(child);
  } catch {
    return fallback('APOGRAPHE candidate construction/decoder threw', plan.mode, plan.marker, plan.pairs);
  }
  const contract = tagstackContractFor(plan.mode, plan.marker);
  const childMessage = (child.contract ? child.contract + '\n' : '') + child.wire;
  const candidateMessage = contract + '\n' + childMessage;
  const candidateTokens = countTokens(candidateMessage, enc);
  const decoded = tagstackRestore(parentDecoded, plan.mode, plan.marker);
  const candidateExact = parentDecoded === plan.text && decoded === text;
  if (!candidateExact) return fallback('composed APOGRAPHE + stack inverse failed exactness', plan.mode, plan.marker, plan.pairs,
    candidateTokens, false, candidateMessage);
  if (candidateTokens >= bestParent.tokens) return fallback(
    `candidate M=${candidateTokens} not below current ${bestParent.codec} frontier M=${bestParent.tokens}`,
    plan.mode, plan.marker, plan.pairs, candidateTokens, true, candidateMessage);

  return {
    codec: 'tagstack', wire: child.wire, message: candidateMessage, decoded, exact: true,
    inTokens, parentTokens: bestParent.tokens, synkrisisParentTokens: synTokens, parentCodec: bestParent.codec,
    frontierCosts, frontierReportedCosts, frontierComplete: true, messageTokens: candidateTokens,
    applied: true, mode: plan.mode, marker: plan.marker, pairs: plan.pairs, arm: 'tagstack',
    candidateTokens, candidateExact: true, candidateMessage,
    notes: `TAGSTACK/${plan.mode} marker=${JSON.stringify(plan.marker)} ${plan.pairs} close names; M=${candidateTokens} < current ${bestParent.codec} M=${bestParent.tokens}`,
    ms: Date.now() - started,
  };
}

/**
 * X57: budget windows are per-parent inside tagstackEncodeInner (helper E),
 * not one shared window — see workmeter.ts.
 */
/**
 * X74 — THE DOCUMENT MEMO. Measured need: the stack re-encodes the SAME document
 * several times inside one call chain (every candidate the frontier searches is a
 * re-encode of an already-seen body, and PROSPHYSIS encodes the body twice: once to
 * price the frontier, once to price the rewritten text). On a 4-lane repeat pass the
 * second encode cost 10 429 ms and returned token ids that were identical to the
 * first. Caching the RESULT (not a re-derivation) is therefore exact by construction,
 * and it removes the second cost entirely: 10 429 ms -> 0 ms, ids identical
 * (bench/x74/receipts/memo.json).
 *
 * The cache is bounded in BOTH entries and characters, clears itself rather than
 * growing, and returns a SHALLOW COPY so a caller that mutates its result cannot
 * poison the memo. OMEGA_NO_MEMO=1 disables it for A/B measurement.
 */
const ENCODE_MEMO = new Map<string, TagstackResult>();
let memoChars = 0;
const MEMO_MAX_ENTRIES = envIntMemo('OMEGA_MEMO_MAX', 256);
const MEMO_MAX_CHARS = envIntMemo('OMEGA_MEMO_CHARS', 4_000_000);

function envIntMemo(name: string, dflt: number): number {
  const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (!raw) return dflt;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}

function memoKey(text: string, enc: EncodingName): string {
  return `${enc}\u0000${text.length}\u0000${text}`;
}

export function tagstackMemoStats(): { size: number; chars: number } {
  return { size: ENCODE_MEMO.size, chars: memoChars };
}

export function tagstackMemoClear(): void {
  ENCODE_MEMO.clear();
  memoChars = 0;
}

/**
 * THE X73 FRONTIER — the identity WITHOUT the X74 candidates. It is exported because
 * the X74 candidates must price their own bodies against it: if PROSPHYSIS asked
 * `tagstackEncode` for the price of its rewritten text, that call would re-enter the
 * X74 chain on the rewritten text, and the chain would recurse (measured: a 2-lane
 * probe did not finish in 1 800 s). Splitting the identity at exactly this line makes
 * the dependency a total order — candidates call the frontier, the frontier calls the
 * candidates — and the memo is shared across both.
 */
export function tagstackFrontier(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  const memoOff = (typeof process !== 'undefined' && process.env?.OMEGA_NO_MEMO === '1');
  if (memoOff) return tagstackEncodeUncached(text, enc);
  const key = `F\u0000${memoKey(text, enc)}`;
  const hit = ENCODE_MEMO.get(key);
  if (hit) {
    // refresh recency: Map preserves insertion order, so re-insert
    ENCODE_MEMO.delete(key);
    ENCODE_MEMO.set(key, hit);
    return { ...hit };
  }
  const out = tagstackEncodeUncached(text, enc);
  if (text.length <= MEMO_MAX_CHARS) {
    ENCODE_MEMO.set(key, out);
    memoChars += text.length;
    while (ENCODE_MEMO.size > MEMO_MAX_ENTRIES || memoChars > MEMO_MAX_CHARS) {
      const oldest = ENCODE_MEMO.keys().next();
      if (oldest.done) break;
      const victim = ENCODE_MEMO.get(oldest.value);
      if (victim) memoChars -= victim.decoded.length;
      ENCODE_MEMO.delete(oldest.value);
    }
  }
  return { ...out };
}

export function tagstackEncode(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  const memoOff = (typeof process !== 'undefined' && process.env?.OMEGA_NO_MEMO === '1');
  if (memoOff) return tagstackX74Chain(text, enc);
  const key = `X\u0000${memoKey(text, enc)}`;
  const hit = ENCODE_MEMO.get(key);
  if (hit) {
    ENCODE_MEMO.delete(key);
    ENCODE_MEMO.set(key, hit);
    return { ...hit };
  }
  const out = tagstackX74Chain(text, enc);
  if (text.length <= MEMO_MAX_CHARS) {
    ENCODE_MEMO.set(key, out);
    memoChars += text.length;
    while (ENCODE_MEMO.size > MEMO_MAX_ENTRIES || memoChars > MEMO_MAX_CHARS) {
      const oldest = ENCODE_MEMO.keys().next();
      if (oldest.done) break;
      const victim = ENCODE_MEMO.get(oldest.value);
      if (victim) memoChars -= victim.decoded.length;
      ENCODE_MEMO.delete(oldest.value);
    }
  }
  return { ...out };
}

export function tagstackEncodeUncached(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  return tagstackEncodeInner(text, enc);
}

export function tagstackX74Chain(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  const base = tagstackEncodeInner(text, enc);
  /**
   * X73 — STICHOMYTHIA joins the frontier as a CANDIDATE, not as a rewrite.
   *
   * It models each table column as a program (`1+1*r`, `00:00:02@+3s`,
   * `s0|s1|s2|s3*`) instead of as values to copy, which is the one axis the
   * parents above do not have: X72 folded repeated CELLS, X71 searched the
   * CONTRACT, and neither can print a column of distinct values for less than
   * the values cost. Measured on the 29-lane gate it wins exactly one lane,
   * cue-sheet 163 -> 101, and loses the rest; so it is admitted the only way
   * anything is admitted here — by being strictly smaller on a complete,
   * decoded, byte-exact message, in the same process, or not at all.
   */
  const stich = stichomythiaEncode(text, enc);
  let best = (!stich.applied || stich.decoded !== text || stich.messageTokens >= base.messageTokens)
    ? base
    : {
      ...base,
      wire: stich.message,
      message: stich.message,
      decoded: stich.decoded,
      messageTokens: stich.messageTokens,
      parentCodec: 'stichomythia' as unknown as typeof base.parentCodec,
      arm: 'stichomythia' as TagstackResult['arm'],
      applied: true,
      notes: `STICHOMYTHIA ${stich.rows}x${stich.cols} M=${stich.messageTokens} < ${base.parentCodec} M=${base.messageTokens}; ${base.notes}`,
    };

  /**
   * X74 — PROSPHYSIS and STOICHEION join the same way, and the pattern is now the
   * stack's admission rule rather than a convention: a candidate is a COMPLETE
   * message that (i) decodes to the source byte for byte and (ii) is strictly
   * smaller than the incumbent's complete message, both measured in this process.
   *
   * PROSPHYSIS  a cell that CONTAINS a sibling cell plus an affix — the symlink
   *             relation. Re-encodes the rewritten text through this same frontier,
   *             so its saving compounds with the glyph tape and separator lattice.
   *             Measured: 1 497 -> 1 412 on ls-l-real (-85, -5.7 %), 29-lane gate
   *             12 634 -> 12 544.
   * STOICHEION  recomputes a fixed-width table in its columns' own alphabets. It is
   *             measured, tried, and LOSES on every lane of this corpus (the key is
   *             bound by the width vector, not by the grammar). It stays in the
   *             chain because it costs one call, cannot regress by construction, and
   *             its continued refusal is the negative result that supports the
   *             kernel claim: the frontier is a near-optimal residual coder here.
   *
   * A candidate that throws is not a candidate: both are wrapped, so a malformed
   * document cannot take the frontier down with it.
   */
  type WideResult = { applied: boolean; decoded: string; message: string; messageTokens: number; notes: string };
  const admit = (name: string, cand: WideResult | null): void => {
    if (!cand || !cand.applied || cand.decoded !== text || cand.messageTokens >= best.messageTokens) return;
    best = {
      ...best,
      wire: cand.message,
      message: cand.message,
      decoded: cand.decoded,
      messageTokens: cand.messageTokens,
      applied: true,
      arm: 'tagstack' as TagstackResult['arm'],
      notes: `${name} ${cand.notes}; ${best.notes}`,
    };
  };
  try { admit('PROSPHYSIS', prosphysisEncode(text, enc) as unknown as WideResult); } catch { /* not a candidate */ }
  // X90 ΣΥΜΦΥΊΑ generalises PROSPHYSIS from one hardcoded shape (a symlink target that
  // STARTS with the field before " -> ") to a template FITTED over the record set: any field
  // pair, either affix direction, and a constant prefix or suffix stated in the contract.
  // It is admitted AFTER PROSPHYSIS and handed the incumbent's complete-message cost, so it
  // makes one frontier call and is scored against the number a user would actually get, not
  // against the gate. Measured where the two overlap and where they do not:
  //   ls-l-real     PROSPHYSIS's own relation; ΣΥΜΦΥΊΑ fits it without being told about
  //                 arrows and lands close (see docs/codecs.md §X90 for the number).
  //   ls-la-usrbin  PROSPHYSIS CANNOT fire: the target ENDS with the link name
  //                 (/etc/alternatives/python3 vs python3), which is the prefix direction it
  //                 measures and declines to admit. ΣΥΜΦΥΊΑ's constant-prefix form takes it.
  try { admit('ΣΥΜΦΥΊΑ', symphyiaEncode(text, enc, best.messageTokens) as unknown as WideResult); } catch { /* not a candidate */ }
  try { admit('STOICHEION', stoicheionEncode(text, enc) as unknown as WideResult); } catch { /* not a candidate */ }
  return best;
}

