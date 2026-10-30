import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

/** Exact tree-output indentation canonicalization for tree(1)-style listings. */
export const RHIZOMA_MAX_CHARS = 200_000;
const NBSP = '\u00a0';
const BRANCHES = ['├──', '└──'] as const;
export const RHIZOMA_CONTRACT = 'RHIZOMA: ^ before a tree branch means │ plus two NBSP.';

function branchOffset(line: string): number {
  const found = BRANCHES.map((mark) => line.indexOf(mark)).filter((i) => i >= 0);
  return found.length ? Math.min(...found) : -1;
}

/**
 * Admit only inputs where every NBSP is exactly a two-character tree-indent
 * pair after a vertical continuation glyph. Remove those pairs; the tree
 * syntax itself identifies all insertion sites, so no position table ships.
 */
export function rhizomaPlan(text: string): string | null {
  if (!text || text.length > RHIZOMA_MAX_CHARS) return null;
  const converted = new Set<number>();
  const barsAt: number[] = [];
  let treeEntries = 0;
  let bars = 0;
  let lineStart = 0;
  while (lineStart < text.length) {
    const nl = text.indexOf('\n', lineStart);
    const lineEnd = nl < 0 ? text.length : nl;
    const line = text.slice(lineStart, lineEnd);
    const branch = branchOffset(line);
    if (branch >= 0) {
      treeEntries++;
      for (let i = 0; i < branch; i++) {
        if (line[i] === '^') return null;
        if (line[i] !== '│') continue;
        bars++;
        if (line.slice(i + 1, i + 3) !== NBSP + NBSP) return null;
        barsAt.push(lineStart + i);
        converted.add(lineStart + i + 1);
        converted.add(lineStart + i + 2);
        i += 2;
      }
    }
    lineStart = nl < 0 ? text.length : nl + 1;
  }
  if (treeEntries < 2 || bars < 2 || converted.size < 8) return null;
  let actualNbsp = 0;
  for (let i = 0; i < text.length; i++) if (text[i] === NBSP) {
    actualNbsp++;
    if (!converted.has(i)) return null;
  }
  if (actualNbsp !== converted.size) return null;
  const chunks: string[] = [];
  let cursor = 0;
  for (const i of barsAt) {
    chunks.push(text.slice(cursor, i), '^');
    cursor = i + 3;
  }
  chunks.push(text.slice(cursor));
  const transformed = chunks.join('');
  return rhizomaExpand(transformed) === text ? transformed : null;
}

/** Deterministic inverse; null means the stated tree grammar is violated. */
export function rhizomaExpand(text: string): string | null {
  if (!text || text.length > RHIZOMA_MAX_CHARS) return null;
  const chunks: string[] = [];
  let treeEntries = 0;
  let bars = 0;
  let lineStart = 0;
  while (lineStart < text.length) {
    const nl = text.indexOf('\n', lineStart);
    const lineEnd = nl < 0 ? text.length : nl;
    const line = text.slice(lineStart, lineEnd);
    const branch = branchOffset(line);
    if (branch >= 0) {
      treeEntries++;
      let cursor = 0;
      for (let i = 0; i < branch; i++) {
        if (line[i] === '│') return null;
        if (line[i] !== '^') continue;
        bars++;
        chunks.push(line.slice(cursor, i), '│', NBSP, NBSP);
        cursor = i + 1;
      }
      chunks.push(line.slice(cursor));
    } else chunks.push(line);
    if (nl >= 0) chunks.push('\n');
    lineStart = nl < 0 ? text.length : nl + 1;
  }
  if (treeEntries < 2 || bars < 2) return null;
  return chunks.join('');
}

export interface RhizomaResult {
  codec: 'rhizoma';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  inTokens: number;
  messageTokens: number;
  frontierTokens: number;
  parentCodec: string;
  elidedNbsp: number;
  planMs: number;
  fullFrontierMeasured: boolean;
  comparison: string;
}

function minimum(tag: TagstackResult, sibling: SiblingTemplateResult) {
  return tag.messageTokens <= sibling.messageTokens
    ? { message: tag.message, decoded: tag.decoded, tokens: tag.messageTokens, parent: tag.parentCodec, complete: tag.frontierComplete }
    : { message: sibling.message, decoded: sibling.decoded, tokens: sibling.messageTokens, parent: sibling.parentCodec, complete: true };
}

/** Complete-message gate: transformed tree text is fully re-encoded by the same parent frontier. */
export function rhizomaEncode(text: string, enc: EncodingName = 'o200k_base'): RhizomaResult {
  const started = Date.now();
  const transformed = rhizomaPlan(text);
  const planMs = Date.now() - started;
  const inTokens = countTokens(text, enc);
  const tag = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tag);
  const source = minimum(tag, sibling);
  const sourceExact = tag.exact && sibling.exact && tag.decoded === text && sibling.decoded === text;
  const elidedNbsp = transformed ? [...text].filter((c) => c === NBSP).length : 0;
  const fallback: RhizomaResult = {
    codec: 'rhizoma', message: source.message, decoded: text, exact: sourceExact,
    applied: false, inTokens, messageTokens: source.tokens, frontierTokens: source.tokens,
    parentCodec: source.parent, elidedNbsp: 0, planMs,
    fullFrontierMeasured: source.complete,
    comparison: transformed ? 'no strict complete-message gain; exact measured-frontier fallback' : 'not a supported tree indentation pattern; exact measured-frontier fallback',
  };
  if (!transformed || !source.complete || !sourceExact) return fallback;
  const candidateTag = tagstackEncode(transformed, enc);
  const candidateSibling = siblingTemplateEncode(transformed, enc, candidateTag);
  const candidate = minimum(candidateTag, candidateSibling);
  const candidateExact = candidateTag.exact && candidateSibling.exact
    && candidateTag.decoded === transformed && candidateSibling.decoded === transformed;
  const restored = candidateExact ? rhizomaExpand(candidate.decoded) : null;
  if (!candidate.complete || !candidateExact || restored !== text) return {
    ...fallback, comparison: 'candidate frontier incomplete or byte-exact restore failed; measured-frontier fallback',
  };
  const message = `${RHIZOMA_CONTRACT}\n${candidate.message}`;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= source.tokens) return {
    ...fallback, comparison: `exact candidate ${messageTokens} >= measured source frontier ${source.tokens}; fallback`,
  };
  return {
    codec: 'rhizoma', message, decoded: text, exact: true, applied: true,
    inTokens, messageTokens, frontierTokens: source.tokens,
    parentCodec: `${source.parent}→${candidate.parent}`, elidedNbsp,
    planMs, fullFrontierMeasured: true,
    comparison: `strict exact complete-message win ${messageTokens} < measured source frontier ${source.tokens}`,
  };
}
