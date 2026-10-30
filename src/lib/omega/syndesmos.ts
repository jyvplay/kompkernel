/**
 * SYNDESMOS (X61) — exact repeated-target interning for Markdown inline links.
 *
 * Factor a shared exact URL prefix through an in-band table, and replace
 * repeated inline-link destinations with first-seen IDs. The reader restores
 * the exact URL bytes before returning the original text. This narrow operator
 * leaves labels, punctuation, whitespace, prose, and bare URL occurrences
 * untouched. Markdown references and URL dictionaries/prefix factoring are
 * established prior art; no global novelty claim is made. Emission is gated
 * against the current complete codec frontier. See docs/codecs.md and
 * bench/x61/receipts for scope and results.
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusDecode } from './daedalus';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const SYNDESMOS_MAX_CHARS = 120_000;
export const SYNDESMOS_MAX_LINKS = 20_000;
export const SYNDESMOS_MARK = '⟦';

export interface SyndesmosPlan {
  transformed: string;
  urls: string[];
  prefix: string | null;
  linkCount: number;
  eligibleLinks: number;
  contract: string;
}

// Deliberately narrow parser: only unescaped, single-line labels without nested
// brackets and destinations without whitespace/parentheses. Unsupported forms
// stay byte-literal. Match indices point at the exact target URL span.
const INLINE_LINK = /\[([^\[\]\n]+)\]\((https?:\/\/[^\s()< >]+)\)/gu;
const LINK_OR_REF = /\[([^\[\]\n]+)\]\(([^\s()< >]+)\)/gu;
const PREFIX_HEADER = /^<!-- SYNDESMOS-PREFIX-TABLE v1\nP0=(https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~%+-]+)+\/)\n-->\n/;
const PREFIX_MARK = /⟦P0⟧/gu;

/** Expand in-band prefix factoring and first-seen URL references exactly. */
export function syndesmosExpand(text: string, _urls: string[] = []): string | null {
  const header = PREFIX_HEADER.exec(text);
  const prefix = header?.[1] ?? null;
  let payload = header ? text.slice(header[0].length) : text;
  const seen: string[] = [];
  const ids = new Map<string, number>();
  let invalid = false;
  const restored = payload.replace(LINK_OR_REF, (whole, label: string, target: string) => {
    const ref = /^⟦U(\d+)⟧$/.exec(target);
    if (ref) {
      const url = seen[Number(ref[1])];
      if (url === undefined) { invalid = true; return whole; }
      return `[${label}](${url})`;
    }
    if (target.includes('⟦P0⟧')) {
      if (!prefix) { invalid = true; return whole; }
      target = target.replace(PREFIX_MARK, prefix);
    }
    if (/⟦[UP]/u.test(target)) { invalid = true; return whole; }
    if (/^https?:\/\//u.test(target)) {
      if (!ids.has(target)) { ids.set(target, seen.length); seen.push(target); }
      return `[${label}](${target})`;
    }
    return whole;
  });
  return invalid ? null : restored;
}

function prefixCandidates(urls: string[]): Array<{ prefix: string; hits: number; estimate: number }> {
  const hits = new Map<string, number>();
  for (const url of urls) {
    for (let i = url.indexOf('/', 8); i >= 0; i = url.indexOf('/', i + 1)) {
      const prefix = url.slice(0, i + 1);
      if (!/^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~%+-]+)+\/$/u.test(prefix)) continue;
      hits.set(prefix, (hits.get(prefix) ?? 0) + 1);
    }
  }
  return [...hits].filter(([, n]) => n >= 3).map(([prefix, n]) => ({
    prefix, hits: n, estimate: n * (countTokens(prefix, 'o200k_base') - countTokens('⟦P0⟧', 'o200k_base')) - countTokens(prefix, 'o200k_base') - 24,
  })).filter((x) => x.estimate > 0)
    .sort((a, b) => b.estimate - a.estimate || a.prefix.localeCompare(b.prefix)).slice(0, 64);
}

function buildPlan(text: string, matches: RegExpMatchArray[], prefix: string | null): SyndesmosPlan | null {
  const urls: string[] = [];
  const ids = new Map<string, number>();
  const chunks: string[] = [];
  let cursor = 0;
  let eligibleLinks = 0;
  for (const m of matches) {
    const url = m[2]!;
    const compact = prefix && url.startsWith(prefix) ? `⟦P0⟧${url.slice(prefix.length)}` : url;
    const existing = ids.get(compact);
    const start = (m.index as number) + m[0].lastIndexOf(url);
    chunks.push(text.slice(cursor, start), existing === undefined ? compact : `⟦U${existing}⟧`);
    cursor = start + url.length;
    if (existing !== undefined) eligibleLinks++;
    else { ids.set(compact, urls.length); urls.push(compact); }
  }
  chunks.push(text.slice(cursor));
  let transformed = chunks.join('');
  const prefixHeader = prefix ? `<!-- SYNDESMOS-PREFIX-TABLE v1\nP0=${prefix}\n-->\n` : '';
  if (prefix) transformed = prefixHeader + transformed;
  const contract = prefix
    ? 'SYNDESMOS v2. First decode the payload with the parent instructions. If its first line is the SYNDESMOS-PREFIX-TABLE, read its exact P0 URL prefix and remove the header. In supported inline-link destinations, replace ⟦P0⟧ by that prefix. Then scan left to right: each first literal HTTP(S) destination establishes a zero-based URL ID n; ⟦Un⟧ means that earlier fully expanded URL. Expand destinations only and preserve all other bytes; do not render Markdown.'
    : 'SYNDESMOS v1. First decode the payload using the parent codec instructions in this same message. Then scan supported Markdown inline links left to right: each literal HTTP(S) destination introduces the next distinct URL at zero-based ID n; ⟦Un⟧ means that earlier literal URL. Expand only the destination; preserve every other byte. This restores source text exactly; do not render Markdown.';
  if (eligibleLinks === 0 && !prefix) return null;
  if (syndesmosExpand(transformed) !== text) return null;
  return { transformed, urls, prefix, linkCount: matches.length, eligibleLinks, contract };
}

export function syndesmosPlan(text: string): SyndesmosPlan | null {
  if (!text || text.length > SYNDESMOS_MAX_CHARS || text.includes(SYNDESMOS_MARK)) return null;
  const matches = [...text.matchAll(INLINE_LINK)];
  if (matches.length < 2 || matches.length > SYNDESMOS_MAX_LINKS) return null;
  const urls = matches.map((m) => m[2]!);
  const counts = new Map<string, number>();
  for (const url of urls) counts.set(url, (counts.get(url) ?? 0) + 1);
  const repeated = [...counts.values()].some((n) => n >= 2);
  const plain = repeated ? buildPlan(text, matches, null) : null;
  let best = plain;
  for (const candidate of prefixCandidates(urls)) {
    const plan = buildPlan(text, matches, candidate.prefix);
    if (!plan) continue;
    const cost = countTokens(plan.transformed, 'o200k_base') + countTokens(plan.contract, 'o200k_base');
    const bestCost = best ? countTokens(best.transformed, 'o200k_base') + countTokens(best.contract, 'o200k_base') : Infinity;
    if (cost < bestCost) best = plan;
  }
  return best;
}

export interface SyndesmosResult {
  codec: 'syndesmos';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  messageTokens: number;
  inTokens: number;
  baselineTokens: number;
  frontierTokens: number;
  parentCodec: string;
  urls: number;
  linkCount: number;
  eligibleLinks: number;
  planMs: number;
  fullFrontierMeasured: boolean;
  comparison: string;
}

function minFrontier(tag: TagstackResult, sibling: SiblingTemplateResult) {
  return tag.messageTokens <= sibling.messageTokens
    ? { message: tag.message, decoded: tag.decoded, tokens: tag.messageTokens, parent: tag.parentCodec, complete: tag.frontierComplete }
    : { message: sibling.message, decoded: sibling.decoded, tokens: sibling.messageTokens, parent: sibling.parentCodec, complete: true };
}

/** Full same-source measured TAGSTACK runtime-parent + SIBLING-TEMPLATE gate. */
export function syndesmosEncode(text: string, enc: EncodingName = 'o200k_base'): SyndesmosResult {
  const started = Date.now();
  const plan = syndesmosPlan(text);
  const planMs = Date.now() - started;
  const inTokens = countTokens(text, enc);
  const tag = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tag);
  const base = minFrontier(tag, sibling);
  const frontierExact = tag.exact && sibling.exact && tag.decoded === text && sibling.decoded === text;
  const fallback: SyndesmosResult = {
    codec: 'syndesmos', message: base.message, decoded: text, exact: frontierExact,
    applied: false, messageTokens: base.tokens, inTokens, baselineTokens: base.tokens,
    frontierTokens: base.tokens, parentCodec: base.parent, urls: 0, linkCount: 0,
    eligibleLinks: 0, planMs, fullFrontierMeasured: base.complete,
    comparison: 'no eligible repeated inline destination; measured frontier fallback',
  };
  if (!plan || !base.complete || !frontierExact) return fallback;
  // Encode the transformed material through the same complete runtime frontier;
  // a cheap DAEDALUS-only proxy would misstate the comparator and can be much
  // worse when this transform changes the parent's match structure.
  const candidateTag = tagstackEncode(plan.transformed, enc);
  const candidateSibling = siblingTemplateEncode(plan.transformed, enc, candidateTag);
  const candidateBase = minFrontier(candidateTag, candidateSibling);
  const candidateExact = candidateTag.exact && candidateSibling.exact
    && candidateTag.decoded === plan.transformed && candidateSibling.decoded === plan.transformed;
  const restored = candidateExact ? syndesmosExpand(candidateBase.decoded) : null;
  if (!candidateBase.complete || !candidateExact || restored !== text) return {
    ...fallback,
    comparison: 'candidate frontier incomplete or exact restore failed; measured source frontier fallback',
  };
  const message = `${plan.contract}\n${candidateBase.message}`;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= base.tokens) return {
    ...fallback,
    comparison: `exact candidate ${messageTokens} >= measured source frontier ${base.tokens}; fallback`,
  };
  return {
    codec: 'syndesmos', message, decoded: text, exact: true, applied: true,
    messageTokens, inTokens, baselineTokens: base.tokens, frontierTokens: base.tokens,
    parentCodec: `${base.parent}→${candidateBase.parent}`, urls: plan.urls.length, linkCount: plan.linkCount,
    eligibleLinks: plan.eligibleLinks, planMs, fullFrontierMeasured: true,
    comparison: `strict exact complete-message win ${messageTokens} < measured TAGSTACK+SIBLING source frontier ${base.tokens}`,
  };
}

/** Decode a raw DAEDALUS payload and expand a previously parsed URL table. */
export function syndesmosDecodePayload(wire: string, urls: string[]): string | null {
  return syndesmosExpand(daedalusDecode(wire), urls);
}
