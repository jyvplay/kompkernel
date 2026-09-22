/**
 * src/lib/omega/cjk-contractor.ts
 * =============================================================================
 * SHARED SINGLE-TOKEN CJK CONTRACTIVE DICTIONARY CORE ENGINE
 *
 * Provides single-token CJK/Glyph dictionary extraction and replacement logic
 * shared across prompt-native codecs (ASTRAL, AEON, HYPERION, PHOENIX, SOLARIS, VALKYRIE)
 * to avoid code duplication while maintaining 100% byte-exact losslessness.
 * =============================================================================
 */

import { countTokens, encodeIds, tokenStrings, type EncodingName } from './bpe';

export interface ContractorRule {
  glyph: string;
  phrase: string;
  hits: number;
}

export interface ContractorOptions {
  sentinel: string;
  literalSentinel: string;
  codeRangeStart: number;
  codeRangeEnd: number;
  maxRules?: number;
  minPhraseLength?: number;
  codecName: string;
}

export interface ContractorResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: string;
  rules: ContractorRule[];
  notes: string;
}

const glyphCache = new Map<string, string[]>();

export function getContractorGlyphs(enc: EncodingName, start: number, end: number): string[] {
  const cacheKey = `${enc}:${start}:${end}`;
  const hit = glyphCache.get(cacheKey);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = start; cp <= end; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    } catch {
      /* skip invalid code points */
    }
  }
  glyphCache.set(cacheKey, out);
  return out;
}

export function contractDecode(
  wire: string,
  options: ContractorOptions,
): string {
  if (wire.startsWith(options.literalSentinel)) return wire.slice(options.literalSentinel.length);
  if (!wire.startsWith(options.sentinel)) return wire;
  const rest = wire.slice(options.sentinel.length);
  const firstNl = rest.indexOf('\n');
  if (firstNl < 0) return wire;

  const ruleCount = Number(rest.slice(0, firstNl));
  if (!Number.isSafeInteger(ruleCount) || ruleCount < 0 || ruleCount > 64) return wire;

  let cursor = firstNl + 1;
  const rules: ContractorRule[] = [];

  for (let r = 0; r < ruleCount; r++) {
    if (cursor >= rest.length) return wire;
    const glyph = rest[cursor];
    const colon = rest.indexOf(':', cursor + 1);
    if (colon < 0) return wire;
    const len = Number(rest.slice(cursor + 1, colon));
    if (!Number.isSafeInteger(len) || len < 1) return wire;
    const phraseEnd = colon + 1 + len;
    if (phraseEnd > rest.length || (phraseEnd < rest.length && rest[phraseEnd] !== '\n')) return wire;
    const phrase = rest.slice(colon + 1, phraseEnd);
    rules.push({ glyph, phrase, hits: 0 });
    cursor = phraseEnd + 1;
  }

  let body = rest.slice(cursor);
  for (let i = rules.length - 1; i >= 0; i--) {
    body = body.split(rules[i].glyph).join(rules[i].phrase);
  }
  return body;
}

export function contractEncode(
  text: string,
  enc: EncodingName,
  options: ContractorOptions,
): ContractorResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): ContractorResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    mode: 'identity',
    rules: [],
    notes,
  });

  if (!text) return identity('empty input');
  if (text.startsWith(options.sentinel)) {
    const wire = options.literalSentinel + text;
    const decoded = contractDecode(wire, options);
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      mode: 'forced-wrap',
      rules: [],
      notes: 'forced wrap (sentinel prefix adversary)',
    };
  }

  const glyphs = getContractorGlyphs(enc, options.codeRangeStart, options.codeRangeEnd);
  const freeGlyphs = glyphs.filter((g) => !text.includes(g));
  if (freeGlyphs.length === 0) return identity('no free single-token glyphs');

  const lines = text.split('\n');
  const phraseCounts = new Map<string, number>();

  // Multi-line blocks
  for (let window = 4; window >= 2; window--) {
    for (let i = 0; i + window <= lines.length; i++) {
      const block = lines.slice(i, i + window).join('\n');
      if (block.length >= (options.minPhraseLength ?? 12)) {
        phraseCounts.set(block, (phraseCounts.get(block) ?? 0) + 1);
      }
    }
  }

  // Token sliding-window n-grams
  const toks = tokenStrings(text, enc);
  for (let len = 6; len >= 3; len--) {
    for (let i = 0; i + len <= toks.length; i++) {
      let p = '';
      for (let j = 0; j < len; j++) p += toks[i + j].s;
      if (p.length >= (options.minPhraseLength ?? 8) && !p.includes('\n')) {
        phraseCounts.set(p, (phraseCounts.get(p) ?? 0) + 1);
      }
    }
  }

  const candidatePhrases = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[0].length * b[1] - a[0].length * a[1])
    .map(([p]) => p);

  const rules: ContractorRule[] = [];
  let currentBody = text;
  const maxRules = options.maxRules ?? 16;

  for (const phrase of candidatePhrases) {
    if (rules.length >= freeGlyphs.length || rules.length >= maxRules) break;
    if (!currentBody.includes(phrase)) continue;

    const occurrences = currentBody.split(phrase).length - 1;
    if (occurrences < 2) continue;

    const glyph = freeGlyphs[rules.length];
    const candidateBody = currentBody.split(phrase).join(glyph);
    const candidateRules = [...rules, { glyph, phrase, hits: occurrences }];

    const candidateWire =
      options.sentinel +
      candidateRules.length +
      '\n' +
      candidateRules.map((r) => r.glyph + r.phrase.length + ':' + r.phrase).join('\n') +
      '\n' +
      candidateBody;
    const candidateTok = countTokens(candidateWire, enc);
    const currentTok = countTokens(
      rules.length === 0
        ? text
        : options.sentinel +
            rules.length +
            '\n' +
            rules.map((r) => r.glyph + r.phrase.length + ':' + r.phrase).join('\n') +
            '\n' +
            currentBody,
      enc,
    );

    if (candidateTok < currentTok) {
      currentBody = candidateBody;
      rules.push({ glyph, phrase, hits: occurrences });
    }
  }

  if (rules.length === 0) return identity(`no positive-gain rules contracted for ${options.codecName}`);

  const wire =
    options.sentinel +
    rules.length +
    '\n' +
    rules.map((r) => r.glyph + r.phrase.length + ':' + r.phrase).join('\n') +
    '\n' +
    currentBody;

  const decoded = contractDecode(wire, options);
  if (decoded !== text) return identity(`guard: ${options.codecName} failed byte-verify`);
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity(`guard: ${options.codecName} wire measured >= input`);

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: options.codecName.toLowerCase(),
    rules,
    notes: `${options.codecName} contracted ${rules.length} rules · byte-exact`,
  };
}
