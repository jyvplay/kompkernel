/**
 * Shared High-Performance Single-Token CJK Contractive Dictionary Core Engine
 * =============================================================================
 * Unified core engine supporting equals-free and standard key-value micro-headers,
 * micro-escaping, heuristic candidate pruning, and strict exactness gates G1 & G2.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export interface CjkContractorEntry {
  alias: string;
  phrase: string;
  hits: number;
  winTokens: number;
}

export interface CjkContractorResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: CjkContractorEntry[];
  mode: string;
  notes: string;
  encodeMs: number;
}

export interface ContractorOptions {
  sentinel: string;
  modeName: string;
  equalsHeader?: boolean;
  maxPool?: number;
  maxEntries?: number;
  maxCandidateTrials?: number;
}

const CJK_START = 0x4e00;
const CJK_END = 0x9fff;

// Cache single-token CJK code points per encoding
const _cjkPoolCache = new Map<EncodingName, string[]>();

export function getCjkAliasPool(enc: EncodingName, exclude: Set<string>, maxPool = 250): string[] {
  let pool = _cjkPoolCache.get(enc);
  if (!pool) {
    pool = [];
    for (let cp = CJK_START; cp <= CJK_END && pool.length < 700; cp++) {
      const ch = String.fromCodePoint(cp);
      if (encodeIds(ch, enc).length === 1) {
        pool.push(ch);
      }
    }
    _cjkPoolCache.set(enc, pool);
  }
  return pool.filter((ch) => !exclude.has(ch)).slice(0, maxPool);
}

export function escString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') out += '\\\\';
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c === '★') out += '\\S';
    else out += c;
  }
  return out;
}

export function unescString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === '\\') { out += '\\'; i++; }
      else if (n === 'n') { out += '\n'; i++; }
      else if (n === 'r') { out += '\r'; i++; }
      else if (n === 'S') { out += '★'; i++; }
      else out += s[i];
    } else {
      out += s[i];
    }
  }
  return out;
}

export function cjkContractorDecode(wire: string, opts: ContractorOptions): string {
  if (!wire.startsWith(opts.sentinel)) return wire;

  const dividerIdx = wire.indexOf('\n\n', opts.sentinel.length - 1);
  if (dividerIdx === -1) return wire;

  const headerBlock = wire.slice(opts.sentinel.length, dividerIdx);
  const body = wire.slice(dividerIdx + 2);

  const entries: { alias: string; phrase: string }[] = [];
  if (headerBlock.length > 0) {
    const lines = headerBlock.split('\n');
    for (const line of lines) {
      if (!line) continue;
      if (opts.equalsHeader) {
        const eqPos = line.indexOf('=');
        if (eqPos < 1) return wire;
        const alias = line.slice(0, eqPos);
        const phrase = unescString(line.slice(eqPos + 1));
        entries.push({ alias, phrase });
      } else {
        const alias = line[0];
        const phrase = unescString(line.slice(1));
        entries.push({ alias, phrase });
      }
    }
  }

  let text = body;
  for (let i = entries.length - 1; i >= 0; i--) {
    text = text.split(entries[i].alias).join(entries[i].phrase);
  }
  return text;
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

function assembleWire(entries: CjkContractorEntry[], body: string, opts: ContractorOptions): string {
  if (entries.length === 0) {
    return opts.sentinel + '\n' + body;
  }
  const headerLines = entries
    .map((e) => (opts.equalsHeader ? `${e.alias}=${escString(e.phrase)}` : `${e.alias}${escString(e.phrase)}`))
    .join('\n');
  return opts.sentinel + headerLines + '\n\n' + body;
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

function getTopCandidates(text: string, maxCands = 25): string[] {
  const map = new Set<string>();
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.length >= 2 && line.length <= 180) {
      map.add(line);
      // Word n-grams inside lines
      const words = line.split(/(\s+|,|\{|\}|\[|\]|:|"|'|\(|\)|=)/).filter(Boolean);
      for (let wLen = 2; wLen <= 12; wLen++) {
        for (let i = 0; i + wLen <= words.length; i++) {
          const p = words.slice(i, i + wLen).join('');
          if (p.length >= 2 && p.length <= 150) map.add(p);
        }
      }
    }
  }

  const maxSearchLen = Math.min(80, text.length);
  for (let len = 2; len <= maxSearchLen; len += (text.length > 5000 ? 2 : 1)) {
    for (let i = 0; i + len <= text.length; i += (text.length > 5000 ? 2 : 1)) {
      const sub = text.slice(i, i + len);
      if (!map.has(sub)) map.add(sub);
      if (map.size > 8000) break;
    }
    if (map.size > 8000) break;
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

export function cjkContractorEncode(
  text: string,
  enc: EncodingName,
  opts: ContractorOptions,
): CjkContractorResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);

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

  const mustWrap = text.startsWith(opts.sentinel);

  const textChars = new Set<string>();
  for (let i = 0; i < text.length; i++) {
    textChars.add(text[i]);
  }

  const aliasPool = getCjkAliasPool(enc, textChars, opts.maxPool ?? 250);
  if (aliasPool.length === 0) return identity('no CJK alias tokens available');

  let currentBody = text;
  const entries: CjkContractorEntry[] = [];
  let aliasIdx = 0;
  const maxEntries = opts.maxEntries ?? 32;
  const maxCandidateTrials = opts.maxCandidateTrials ?? 25;

  while (aliasIdx < aliasPool.length && entries.length < maxEntries) {
    const currentWireTokens =
      entries.length > 0
        ? countTokens(assembleWire(entries, currentBody, opts), enc)
        : inTokens;

    const topCandidates = getTopCandidates(currentBody, maxCandidateTrials);
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
        winTokens: countTokens(phrase, enc),
      };

      const trialWire = assembleWire([...entries, trialEntry], nextBody, opts);
      const trialTokens = countTokens(trialWire, enc);

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
    const w = opts.sentinel + '\n' + text;
    const d = cjkContractorDecode(w, opts);
    const ot = countTokens(w, enc);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      entries: [],
      mode: 'forced-wrap',
      notes: `forced empty-dict wrap (input begins with ${opts.sentinel.trim()} sentinel)`,
      encodeMs: ms(),
    };
  }

  const wire = assembleWire(entries, currentBody, opts);
  const outTokens = countTokens(wire, enc);

  const decoded = cjkContractorDecode(wire, opts);
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
    mode: opts.modeName,
    notes: `${opts.modeName.toUpperCase()}: ${entries.length} CJK single-token contractions · verified byte-exact`,
    encodeMs: ms(),
  };
}
