/**
 * MOIRA-Ω — exact-cost constituent-lattice residual grammar.
 *
 * ANANKE samples one parity and lengths modulo four. MOIRA instead enumerates
 * every start and every length in its bounded regime, scores a certificate-sized
 * shortlist against the actual serialized wire, then performs backward
 * constituent deletion. This add/remove lattice is inspired by minimal-grammar
 * constituent choice, but its objective is real BPE wire tokens rather than CFG
 * symbol count. Rosetta and external schemas are deliberately absent.
 */
import { countTokens, type EncodingName } from './bpe';
import { kairosEncode, kairosDecode, kairosDecoderPrompt, type KairosResult } from './kairos';
import { anankeEncode } from './ananke';

export const MOIRA_START = '◇\n';
export const MOIRA_BODY = '\n◇\n';
type Rule = readonly [glyph: string, expansion: string];

export interface MoiraResult extends KairosResult { rules?: number; }

const GLYPHS: string[] = [];
for (let cp = 0x9000; cp < 0x9f00; cp++) {
  const ch = String.fromCharCode(cp);
  if (countTokens(ch, 'o200k_base') === 1) GLYPHS.push(ch);
}

function pack(body: string, rules: readonly Rule[]): string {
  return MOIRA_START + rules.map(([g, e]) => `${g}=${JSON.stringify(e)}`).join('\n') + MOIRA_BODY + body;
}
function occurrences(text: string, phrase: string): number {
  let n = 0, at = 0;
  while ((at = text.indexOf(phrase, at)) >= 0) { n++; at += phrase.length; }
  return n;
}

export function optimizeConstituentLattice(
  input: string, enc: EncodingName = 'o200k_base', maxRules = 28,
): { wire: string; body: string; rules: Rule[]; tokens: number } {
  let body = input;
  let rules: Rule[] = [];
  let current = countTokens(input, enc);
  const available = GLYPHS.filter(g => !input.includes(g));

  for (let round = 0; round < Math.min(maxRules, available.length); round++) {
    const counts = new Map<string, number>();
    const used = new Set(rules.map(([g]) => g));
    const maxLen = Math.min(100, Math.floor(body.length / 2));
    for (let len = 4; len <= maxLen; len++) {
      for (let at = 0; at + len <= body.length; at++) {
        const phrase = body.slice(at, at + len);
        let nested = false;
        for (const g of used) if (phrase.includes(g)) { nested = true; break; }
        if (!nested) counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
    const candidates = [...counts]
      .filter(([, count]) => count >= 2)
      .map(([phrase]) => {
        const pt = countTokens(phrase, enc);
        return { phrase, bound: occurrences(body, phrase) * (pt - 1) - pt };
      })
      .filter(x => x.bound > 0)
      .sort((a, b) => b.bound - a.bound || b.phrase.length - a.phrase.length || a.phrase.localeCompare(b.phrase))
      .slice(0, 256);

    const glyph = available[round];
    let winningBody = '', winningPhrase = '', winningTokens = current;
    for (const { phrase } of candidates) {
      const candidateBody = body.split(phrase).join(glyph);
      const tokens = countTokens(pack(candidateBody, [...rules, [glyph, phrase]]), enc);
      if (tokens < winningTokens) {
        winningBody = candidateBody; winningPhrase = phrase; winningTokens = tokens;
      }
    }
    if (!winningPhrase) break;
    body = winningBody; rules.push([glyph, winningPhrase]); current = winningTokens;
  }

  // IRR-style backward constituent deletion: later choices can make an earlier
  // rule redundant. Delete only with an exact serialized-token certificate.
  let changed = true;
  while (changed && rules.length) {
    changed = false;
    for (let i = 0; i < rules.length; i++) {
      const [glyph, expansion] = rules[i];
      const candidateRules = rules.filter((_, j) => j !== i);
      const candidateBody = body.split(glyph).join(expansion);
      const tokens = countTokens(pack(candidateBody, candidateRules), enc);
      if (tokens < current) {
        body = candidateBody; rules = candidateRules; current = tokens; changed = true; break;
      }
    }
  }

  return rules.length
    ? { wire: pack(body, rules), body, rules, tokens: current }
    : { wire: input, body: input, rules, tokens: countTokens(input, enc) };
}

export async function moiraEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<MoiraResult> {
  // ANANKE is the declared next-best non-Rosetta baseline. Both branches are
  // evaluated, and MOIRA can only win on an exact strictly-smaller wire.
  const [base, ananke] = await Promise.all([kairosEncode(text, enc), anankeEncode(text, enc)]);
  const lattice = optimizeConstituentLattice(base.wire, enc);
  if (!lattice.rules.length || lattice.tokens >= ananke.outTokens) {
    return { ...ananke, mode: `moira:${ananke.mode}`, notes: `${ananke.notes}; MOIRA Pareto fallback`, rules: ananke.rules ?? 0 };
  }
  const decoded = await moiraDecode(lattice.wire);
  return {
    wire: lattice.wire, decoded, exact: decoded === text,
    inTokens: base.inTokens, outTokens: lattice.tokens,
    savingsPct: base.inTokens ? Math.round((1 - lattice.tokens / base.inTokens) * 1000) / 10 : 0,
    mode: 'moira:constituent-lattice', regimes: [...(base.regimes ?? []), 'constituent-lattice'],
    notes: `MOIRA ${lattice.rules.length}-rule exhaustive add/delete residual grammar; ${ananke.outTokens - lattice.tokens} tokens beyond ANANKE`,
    rules: lattice.rules.length,
  };
}

export async function moiraDecode(wire: string): Promise<string> {
  if (!wire.startsWith(MOIRA_START)) return kairosDecode(wire);
  const boundary = wire.indexOf(MOIRA_BODY, MOIRA_START.length);
  if (boundary < 0) return wire;
  let body = wire.slice(boundary + MOIRA_BODY.length);
  try {
    const definitions = wire.slice(MOIRA_START.length, boundary);
    const rules: Rule[] = definitions ? definitions.split('\n').map(line => {
      const equals = line.indexOf('=');
      if (equals < 1) throw new Error('invalid definition');
      return [line.slice(0, equals), JSON.parse(line.slice(equals + 1))];
    }) : [];
    for (let i = rules.length - 1; i >= 0; i--) body = body.split(rules[i][0]).join(rules[i][1]);
    return kairosDecode(body);
  } catch { return wire; }
}

export function moiraDecoderPrompt(wire?: string): string {
  return `Decode this MOIRA-Ω payload in this same user message. Between the two standalone ◇ lines, each definition is glyph=JSON-string. Expand every glyph exactly, then follow the complete KAIROS/KHOROS instructions below. Preserve every character. No system prompt, skills.md, plugin, tool, or prior turn is available.\n\n${kairosDecoderPrompt()}${wire ? `\n\nMOIRA PAYLOAD\n${wire}` : ''}`;
}
