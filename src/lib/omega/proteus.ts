/**
 * PROTEUS-Ω — self-describing adaptive grammar framing.
 *
 * METIS closes direct MOIRA grammars only when its fixed `?` delimiter is absent.
 * PROTEUS makes the delimiter itself the first payload character, so the decoder
 * learns it without a table or schema. The encoder tournaments collision-free
 * one-token punctuation and jointly hill-climbs rule order / implicit-symbol
 * assignment against the complete live-BPE wire. Rule order carries no semantic
 * information, so no permutation metadata is transmitted. Every candidate is
 * decoded and must strictly beat the complete METIS result.
 */
import { countTokens, type EncodingName } from './bpe';
import { metisEncode, metisDecode, type MetisResult } from './metis';
import { MOIRA_START, MOIRA_BODY, moiraDecode } from './moira';
import { kairosDecoderPrompt } from './kairos';
import { THEMIS_IMPLICIT_GLYPHS } from './themis';

export const PROTEUS_START = '⬥';
export const PROTEUS_BODY_SEPARATOR = '乙';
export const PROTEUS_DELIMITERS = [...`!#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`];
export interface ProteusResult extends MetisResult { adaptiveRules?: number; adaptiveDelimiter?: string; }
type Rule = readonly [string, string];

function parseMoira(wire: string): { rules: Rule[]; body: string } | null {
  if (!wire.startsWith(MOIRA_START)) return null;
  const boundary = wire.indexOf(MOIRA_BODY, MOIRA_START.length);
  if (boundary < 0) return null;
  try {
    const definitions = wire.slice(MOIRA_START.length, boundary);
    const rules: Rule[] = definitions ? definitions.split('\n').map(line => {
      const equals = line.indexOf('=');
      if (equals < 1) throw new Error('invalid definition');
      const expansion = JSON.parse(line.slice(equals + 1));
      if (typeof expansion !== 'string') throw new Error('non-string expansion');
      return [line.slice(0, equals), expansion];
    }) : [];
    return rules.length ? { rules, body: wire.slice(boundary + MOIRA_BODY.length) } : null;
  } catch { return null; }
}

export async function proteusEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<ProteusResult> {
  const base = await metisEncode(text, enc);
  const parsed = parseMoira(base.wire);
  if (!parsed || parsed.rules.length > THEMIS_IMPLICIT_GLYPHS.length)
    return { ...base, mode: `proteus:${base.mode}`, notes: `${base.notes}; PROTEUS structural fallback`, adaptiveRules: 0 };
  const implicit = THEMIS_IMPLICIT_GLYPHS.slice(0, parsed.rules.length);
  const delimiters = PROTEUS_DELIMITERS.filter(d => countTokens(d, enc) === 1 && !base.wire.includes(d));
  if (!delimiters.length || base.wire.includes(PROTEUS_BODY_SEPARATOR) || implicit.some(g => base.wire.includes(g)))
    return { ...base, mode: `proteus:${base.mode}`, notes: `${base.notes}; PROTEUS collision fallback`, adaptiveRules: 0 };

  const build = (order: number[], delimiter: string): string => {
    const inverse: number[] = [];
    order.forEach((oldIndex, newIndex) => { inverse[oldIndex] = newIndex; });
    let body = parsed.body;
    for (let i = 0; i < parsed.rules.length; i++) body = body.split(parsed.rules[i][0]).join(implicit[inverse[i]]);
    return PROTEUS_START + delimiter + order.map(i => parsed.rules[i][1]).join(delimiter) + PROTEUS_BODY_SEPARATOR + body;
  };

  let order = parsed.rules.map((_, i) => i), bestWire = '', bestDelimiter = '', bestTokens = base.outTokens;
  const scoreOrder = (candidateOrder: number[]) => {
    for (const delimiter of delimiters) {
      const wire = build(candidateOrder, delimiter), tokens = countTokens(wire, enc);
      if (tokens < bestTokens) { bestTokens = tokens; bestWire = wire; bestDelimiter = delimiter; order = [...candidateOrder]; }
    }
  };
  scoreOrder(order);
  let improved = true;
  while (improved) {
    improved = false;
    const before = bestTokens, seed = [...order];
    for (let i = 0; i < seed.length; i++) for (let j = i + 1; j < seed.length; j++) {
      const candidate = [...seed]; [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
      scoreOrder(candidate);
    }
    improved = bestTokens < before;
  }
  if (!bestWire)
    return { ...base, mode: `proteus:${base.mode}`, notes: `${base.notes}; PROTEUS exact-cost fallback`, adaptiveRules: 0 };

  const decoded = await proteusDecode(bestWire);
  return { ...base, wire: bestWire, decoded, exact: decoded === text, outTokens: bestTokens,
    savingsPct: base.inTokens ? Math.round((1 - bestTokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'proteus:adaptive-self-describing-frame', regimes: [...(base.regimes ?? []), 'adaptive-self-describing-frame'],
    notes: `PROTEUS adaptive '${bestDelimiter}' framing and ordinal assignment for ${parsed.rules.length} rules; ${base.outTokens - bestTokens} tokens beyond METIS`,
    adaptiveRules: parsed.rules.length, adaptiveDelimiter: bestDelimiter };
}

export async function proteusDecode(wire: string): Promise<string> {
  if (!wire.startsWith(PROTEUS_START)) return metisDecode(wire);
  const delimiter = wire[PROTEUS_START.length];
  if (!delimiter || !PROTEUS_DELIMITERS.includes(delimiter)) return wire;
  const boundary = wire.indexOf(PROTEUS_BODY_SEPARATOR, PROTEUS_START.length + delimiter.length);
  if (boundary < 0) return wire;
  const tape = wire.slice(PROTEUS_START.length + delimiter.length, boundary);
  if (!tape) return wire;
  const expansions = tape.split(delimiter);
  if (expansions.length > THEMIS_IMPLICIT_GLYPHS.length) return wire;
  let body = wire.slice(boundary + PROTEUS_BODY_SEPARATOR.length);
  for (let i = expansions.length - 1; i >= 0; i--)
    body = body.split(THEMIS_IMPLICIT_GLYPHS[i]).join(expansions[i]);
  return moiraDecode(body);
}

export function proteusDecoderPrompt(wire?: string): string {
  const glyphs = THEMIS_IMPLICIT_GLYPHS.slice(0, 64).join('');
  return `Decode this PROTEUS-Ω payload in this same user message. Remove leading ⬥. The next single character is delimiter d. Split once at 乙: before it, discard the initial d and split the remaining expansion tape at every d; after it is the body. Expansion i corresponds to glyph i in: ${glyphs}. Replace glyphs in reverse order, then execute the complete KAIROS lower-stack instructions below. Delimiter occurrences in the tape are framing, not text. Preserve every other character and output only the reconstruction. No system prompt, skills.md, plugin, tool, prior turn, or external dictionary is available.\n\n${kairosDecoderPrompt()}${wire ? `\n\nPROTEUS PAYLOAD\n${wire}` : ''}`;
}
