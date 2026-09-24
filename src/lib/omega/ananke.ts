/**
 * ANANKE-Ω — self-describing residual grammar closure.
 *
 * KAIROS leaves repetitions after its winning codec has been selected. ANANKE
 * discovers a prompt-local grammar on that residual wire and charges the exact
 * dictionary/envelope cost during every rule decision. It is therefore neither
 * a larger static phrasebook nor a Rosetta/schema transform.
 */
import { countTokens, type EncodingName } from './bpe';
import { kairosEncode, kairosDecode, kairosDecoderPrompt, type KairosResult } from './kairos';

export const ANANKE_START = '◊\n';
export const ANANKE_BODY = '\n◊\n';

export interface AnankeResult extends KairosResult {
  rules?: number;
}

const GLYPHS: string[] = [];
for (let cp = 0x8200; cp < 0x9f00; cp++) {
  const ch = String.fromCharCode(cp);
  if (countTokens(ch, 'o200k_base') === 1) GLYPHS.push(ch);
}

type Rule = readonly [glyph: string, expansion: string];

function pack(body: string, rules: readonly Rule[]): string {
  const definitions = rules.map(([g, e]) => `${g}=${JSON.stringify(e)}`).join('\n');
  return ANANKE_START + definitions + ANANKE_BODY + body;
}

function nonOverlappingCount(text: string, phrase: string): number {
  let count = 0, at = 0;
  while ((at = text.indexOf(phrase, at)) >= 0) { count++; at += phrase.length; }
  return count;
}

/** Exact-cost beam-greedy residual grammar induction. */
export function induceResidualGrammar(
  input: string,
  enc: EncodingName = 'o200k_base',
  maxRules = 24,
): { wire: string; body: string; rules: Rule[]; tokens: number } {
  let body = input;
  const rules: Rule[] = [];
  const forbidden = new Set(body);
  const available = GLYPHS.filter(g => !forbidden.has(g));
  let currentTokens = countTokens(input, enc);

  for (let round = 0; round < Math.min(maxRules, available.length); round++) {
    const counts = new Map<string, number>();
    const usedGlyphs = new Set(rules.map(([g]) => g));
    const maxLen = Math.min(80, Math.floor(body.length / 2));

    // Multi-scale stable sampling: offsets 0 and 1 preserve both parities while
    // reducing candidate construction relative to an all-position/all-length scan.
    for (let len = 8; len <= maxLen; len += 4) {
      for (let i = 0; i + len <= body.length; i += 2) {
        const phrase = body.slice(i, i + len);
        let nested = false;
        for (const g of usedGlyphs) if (phrase.includes(g)) { nested = true; break; }
        if (!nested) counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }

    const candidates = [...counts]
      .filter(([, sampled]) => sampled >= 2)
      .map(([phrase]) => {
        const occurrences = nonOverlappingCount(body, phrase);
        const phraseTokens = countTokens(phrase, enc);
        return { phrase, upperBound: occurrences * (phraseTokens - 1) - phraseTokens };
      })
      .filter(c => c.upperBound > 0)
      .sort((a, b) => b.upperBound - a.upperBound)
      .slice(0, 96);

    const glyph = available[round];
    let bestBody = '';
    let bestPhrase = '';
    let bestTokens = currentTokens;
    for (const { phrase } of candidates) {
      const candidateBody = body.split(phrase).join(glyph);
      const tokens = countTokens(pack(candidateBody, [...rules, [glyph, phrase]]), enc);
      if (tokens < bestTokens) {
        bestTokens = tokens; bestBody = candidateBody; bestPhrase = phrase;
      }
    }
    if (!bestPhrase) break;
    rules.push([glyph, bestPhrase]);
    body = bestBody;
    currentTokens = bestTokens;
  }

  return rules.length
    ? { wire: pack(body, rules), body, rules, tokens: currentTokens }
    : { wire: input, body: input, rules, tokens: countTokens(input, enc) };
}

export async function anankeEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<AnankeResult> {
  const base = await kairosEncode(text, enc);
  const grammar = induceResidualGrammar(base.wire, enc);
  if (!grammar.rules.length || grammar.tokens >= base.outTokens) {
    return { ...base, mode: `ananke:${base.mode}`, notes: `${base.notes}; ANANKE exact-cost fallback`, rules: 0 };
  }
  const decoded = await anankeDecode(grammar.wire);
  return {
    wire: grammar.wire, decoded, exact: decoded === text,
    inTokens: base.inTokens, outTokens: grammar.tokens,
    savingsPct: base.inTokens ? Math.round((1 - grammar.tokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'ananke:residual-grammar', regimes: [...(base.regimes ?? []), 'residual-grammar'],
    notes: `ANANKE ${grammar.rules.length}-rule prompt-local residual grammar over ${base.mode}; ${base.outTokens - grammar.tokens} tokens beyond KAIROS`,
    rules: grammar.rules.length,
  };
}

export async function anankeDecode(wire: string): Promise<string> {
  if (!wire.startsWith(ANANKE_START)) return kairosDecode(wire);
  const boundary = wire.indexOf(ANANKE_BODY, ANANKE_START.length);
  if (boundary < 0) return wire;
  const definitionText = wire.slice(ANANKE_START.length, boundary);
  let body = wire.slice(boundary + ANANKE_BODY.length);
  try {
    const rules: Rule[] = definitionText ? definitionText.split('\n').map(line => {
      const equals = line.indexOf('=');
      if (equals < 1) throw new Error('invalid definition');
      return [line.slice(0, equals), JSON.parse(line.slice(equals + 1))];
    }) : [];
    for (let i = rules.length - 1; i >= 0; i--) body = body.split(rules[i][0]).join(rules[i][1]);
    return kairosDecode(body);
  } catch { return wire; }
}

export function anankeDecoderPrompt(wire?: string): string {
  return `Decode the ANANKE-Ω payload in this same user message. Before the second standalone ◊ line, each line is glyph=JSON-string. Replace every listed glyph by its decoded string, then apply the complete KAIROS/KHOROS instructions below. Preserve every character and output only the reconstruction. No system prompt, skills.md, plugin, or prior turn is available.\n\n${kairosDecoderPrompt()}${wire ? `\n\nANANKE PAYLOAD\n${wire}` : ''}`;
}
