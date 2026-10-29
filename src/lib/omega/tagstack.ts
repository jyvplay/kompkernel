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
  arm: 'tagstack' | 'synkrisis-parent' | 'current-frontier-parent';
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
  const E = <T,>(fn: () => T): T => workEpoch(workBudgetFor(text.length), fn);
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
    child = workEpoch(workBudgetFor(plan.text.length), () => apographeEncode(plan.text, enc));
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
export function tagstackEncode(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  return tagstackEncodeInner(text, enc);
}
