/**
 * ATX-RELEASE (X50) — implicit release-heading frame elision.
 *
 * Exact transform for a narrow Markdown shape: a level-two ATX heading whose
 * entire suffix is ` (YYYY-MM-DD)`. The wire line omits `## ` and the date
 * parentheses, becoming `TITLE YYYY-MM-DD`. There is no per-line marker: the
 * decoder recognizes the collapsed line shape from one in-band rule.
 *
 * The rule is only injective on a checked input: every non-target line that
 * would match the collapsed `TITLE YYYY-MM-DD` shape makes the transform
 * refuse. The candidate uses DAEDALUS on the transformed text and compares it
 * with AKOLOUTHIA-2 on the original. AKOLOUTHIA-2 is a named member of the X49
 * TAGSTACK parent set. A candidate that does not beat that member cannot beat
 * the full frontier, so it is rejected early. Only a candidate below
 * AKOLOUTHIA-2 proceeds to the expensive complete TAGSTACK + SIBLING-TEMPLATE
 * comparison. A failed full comparison returns the measured best parent.
 *
 * This is repository-level work, not a claim of a new compression primitive.
 * It is adjacent to Markdown/markup syntax elision, format-aware compression,
 * and this stack's EPAGOGE/STIGME mechanisms; no universal novelty is claimed.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

const MAX_TEXT_CHARS = 100_000;
const MIN_HEADINGS = 3;
const ATX_HEADING = /^## (.+) \(([0-9]{4}-[0-9]{2}-[0-9]{2})\)$/;
const COLLAPSED_LINE = /^(.+) ([0-9]{4}-[0-9]{2}-[0-9]{2})$/;

/** The exact decoder rule, included before the parent message in every candidate. */
export const ATX_RELEASE_CONTRACT =
  'After parent decode, replace each line matching ^(.+) ([0-9]{4}-[0-9]{2}-[0-9]{2})$ with ## $1 ($2); leave other lines and line endings unchanged.';

export interface AtxReleasePlan {
  text: string;
  rows: number;
  refusedCollisions: number;
}

export interface AtxReleaseResult {
  codec: 'atx-release';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  precheckParentTokens: number;
  parentTokens: number;
  messageTokens: number;
  parentCodec: string;
  /** Costs are present only for parents actually measured on this call. */
  parentCosts: Record<string, number>;
  /** False when the full TAGSTACK/SIBLING tournament was safely pruned or failed. */
  fullFrontierMeasured: boolean;
  applied: boolean;
  rows: number;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateParentTokens: number | null;
  candidateParentCodec: string | null;
  candidateParentCosts: Record<string, number> | null;
  comparison: string;
  notes: string;
  ms: number;
}

function mapLinesPreservingEol(text: string, map: (line: string) => string): string {
  const lines = text.split('\n');
  return lines.map((raw, i) => {
    const hasLf = i < lines.length - 1;
    const hasCrLf = hasLf && raw.endsWith('\r');
    const body = hasCrLf ? raw.slice(0, -1) : raw;
    return map(body) + (hasCrLf ? '\r' : '');
  }).join('\n');
}

function hasBareCarriageReturn(text: string): boolean {
  return text.replace(/\r\n/g, '').includes('\r');
}

function isWellFormedUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

/**
 * Construct the marker-free line transform, or refuse if its inverse would be
 * ambiguous. Supports LF and CRLF; lone CR line endings are outside the domain.
 */
export function atxReleaseTransform(text: string): AtxReleasePlan | null {
  if (!text.length || text.length > MAX_TEXT_CHARS || hasBareCarriageReturn(text) || !isWellFormedUnicode(text)) return null;
  const lines = text.split('\n');
  const target = new Map<number, { title: string; date: string }>();
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const body = i < lines.length - 1 && raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const match = ATX_HEADING.exec(body);
    if (match) target.set(i, { title: match[1]!, date: match[2]! });
  }
  if (target.size < MIN_HEADINGS) return null;

  let collisions = 0;
  for (let i = 0; i < lines.length; i++) {
    if (target.has(i)) continue;
    const raw = lines[i]!;
    const body = i < lines.length - 1 && raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (COLLAPSED_LINE.test(body)) collisions++;
  }
  if (collisions > 0) return null;

  const transformed = mapLinesPreservingEol(text, (line) => {
    const match = ATX_HEADING.exec(line);
    return match ? `${match[1]} ${match[2]}` : line;
  });
  if (atxReleaseRestore(transformed) !== text) return null;
  return { text: transformed, rows: target.size, refusedCollisions: collisions };
}

/** Apply the in-band ATX-RELEASE inverse to a parent-decoded body. */
export function atxReleaseRestore(text: string): string {
  return mapLinesPreservingEol(text, (line) => {
    const match = COLLAPSED_LINE.exec(line);
    return match ? `## ${match[1]} (${match[2]})` : line;
  });
}

interface MeasuredParent {
  wire: string;
  message: string;
  decoded: string;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
}

function measuredAkolouthia2(text: string, enc: EncodingName): MeasuredParent {
  const parent = akolouthia2Encode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('ATX-RELEASE AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return {
    wire: parent.wire,
    message: parent.decoderPrompt,
    decoded: parent.decoded,
    messageTokens: directTokens,
    parentCodec: 'akolouthia2',
    parentCosts: { akolouthia2: directTokens },
  };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasuredParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('ATX-RELEASE DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return {
    wire: parent.wire,
    message: parent.decoderPrompt,
    decoded: parent.decoded,
    messageTokens: directTokens,
    parentCodec: 'daedalus',
    parentCosts: { daedalus: directTokens },
  };
}

function measuredFrontier(text: string, enc: EncodingName): MeasuredParent {
  const tag: TagstackResult = tagstackEncode(text, enc);
  if (!tag.frontierComplete || !tag.exact || tag.decoded !== text) {
    throw new Error('ATX-RELEASE baseline frontier did not complete exactly');
  }
  const sibling: SiblingTemplateResult = siblingTemplateEncode(text, enc, tag);
  if (!sibling.exact || sibling.decoded !== text) {
    throw new Error('ATX-RELEASE SIBLING-TEMPLATE parent did not reconstruct exactly');
  }
  const parentCosts = { ...tag.frontierCosts, 'sibling-template': sibling.messageTokens };
  const siblingWon = sibling.applied && sibling.messageTokens < tag.messageTokens;
  return {
    wire: siblingWon ? sibling.wire : tag.wire,
    message: siblingWon ? sibling.message : tag.message,
    decoded: text,
    messageTokens: Math.min(tag.messageTokens, sibling.messageTokens),
    parentCodec: siblingWon ? 'sibling-template' : tag.parentCodec,
    parentCosts,
  };
}

function fallback(
  text: string,
  inTokens: number,
  parent: MeasuredParent,
  rows: number,
  candidateTokens: number | null,
  candidateExact: boolean | null,
  comparison: string,
  notes: string,
  ms: number,
  candidateParent: MeasuredParent | null = null,
  fullFrontierMeasured = false,
  precheckParentTokens = parent.messageTokens,
): AtxReleaseResult {
  return {
    codec: 'atx-release', wire: parent.wire, message: parent.message, decoded: text,
    exact: parent.decoded === text, inTokens, precheckParentTokens,
    parentTokens: parent.messageTokens, messageTokens: parent.messageTokens, parentCodec: parent.parentCodec,
    parentCosts: parent.parentCosts, fullFrontierMeasured,
    applied: false, rows, candidateTokens, candidateExact,
    candidateParentTokens: candidateParent?.messageTokens ?? null,
    candidateParentCodec: candidateParent?.parentCodec ?? null,
    candidateParentCosts: candidateParent?.parentCosts ?? null,
    comparison, notes, ms,
  };
}

/**
 * Encode with a cheap, necessary AKOLOUTHIA-2 precheck, then the full X49
 * frontier only for candidates that clear it. The early fallback is exactly
 * AKOLOUTHIA-2; a positive candidate is never emitted without a completed
 * full-frontier gate.
 */
export function atxReleaseEncode(text: string, enc: EncodingName = 'o200k_base'): AtxReleaseResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = atxReleaseTransform(text);
  const parent = measuredAkolouthia2(text, enc);
  if (!plan) {
    return fallback(text, inTokens, parent, 0, null, null,
      'AKOLOUTHIA-2 fallback only; no ATX-RELEASE candidate was formed',
      'ineligible or ambiguous input; returned the exact AKOLOUTHIA-2 message', Date.now() - started);
  }

  let candidateParent: MeasuredParent;
  try {
    candidateParent = measuredDaedalus(plan.text, enc);
  } catch {
    return fallback(text, inTokens, parent, plan.rows, null, null,
      'DAEDALUS-candidate exactness/cost check failed',
      'candidate parent failed; returned the original exact AKOLOUTHIA-2 message', Date.now() - started);
  }
  const candidateMessage = `${ATX_RELEASE_CONTRACT}\n${candidateParent.message}`;
  const candidateTokens = countTokens(candidateMessage, enc);
  const decoded = atxReleaseRestore(candidateParent.decoded);
  const candidateExact = candidateParent.decoded === plan.text && decoded === text;
  if (!candidateExact) {
    return fallback(text, inTokens, parent, plan.rows, candidateTokens, false,
      'DAEDALUS-candidate exactness rejection',
      'candidate inverse failed exactness; returned the original exact AKOLOUTHIA-2 message', Date.now() - started,
      candidateParent);
  }

  // AKOLOUTHIA-2 is one member of the X49 measured TAGSTACK set. Losing to
  // that actual parent proves the candidate cannot beat the full set.
  if (candidateTokens >= parent.messageTokens) {
    return fallback(text, inTokens, parent, plan.rows, candidateTokens, true,
      'AKOLOUTHIA-2 necessary-condition rejection; full TAGSTACK/SIBLING tournament safely skipped',
      `candidate M=${candidateTokens} >= AKOLOUTHIA-2 M=${parent.messageTokens}; it therefore cannot be below a frontier that includes AKOLOUTHIA-2`,
      Date.now() - started, candidateParent);
  }

  let frontier: MeasuredParent;
  try {
    frontier = measuredFrontier(text, enc);
  } catch {
    return fallback(text, inTokens, parent, plan.rows, candidateTokens, true,
      'candidate cleared AKOLOUTHIA-2 but the full TAGSTACK/SIBLING tournament did not complete',
      'returned the exact AKOLOUTHIA-2 fallback; no full-frontier win is claimed', Date.now() - started,
      candidateParent, false);
  }
  if (candidateTokens >= frontier.messageTokens) {
    return fallback(text, inTokens, frontier, plan.rows, candidateTokens, true,
      'full TAGSTACK/SIBLING same-source frontier rejection',
      `candidate M=${candidateTokens} >= measured frontier M=${frontier.messageTokens}; returned the measured best parent`,
      Date.now() - started, candidateParent, true, parent.messageTokens);
  }
  return {
    codec: 'atx-release', wire: candidateParent.wire, message: candidateMessage, decoded,
    exact: true, inTokens, precheckParentTokens: parent.messageTokens,
    parentTokens: frontier.messageTokens, messageTokens: candidateTokens,
    parentCodec: frontier.parentCodec, parentCosts: frontier.parentCosts,
    fullFrontierMeasured: true, applied: true, rows: plan.rows,
    candidateTokens, candidateExact: true,
    candidateParentTokens: candidateParent.messageTokens,
    candidateParentCodec: candidateParent.parentCodec,
    candidateParentCosts: candidateParent.parentCosts,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
    notes: `elided ${plan.rows} dated level-two ATX heading frames; complete-message M=${candidateTokens} < same-source frontier M=${frontier.messageTokens}`,
    ms: Date.now() - started,
  };
}
