/**
 * JSON-ESCAPE-FOLD (X66): fold a small, explicit set of safe JSON Unicode
 * escapes to literal ASCII punctuation, with a collision-free in-band marker
 * that makes the exact lowercase escape spelling recoverable.
 *
 * This is a narrow syntax transform, not a claim of a new compression
 * primitive. A complete decoder envelope carries the marker rule and the
 * self-contained TAGSTACK message for the transformed JSON.
 */
import { countTokens, type EncodingName } from './bpe';
import { siblingTemplateEncode } from './sibling-template';
import { tagstackEncode, type TagstackResult } from './tagstack';

export const JSON_ESCAPE_FOLD_MAX_CHARS = 80_000;
const ESCAPES = new Map<string, string>([
  ['\\u003c', '<'], ['\\u003e', '>'], ['\\u003d', '='],
  ['\\u0026', '&'], ['\\u0027', "'"],
]);
const REVERSE = new Map([...ESCAPES].map(([escape, literal]) => [literal, escape]));
const PUA_START = 0xe000;
const PUA_END = 0xf8ff;
const SUPPLEMENTARY_PUA_RANGES: ReadonlyArray<readonly [number, number]> = [[0xf0000, 0xffffd], [0x100000, 0x10fffd]];

function isPrivateUseMarker(cp: number): boolean {
  return (cp >= PUA_START && cp <= PUA_END)
    || SUPPLEMENTARY_PUA_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

export interface JsonEscapeFoldPlan {
  marker: string;
  transformed: string;
  replacements: number;
  byEscape: Record<string, number>;
  exact: boolean;
}

export interface JsonEscapeFoldResult extends TagstackResult {
  jsonEscapeFold: boolean;
  candidateMessage: string | null;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  replacements: number;
  sourceFrontierTokens: number;
}

export function jsonEscapeFoldContract(marker: string): string {
  return `JSON-ESCAPE-FOLD-1 marker=${marker.codePointAt(0)!.toString(16).toUpperCase()} (${marker}): after decoding the following complete parent message, scan its text left to right. Each occurrence of the stated marker must be followed by exactly one of < > = & '. Replace the marker and that next character with, respectively, \\u003c, \\u003e, \\u003d, \\u0026, or \\u0027. Copy every other character unchanged. The encoder chooses a marker absent from the original text. These five lowercase escapes are folded only inside JSON strings; all other source characters and bytes are unchanged.`;
}

function selectMarker(text: string): string | null {
  const present = new Set(text);
  for (let cp = PUA_START; cp <= PUA_END; cp++) {
    const marker = String.fromCharCode(cp);
    if (!present.has(marker)) return marker;
  }
  for (const [lo, hi] of SUPPLEMENTARY_PUA_RANGES) {
    for (let cp = lo; cp <= hi; cp++) {
      const marker = String.fromCodePoint(cp);
      if (!present.has(marker)) return marker;
    }
  }
  return null;
}

/** Transform only recognized JSON string escapes; malformed JSON is refused. */
export function jsonEscapeFoldPlan(text: string): JsonEscapeFoldPlan | null {
  if (!text || text.length > JSON_ESCAPE_FOLD_MAX_CHARS) return null;
  try { JSON.parse(text); } catch { return null; }
  const marker = selectMarker(text);
  if (!marker) return null;

  let out = '';
  let inString = false;
  let replacements = 0;
  const byEscape: Record<string, number> = {};
  for (let i = 0; i < text.length;) {
    const c = text[i];
    if (!inString) {
      out += c;
      i++;
      if (c === '"') inString = true;
      continue;
    }
    if (c === '"') {
      out += c;
      inString = false;
      i++;
      continue;
    }
    if (c === '\\') {
      const candidate = text.slice(i, i + 6);
      const literal = ESCAPES.get(candidate);
      if (literal) {
        out += marker + literal;
        byEscape[candidate] = (byEscape[candidate] ?? 0) + 1;
        replacements++;
        i += 6;
      } else {
        // Valid JSON guarantees a following escape character. Copy the pair
        // atomically so an escaped quote cannot change scanner state.
        out += text.slice(i, i + 2);
        i += 2;
      }
      continue;
    }
    out += c;
    i++;
  }
  const exact = jsonEscapeFoldDecode(out, marker) === text;
  if (!exact || replacements === 0) return null;
  return { marker, transformed: out, replacements, byEscape, exact };
}

/** Stateless inverse of the serialized in-band marker rule. */
export function jsonEscapeFoldDecode(transformed: string, marker: string): string {
  if ([...marker].length !== 1) throw new Error('marker must be one Unicode scalar');
  let out = '';
  for (let i = 0; i < transformed.length;) {
    if (transformed.startsWith(marker, i)) {
      const literal = transformed[i + marker.length];
      const escaped = REVERSE.get(literal);
      if (!escaped) throw new Error('invalid JSON-ESCAPE-FOLD marker target');
      out += escaped;
      i += marker.length + 1;
    } else {
      out += transformed[i++];
    }
  }
  return out;
}

/** Parse only the self-contained transform header; the remainder is parent data. */
export function jsonEscapeFoldParseEnvelope(message: string): { marker: string; parentMessage: string } | null {
  const newline = message.indexOf('\n');
  if (newline < 0) return null;
  const header = message.slice(0, newline);
  const match = /^JSON-ESCAPE-FOLD-1 marker=([0-9A-F]+) \((.+)\):/.exec(header);
  if (!match) return null;
  const cp = Number.parseInt(match[1], 16);
  if (!Number.isInteger(cp) || !isPrivateUseMarker(cp) || [...match[2]].length !== 1 || match[2].codePointAt(0) !== cp) return null;
  const marker = String.fromCodePoint(cp);
  if (header !== jsonEscapeFoldContract(marker)) return null;
  return { marker, parentMessage: message.slice(newline + 1) };
}

/**
 * Invert from the serialized header plus an independently decoded parent text;
 * no plan/result metadata is consulted.
 */
export function jsonEscapeFoldDecodeEnvelope(message: string, decodedParent: string): string | null {
  const envelope = jsonEscapeFoldParseEnvelope(message);
  if (!envelope) return null;
  try { return jsonEscapeFoldDecode(decodedParent, envelope.marker); }
  catch { return null; }
}

function cloneResult(result: TagstackResult, ms: number): TagstackResult {
  return { ...result, ms, frontierCosts: { ...result.frontierCosts },
    frontierReportedCosts: { ...result.frontierReportedCosts } };
}

/**
 * Compare complete in-band messages on the same source. The candidate is
 * emitted only on exact restoration and a strict measured o200k/tokenizer win.
 */
export function jsonEscapeFoldEncode(text: string, enc: EncodingName = 'o200k_base'): JsonEscapeFoldResult {
  const started = Date.now();
  const baseline = tagstackEncode(text, enc);
  const baselineSibling = siblingTemplateEncode(text, enc, baseline);
  const sourceFrontierTokens = Math.min(baseline.messageTokens, baselineSibling.messageTokens);
  const sourceWinnerMessage = baselineSibling.messageTokens < baseline.messageTokens ? baselineSibling.message : baseline.message;
  const sourceWinnerExact = baselineSibling.messageTokens < baseline.messageTokens ? baselineSibling.exact : baseline.exact;
  const fallback = (notes: string, plan: JsonEscapeFoldPlan | null = null,
    candidateMessage: string | null = null, candidateTokens: number | null = null,
    candidateExact: boolean | null = null): JsonEscapeFoldResult => ({
      ...cloneResult(baseline, Date.now() - started),
      message: sourceWinnerMessage,
      messageTokens: sourceFrontierTokens,
      parentTokens: sourceFrontierTokens,
      parentCodec: baseline.parentCodec,
      decoded: text,
      exact: sourceWinnerExact && baseline.frontierComplete,
      jsonEscapeFold: false,
      candidateMessage, candidateTokens, candidateExact,
      replacements: plan?.replacements ?? 0,
      sourceFrontierTokens,
      notes: `${notes}; fallback=${baseline.parentCodec}:${sourceFrontierTokens}`,
    });

  if (!baseline.exact || !baseline.frontierComplete || !sourceWinnerExact)
    return fallback('source frontier incomplete');
  const plan = jsonEscapeFoldPlan(text);
  if (!plan) return fallback('no valid profitable JSON escape plan');

  const child = tagstackEncode(plan.transformed, enc);
  if (!child.exact || !child.frontierComplete) return fallback('transformed frontier incomplete', plan);
  const childSibling = siblingTemplateEncode(plan.transformed, enc, child);
  const childWinner = childSibling.messageTokens < child.messageTokens ? childSibling : child;
  const candidateMessage = `${jsonEscapeFoldContract(plan.marker)}\n${childWinner.message}`;
  const decoded = jsonEscapeFoldDecodeEnvelope(candidateMessage, childWinner.decoded);
  const candidateExact = decoded === text && jsonEscapeFoldParseEnvelope(candidateMessage)?.parentMessage === childWinner.message;
  const candidateTokens = countTokens(candidateMessage, enc);
  if (!candidateExact) return fallback('serialized envelope round trip failed', plan, candidateMessage, candidateTokens, false);
  if (candidateTokens >= sourceFrontierTokens)
    return fallback(`candidate M=${candidateTokens} >= source frontier M=${sourceFrontierTokens}`, plan,
      candidateMessage, candidateTokens, true);

  return {
    ...cloneResult(child, Date.now() - started),
    message: candidateMessage,
    decoded: text,
    exact: true,
    messageTokens: candidateTokens,
    parentTokens: sourceFrontierTokens,
    parentCodec: baseline.parentCodec,
    applied: true,
    candidateMessage,
    candidateTokens,
    candidateExact: true,
    jsonEscapeFold: true,
    replacements: plan.replacements,
    sourceFrontierTokens,
    notes: `JSON-ESCAPE-FOLD accepted: ${plan.replacements} safe escapes; M=${candidateTokens} < source frontier M=${sourceFrontierTokens}`,
  };
}
