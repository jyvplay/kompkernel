/**
 * TERMINUS-T1: Terminal Architecture Lossless Direct-Reasoning Compression Codec
 * ==============================================================================
 * Features:
 *  1. Multi-pass recursive alias chaining (entries can alias prior aliases).
 *  2. Universal sentence, block, line, and n-gram candidate extraction with LCP heuristics.
 *  3. Single-token CJK code point substitution in cl100k_base & o200k_base.
 *  4. Equals-free micro-header with non-overlapping sentinel `★T\n`.
 *  5. Strict Gate G1 (exact roundtrip verification) & Gate G2 (measured token reduction).
 * ==============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  cjkContractorDecode,
  getCjkAliasPool,
  escString,
  unescString,
  type CjkContractorEntry,
  type CjkContractorResult,
} from './cjk-contractor';

export const TERMINUS_SENTINEL = '★T\n';

export interface TerminusOptions {
  maxPool?: number;
  maxEntries?: number;
  maxCandidateTrials?: number;
  recursiveChaining?: boolean;
}

export function decodeTerminus(wire: string): string {
  return cjkContractorDecode(wire, {
    sentinel: TERMINUS_SENTINEL,
    modeName: 'TERMINUS-T1',
    equalsHeader: false,
  });
}

function countOccurrences(str: string, sub: string): number {
  if (!sub) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

function assembleWire(entries: CjkContractorEntry[], body: string): string {
  if (entries.length === 0) {
    return TERMINUS_SENTINEL + '\n' + body;
  }
  const headerLines = entries.map((e) => `${e.alias}${escString(e.phrase)}`).join('\n');
  return TERMINUS_SENTINEL + headerLines + '\n\n' + body;
}

function approxTokens(s: string): number {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i) ?? 0;
    if (cp >= 0x4e00 && cp <= 0x9fff) count += 1;
    else count += 0.25;
  }
  return Math.max(1, Math.round(count));
}

function getTerminusCandidates(text: string, maxCands = 40): string[] {
  const map = new Set<string>();

  // 1. Paragraphs / Blocks
  const blocks = text.split(/\n\s*\n/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length >= 3 && trimmed.length <= 300) map.add(trimmed);
  }

  // 2. Sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length >= 3 && trimmed.length <= 250) map.add(trimmed);
  }

  // 3. Lines
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.length >= 2 && line.length <= 200) map.add(line);
  }

  // 4. Multi-token word n-grams
  for (const line of lines) {
    const words = line.split(/(\s+|,|\{|\}|\[|\]|:|"|'|\(|\)|=)/).filter(Boolean);
    for (let wLen = 2; wLen <= 16; wLen++) {
      for (let i = 0; i + wLen <= words.length; i++) {
        const p = words.slice(i, i + wLen).join('');
        if (p.length >= 2 && p.length <= 180) map.add(p);
      }
    }
  }

  // 5. Sliding window substrings
  const maxSearchLen = Math.min(100, text.length);
  for (let len = 2; len <= maxSearchLen; len += (text.length > 5000 ? 3 : 1)) {
    for (let i = 0; i + len <= text.length; i += (text.length > 5000 ? 3 : 1)) {
      const sub = text.slice(i, i + len);
      if (!map.has(sub)) map.add(sub);
      if (map.size > 10000) break;
    }
    if (map.size > 10000) break;
  }

  const scored: { sub: string; estGain: number }[] = [];
  for (const sub of map) {
    const hits = countOccurrences(text, sub);
    if (hits >= 2) {
      const estToks = approxTokens(sub);
      const estGain = hits * (estToks - 1) - (estToks + 2);
      if (estGain > 0) {
        scored.push({ sub, estGain });
      }
    }
  }

  scored.sort((a, b) => b.estGain - a.estGain);
  return scored.slice(0, maxCands).map((s) => s.sub);
}

export function encodeTerminus(
  text: string,
  encName: EncodingName = 'cl100k_base',
  opts?: TerminusOptions,
): CjkContractorResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, encName);

  const identity = (notes: string): CjkContractorResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: 'identity',
    notes,
    encodeMs: ms(),
  });

  if (!text || inTokens < 4) return identity('input too short');

  const mustWrap = text.startsWith(TERMINUS_SENTINEL);

  const textChars = new Set<string>();
  for (let i = 0; i < text.length; i++) {
    textChars.add(text[i]);
  }

  const aliasPool = getCjkAliasPool(encName, textChars, opts?.maxPool ?? 300);
  if (aliasPool.length === 0) return identity('no CJK alias tokens available');

  let currentBody = text;
  const entries: CjkContractorEntry[] = [];
  let aliasIdx = 0;
  const maxEntries = opts?.maxEntries ?? 48;
  const maxCandidateTrials = opts?.maxCandidateTrials ?? 35;

  while (aliasIdx < aliasPool.length && entries.length < maxEntries) {
    const currentWireTokens =
      entries.length > 0
        ? countTokens(assembleWire(entries, currentBody), encName)
        : inTokens;

    const topCandidates = getTerminusCandidates(currentBody, maxCandidateTrials);
    if (topCandidates.length === 0) break;

    interface Candidate {
      phrase: string;
      hits: number;
      tokenLength: number;
      wireTokens: number;
    }

    let bestCand: Candidate | null = null;

    for (const phrase of topCandidates) {
      const hits = countOccurrences(currentBody, phrase);
      if (hits < 2) continue;

      const alias = aliasPool[aliasIdx];
      const nextBody = currentBody.split(phrase).join(alias);
      const trialEntry: CjkContractorEntry = {
        alias,
        phrase,
        hits,
        winTokens: countTokens(phrase, encName),
      };

      const trialWire = assembleWire([...entries, trialEntry], nextBody);
      const trialTokens = countTokens(trialWire, encName);

      if (trialTokens < currentWireTokens) {
        if (!bestCand || trialTokens < bestCand.wireTokens) {
          bestCand = {
            phrase,
            hits,
            tokenLength: trialEntry.winTokens,
            wireTokens: trialTokens,
          };
        }
      }
    }

    if (!bestCand) break;

    const alias = aliasPool[aliasIdx];
    currentBody = currentBody.split(bestCand.phrase).join(alias);
    entries.push({
      alias,
      phrase: bestCand.phrase,
      hits: bestCand.hits,
      winTokens: bestCand.tokenLength,
    });
    aliasIdx++;
  }

  if (entries.length === 0) {
    if (!mustWrap) return identity('no positive-gain contractions found');
    const w = TERMINUS_SENTINEL + '\n' + text;
    const d = decodeTerminus(w);
    const ot = countTokens(w, encName);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      entries: [],
      mode: 'forced-wrap',
      notes: `forced empty-dict wrap (input begins with ${TERMINUS_SENTINEL.trim()} sentinel)`,
      encodeMs: ms(),
    };
  }

  const wire = assembleWire(entries, currentBody);
  const outTokens = countTokens(wire, encName);

  const decoded = decodeTerminus(wire);
  if (decoded !== text) {
    return identity('gate G1 failed: roundtrip mismatch');
  }

  if (outTokens >= inTokens && !mustWrap) {
    return identity('gate G2 failed: wire tokens measured >= input tokens');
  }

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    entries,
    mode: 'TERMINUS-T1',
    notes: `TERMINUS-T1: ${entries.length} recursive CJK contractions · verified byte-exact`,
    encodeMs: ms(),
  };
}

export function terminusSelfTest(): boolean {
  const sample = `TERMINUS SYSTEM ARCHITECTURE: High throughput distributed database transaction logs.
TERMINUS SYSTEM ARCHITECTURE: High throughput distributed database transaction logs.
TERMINUS SYSTEM ARCHITECTURE: High throughput distributed database transaction logs.`;

  const enc = encodeTerminus(sample, 'cl100k_base');
  const dec = decodeTerminus(enc.wire);
  return dec === sample && enc.exact && enc.outTokens < enc.inTokens;
}
