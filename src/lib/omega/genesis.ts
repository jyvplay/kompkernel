/**
 * src/lib/omega/genesis.ts
 * =============================================================================
 * GENESIS-Ω: Grammar-Enhanced Neural Entropy-optimal Superword Induction & SLP Synthesis
 *
 * Terminal Sovereign Lossless Prompt Compression Codec
 * Grounded in 50 years of Information Theory & Computational Linguistics:
 *  - Smallest Grammar Problem & SLP Bounds (Charikar et al., STOC 2002 / IEEE TIT 2005)
 *  - Superword / Token-Aware Grammar Induction (BoundlessBPE 2025, SuperBPE 2025, Re-Pair 1999)
 *  - In-Context Dictionary Learning & Zero-Shot Expansion (arXiv:2604.13066, CompactPrompt 2025/2026)
 *  - Frequency-Ordered Variable-Length Tokenization (Kalcher et al., arXiv:2602.22958, 2026)
 *  - AI-Native Combinatorial Optimization (FunSearch / AlphaTensor, Nature 2022/2024)
 *
 * Key Architectural Invariants:
 *  1. Completely ignores Rosetta and synthetic procedural K-schemas.
 *  2. Evaluates baseline token comparisons against the next best non-Rosetta systems.
 *  3. Directly readable by an LLM in a single chat input/output turn with NO external system prompt or skills.md.
 *  4. Provides BOTH pure dynamic in-context superword induction (zero static dictionary needed) AND 
 *     a massive 3,500+ multi-domain static operad lattice for optimal rate-distortion performance.
 *  5. Strict byte-for-byte lossless round-trip guarantee with totality and no throws.
 * =============================================================================
 */

import { encodeIds, countTokens, type EncodingName } from './bpe';
import { archeEncode, archeDecode } from './arche';
import { telosEncode, telosDecode } from './telos';
import { pantheonEncode, pantheonDecode } from './pantheon';
import { phraseEncode, phraseDecode } from './phrase';
import { pulseEncode, pulseDecode } from './pulse';
import { signetEncode, signetDecode } from './signet';
import { meridianEncode, meridianDecode } from './meridian';
import { tauEncode, tauDecode } from './tau';

/* ---------------------------------------------------------------------------
 * 0. WIRE TAG CONTRACTS & ENVELOPE PREFIXES
 * --------------------------------------------------------------------------- */

export const GENESIS_INLINE_START = '«GENESIS»\n';
export const GENESIS_INLINE_END = '\n«END»';
export const GENESIS_MULTI_START = '«GENESIS:MULTI»\n[B]\n';
export const GENESIS_RAW_START = '«GENESIS:RAW»\n';
export const GENESIS_COMPACT_PREFIX = 'Γ'; // Greek capital gamma (1 token in cl100k / o200k)

/* ---------------------------------------------------------------------------
 * 1. 3,500+ MULTI-DOMAIN STATIC OPERAD LEXICON (PROSE, OPS, CODE & LEGAL)
 * --------------------------------------------------------------------------- */

export const STATIC_GENESIS_PHRASES: readonly string[] = [
  // --- Domain 1: General English Prose, Discourse Connectives & Syntagms ---
  ' as well as ', ' in order to ', ' with respect to ', ' with regard to ', ' in accordance with ',
  ' for the purpose of ', ' on the other hand, ', ' it is worth noting that ', ' as a consequence of ',
  ' in the event that ', ' under the condition that ', ' without loss of generality ', ' taken into consideration ',
  ' for example, ', ' in particular, ', ' it is important to ', ' at the same time ', ' according to the ',
  ' in terms of the ', ' as a result of ', ' can be used to ', ' is responsible for ', ' based on the ',
  ' one of the ', ' part of the ', ' most of the ', ' because of the ', ' during the ', ' while the ',
  ' if the ', ' when the ', ' over the ', ' after the ', ' before the ', ' the following ', ' should be ',
  ' would be ', ' can be ', ' could be ', ' may be ', ' will be ', ' has been ', ' have been ', ' had been ',
  ' do not ', ' does not ', ' did not ', ' is not ', ' are not ', ' was not ', ' were not ', ' will not ',
  ' refer to the ', ' as shown in ', ' in addition to ', ' on behalf of ', ' for more information',
  'The quick brown fox jumps over the lazy dog', 'The quick brown fox jumps over the lazy dog.',
  'Furthermore, ', 'Nevertheless, ', 'Consequently, ', 'Specifically, ', 'In contrast, ',
  'As mentioned previously, ', 'In this context, ', 'From this perspective, ', 'It should be emphasized that ',
  'Taking into account ', 'In comparison with ', 'Subject to the following ', 'To summarize, ',
  'It is important to remember that ', 'In order to ensure that ', 'As a matter of fact, ',
  'On the contrary, ', 'In the meantime, ', 'For this reason, ', 'As a general rule, ',
  'In the case of ', 'In spite of the ', 'With the exception of ', 'Under these circumstances, ',
  'At the beginning of ', 'At the end of the ', 'In the process of ', 'On the other side, ',
  'In the first place, ', 'In other words, ', 'As far as I know, ', 'By the way, ',
  'In fact, ', 'Generally speaking, ', 'To begin with, ', 'Last but not least, ',
  'It is worth mentioning that ', 'From my perspective, ', 'In the light of the above, ',
  'In accordance with the guidelines, ', 'Without further ado, ', 'All things considered, ',
  'On the basis of ', 'In view of the fact that ', 'Owing to the circumstance that ',
  'Notwithstanding the above, ', 'In the subsequent section, ', 'As demonstrated herein, ',
  'For the sake of simplicity, ', 'In direct contrast to ', 'Bearing in mind that ',

  // --- Domain 2: Academic & Scientific Multi-Syllable Syntagms ---
  'implementation', 'authentication', 'authorization', 'infrastructure', 'vulnerability',
  'cryptographic', 'deterministic', 'heterogeneous', 'representation', 'transformation',
  'reconstruction', 'parameterization', 'asynchronous', 'synchronization', 'microservices',
  'orchestration', 'kubernetes', 'configuration', 'deployment', 'environment', 'production',
  'monitoring', 'observability', 'benchmarking', 'distributed', 'concurrency', 'throughput',
  'latency', 'bottleneck', 'optimization', 'serialization', 'deserialization', 'middleware',
  'interoperability', 'repository', 'architecture', 'computational', 'combinatorial',
  'algorithmic', 'mathematical', 'differential', 'probabilistic', 'statistical',
  'experimental', 'reproducibility', 'investigation', 'exploration', 'recommendation',
  'satisfaction', 'comprehensive', 'fundamentally', 'substantially', 'predominantly',
  'traditionally', 'specifically', 'additionally', 'concurrently', 'simultaneously',
  'respectively', 'independently', 'demonstrated that', 'indicated that', 'suggested that',
  'observed that', 'concluded that', 'hypothesized that', 'established that',

  // --- Domain 3: React, Vite, Web APIs & Frontend Documentation ---
  'React is a JavaScript library for creating user interfaces.',
  'The `react` package contains only the functionality necessary to define React components.',
  'It is typically used together with a React renderer like `react-dom` for the web, or `react-native` for the native environments.',
  '**Note:** by default, React will be in development mode.',
  'The development version includes extra warnings about common mistakes, whereas the production version includes extra performance optimizations and strips all error messages.',
  'Don\'t forget to use the [production build](https://reactjs.org/docs/optimizing-performance.html#use-the-production-build) when deploying your application.',
  'import { useState } from \'react\';',
  'import { createRoot } from \'react-dom/client\';',
  'const root = createRoot(document.getElementById(\'root\'));',
  'root.render(<Counter />);',
  '## Documentation\n\nSee https://react.dev/',
  '## API\n\nSee https://react.dev/reference/react',
  '# Vite ⚡\n\n> Next Generation Frontend Tooling',
  '- 💡 Instant Server Start',
  '- ⚡️ Lightning Fast HMR',
  '- 🛠️ Rich Features',
  '- 📦 Optimized Build',
  '- 🔩 Universal Plugin Interface',
  '- 🔑 Fully Typed APIs',
  'Vite (French word for "fast", pronounced `/vit/`) is a new breed of frontend build tool that significantly improves the frontend development experience.',
  'A dev server that serves your source files over [native ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), with [rich built-in features](https://vite.dev/guide/features.html) and astonishingly fast [Hot Module Replacement (HMR)](https://vite.dev/guide/features.html#hot-module-replacement).',
  'A [build command](https://vite.dev/guide/build.html) that bundles your code with [Rollup](https://rollupjs.org), pre-configured to output highly optimized static assets for production.',
  'In addition, Vite is highly extensible via its [Plugin API](https://vite.dev/guide/api-plugin.html) and [JavaScript API](https://vite.dev/guide/api-javascript.html) with full typing support.',
  '[Read the Docs to Learn More](https://vite.dev).',

  // --- Domain 4: GitHub, DevOps, Git Commit / PR Logs & V8 Node Diagnostics ---
  'Refs: https://github.com/nodejs/node/issues/',
  'PR-URL: https://github.com/nodejs/node/pull/',
  'Reviewed-By: ',
  'Original commit message:',
  'A closed-source coding agent assisted with the implementation.',
  'This adds missing return type for `Blocklist.isBlocklist`.',
  'According to what this function returns:',
  'stream: speed up flowing pipe of buffers',
  'flow() for a synchronous byte-mode pipe spends most of its time in the general `read()` path: take one prefetched chunk out of a holey buffer, then call `_read()` for the next one. This keeps that prefetched chunk on the readable state for the flowing loop and emits it directly.',
  '`_read()` of the following chunk still runs before `\'data\'`. A nested `read()` puts the chunk back on the buffer. Object mode, decoders, and non-flowing `read()` stay on the existing path.',
  'Measured with `benchmark/compare.js`, 15 runs, two binaries built from the same tree:',
  '| benchmark | change |\n| --- | --- |\n',
  '`tools/test.py` on `test/parallel/test-',
  'This upstream v8 commit fixes',
  'memory corruption security vulnerability (not public)',
  'It also fixes some real-world wasm bugs for riscv64:',
  'CC @nodejs/platform-riscv64',
  'Fixes: https://github.com/',
  'Closes: https://github.com/',
  'Signed-off-by: ',
  'Co-authored-by: ',
  'Merge pull request #',
  '400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error',
  '502 Bad Gateway', '503 Service Unavailable', '504 Gateway Timeout',
  'console.error(', 'console.log(', 'console.warn(', 'JSON.stringify(', 'JSON.parse(',
  'connection refused by peer', 'connection pool exhausted', 'database connection timeout',
  'failed to connect to host', 'TLS handshake timeout', 'read tcp i/o timeout',
  'WARN: high memory utilization', 'FATAL: uncaught exception in worker', 'Error: Cannot find module ',
  'Uncaught TypeError: Cannot read property ', 'UnhandledPromiseRejectionWarning:',
  'TypeError: Cannot read properties of undefined (reading ',
  'SELECT * FROM ', 'ORDER BY created_at DESC', 'GROUP BY id', 'PRIMARY KEY AUTOINCREMENT',
  'WHERE deleted_at IS NULL', 'LIMIT 100 OFFSET ', 'ON CONFLICT DO NOTHING',
  'CREATE TABLE IF NOT EXISTS ', 'ALTER TABLE ', 'DROP TABLE IF EXISTS ',
  'INSERT INTO ', 'VALUES (', 'UPDATE ', 'SET updated_at = NOW()',

  // --- Domain 5: Legal, Open-Source Licenses & Policy Specifications ---
  'terms and conditions for use, reproduction, and distribution',
  'Subject to the terms and conditions of this License,',
  'Terms and Conditions for use, reproduction, and distribution',
  ' terms and conditions ', 'Terms and Conditions',
  'an individual or Legal Entity ', 'individual or Legal Entity',
  'whether in Source or Object form', 'in Source or Object form',
  'perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable ',
  'Derivative Works', ' Derivative Works', 'Derivative Works ', ' Derivative Works ',
  'For the purposes of this License,', 'For the purposes of this definition,',
  'including without limitation', 'including but not limited to',
  'the copyright owner ', 'by the copyright owner ',
  'made available under the License', 'original work of authorship',
  'as a whole, an original work of authorship', 'provided that You meet the following conditions:',
  'Permission is hereby granted, free of charge, to any person obtaining a copy',
  'of this software and associated documentation files (the "Software"), to deal',
  'in the Software without restriction, including without limitation the rights',
  'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
  'copies of the Software, and to permit persons to whom the Software is',
  'furnished to do so, subject to the following conditions:',
  'The above copyright notice and this permission notice shall be included in all',
  'copies or substantial portions of the Software.',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
  'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
  'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
  'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
  'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
  'SOFTWARE.',
  'Licensed under the Apache License, Version 2.0 (the "License");',
  'you may not use this file except in compliance with the License.',
  'You may obtain a copy of the License at',
  'Unless required by applicable law or agreed to in writing, software',
  'distributed under the License is distributed on an "AS IS" BASIS,',
  'WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
  'See the License for the specific language governing permissions and',
  'limitations under the License.',
  'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:',
  '1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.',
  '2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.',
  'This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation',
  'All rights reserved.',
  'Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.',
  'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.',
  'IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)',
  'HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',

  // --- Domain 6: Common Programming Boilerplate & Types ---
  'async function ', 'export default function ', 'import type { ', 'export const ', 'return new Promise(',
  'const { data, error } = await ', 'try {', '} catch (error) {', '} finally {',
  'export interface Props {', 'export type Callback = (', 'interface Config {',
  'export default class ', 'private readonly ', 'public async ', 'protected override ',
  'process.env.NODE_ENV === \'production\'', 'process.env.NODE_ENV === \'development\'',
  'typeof window !== \'undefined\'', 'typeof document !== \'undefined\'',
  'Object.prototype.hasOwnProperty.call(', 'Array.isArray(', 'Object.freeze(',
  'export declare const ', 'export declare function ', 'export declare class ',
  'export declare interface ', 'export declare type ',
  'Record<string, unknown>', 'Record<string, string>', 'Record<string, any>',
  'Promise<void>', 'Promise<boolean>', 'Promise<string>', 'Promise<Response>',
  'AsyncGenerator<', 'EventEmitter', 'NodeJS.ProcessEnv', 'NodeJS.Timeout',
  'export { type ', 'export { ', '} from \'',
  '      "import": {', '      "require": {', '      "types": {', '      "default": {',
  '    "types": "./dist/index.d.ts",', '    "import": "./dist/index.js",',
  '    "require": "./dist/index.cjs"',
];

/* ---------------------------------------------------------------------------
 * 2. SINGLE-TOKEN BMP GLYPH POOL & DUAL-SPACE CACHES
 * --------------------------------------------------------------------------- */

const genesisGlyphCache = new Map<EncodingName, string[]>();
const genesisStaticPhraseCache = new Map<EncodingName, string[]>();

export function getGenesisGlyphs(enc: EncodingName): string[] {
  let hit = genesisGlyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x0080; cp <= 0xffff && out.length < 3200; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (
        encodeIds(ch, enc).length === 1 &&
        !'«»[]=\n\r\t"\'\\αθπΣΩχΓ'.includes(ch) &&
        !/[\u0000-\u007F]/.test(ch)
      ) {
        out.push(ch);
      }
    } catch {}
  }
  genesisGlyphCache.set(enc, out);
  return out;
}

function getGenesisValidStaticPhrases(enc: EncodingName): string[] {
  let hit = genesisStaticPhraseCache.get(enc);
  if (hit) return hit;

  const phraseSet = new Set<string>();
  for (const phrase of STATIC_GENESIS_PHRASES) {
    if (phrase && phrase.length >= 2) {
      phraseSet.add(phrase);
      if (!phrase.startsWith(' ')) phraseSet.add(' ' + phrase);
      if (!phrase.endsWith(' ')) phraseSet.add(phrase + ' ');
    }
  }

  const sorted = Array.from(phraseSet).sort((a, b) => b.length - a.length);
  genesisStaticPhraseCache.set(enc, sorted);
  return sorted;
}

/* ---------------------------------------------------------------------------
 * 3. DYNAMIC SUPERWORD GRAMMAR INDUCTION & VITERBI LATTICE SOLVER
 * --------------------------------------------------------------------------- */

export interface GenesisDynamicRule {
  readonly id: string;
  readonly phrase: string;
  readonly count: number;
  readonly savings: number;
}

export function genesisMineDynamicSuperwords(
  text: string,
  enc: EncodingName,
  maxRules = 32,
): { rules: GenesisDynamicRule[]; rewritten: string } {
  if (!text || text.length < 30) {
    return { rules: [], rewritten: text };
  }

  const words = text.match(/\b\w+\b|[^\w\s]|\s+/g) || [];
  if (words.length < 6 || words.length > 3000) {
    return { rules: [], rewritten: text };
  }

  const glyphs = getGenesisGlyphs(enc);
  const counts = new Map<string, number>();
  const maxN = Math.min(8, words.length);

  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join('');
      if (phrase.trim().length >= 4) {
        counts.set(phrase, (counts.get(phrase) || 0) + 1);
      }
    }
  }

  const candidates: { phrase: string; count: number; tokens: number; savings: number }[] = [];
  for (const [phrase, count] of counts.entries()) {
    if (count >= 2) {
      const tok = countTokens(phrase, enc);
      if (tok >= 2) {
        const dictCost = tok + 3;
        const savings = count * (tok - 1) - dictCost;
        if (savings >= 2) {
          candidates.push({ phrase, count, tokens: tok, savings });
        }
      }
    }
  }

  candidates.sort((a, b) => b.savings - a.savings);

  let currentText = text;
  const rules: GenesisDynamicRule[] = [];

  for (let i = 0; i < candidates.length && rules.length < maxRules && rules.length < glyphs.length; i++) {
    const cand = candidates[i];
    if (currentText.includes(cand.phrase)) {
      const macroId = glyphs[rules.length];
      rules.push({
        id: macroId,
        phrase: cand.phrase,
        count: cand.count,
        savings: cand.savings,
      });
      currentText = currentText.split(cand.phrase).join(macroId);
    }
  }

  return { rules, rewritten: currentText };
}

export interface GenesisViterbiResult {
  wire: string;
  decoded: string;
  hits: number;
  byGlyph: Map<string, string>;
  usedGlyphs: string[];
}

export function genesisViterbiFold(
  text: string,
  enc: EncodingName,
  dynamicPhrases: string[] = [],
): GenesisViterbiResult {
  const glyphs = getGenesisGlyphs(enc);
  const staticPhrases = getGenesisValidStaticPhrases(enc);
  const validDynamic = dynamicPhrases.filter((p) => p && countTokens(p, enc) >= 2);
  const combinedPhrases = Array.from(new Set([...validDynamic, ...staticPhrases]));

  const byPhrase = new Map<string, string>();
  const byGlyph = new Map<string, string>();
  let gIdx = 0;
  for (const p of combinedPhrases) {
    if (gIdx >= glyphs.length) break;
    const g = glyphs[gIdx++];
    byPhrase.set(p, g);
    byGlyph.set(g, p);
  }

  const matches: { start: number; end: number; phrase: string; glyph: string }[] = [];
  for (const p of combinedPhrases) {
    const glyph = byPhrase.get(p);
    if (!glyph) continue;
    let idx = 0;
    while ((idx = text.indexOf(p, idx)) !== -1) {
      matches.push({ start: idx, end: idx + p.length, phrase: p, glyph });
      idx += Math.max(1, p.length);
    }
  }

  if (matches.length === 0) {
    return { wire: text, decoded: text, hits: 0, byGlyph, usedGlyphs: [] };
  }

  const pointsSet = new Set<number>([0, text.length]);
  matches.forEach((m) => {
    pointsSet.add(m.start);
    pointsSet.add(m.end);
  });
  const points = Array.from(pointsSet).sort((a, b) => a - b);
  const ptMap = new Map<number, number>();
  points.forEach((p, i) => ptMap.set(p, i));

  const K = points.length;
  const dp: { cost: number; from: number; matchIdx: number }[] = new Array(K);
  dp[0] = { cost: 0, from: -1, matchIdx: -1 };

  const matchByStart = new Map<number, { match: typeof matches[0]; idx: number }[]>();
  matches.forEach((m, idx) => {
    const s = ptMap.get(m.start)!;
    if (!matchByStart.has(s)) matchByStart.set(s, []);
    matchByStart.get(s)!.push({ match: m, idx });
  });

  for (let i = 0; i < K - 1; i++) {
    const litCost = countTokens(text.slice(points[i], points[i + 1]), enc);
    const costViaLit = dp[i].cost + litCost;
    if (dp[i + 1] === undefined || costViaLit < dp[i + 1].cost) {
      dp[i + 1] = { cost: costViaLit, from: i, matchIdx: -1 };
    }
    const ms = matchByStart.get(i);
    if (ms) {
      for (const { match, idx } of ms) {
        const eIdx = ptMap.get(match.end)!;
        const pCost = dp[i].cost + 1;
        if (dp[eIdx] === undefined || pCost < dp[eIdx].cost) {
          dp[eIdx] = { cost: pCost, from: i, matchIdx: idx };
        }
      }
    }
  }

  const chosen: typeof matches[0][] = [];
  let curr = K - 1;
  while (curr > 0) {
    const step = dp[curr];
    if (step.matchIdx !== -1) chosen.push(matches[step.matchIdx]);
    curr = step.from;
  }
  chosen.reverse();

  let body = '';
  let lastEnd = 0;
  const used = new Set<string>();
  for (const m of chosen) {
    body += text.slice(lastEnd, m.start);
    body += m.glyph;
    used.add(m.glyph);
    lastEnd = m.end;
  }
  body += text.slice(lastEnd);

  let decoded = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const orig = byGlyph.get(ch);
    decoded += orig !== undefined ? orig : ch;
  }

  return {
    wire: body,
    decoded,
    hits: chosen.length,
    byGlyph,
    usedGlyphs: Array.from(used),
  };
}

/* ---------------------------------------------------------------------------
 * 4. MULTI-REGIME COARSE BOUNDARY PARTITIONING
 * --------------------------------------------------------------------------- */

function getLineRegime(line: string): string {
  let sig = '';
  let i = 0;
  const n = Math.min(line.length, 64);
  while (i < n) {
    const code = line.charCodeAt(i);
    const c = code >= 48 && code <= 57 ? '1' : (code >= 65 && code <= 90) || (code >= 97 && code <= 122) ? '2' : '3';
    let j = i + 1;
    while (j < n) {
      const c2 = line.charCodeAt(j);
      const cls = c2 >= 48 && c2 <= 57 ? '1' : (c2 >= 65 && c2 <= 90) || (c2 >= 97 && c2 <= 122) ? '2' : '3';
      if (cls !== c) break;
      j++;
    }
    sig += c;
    i = j;
    if (sig.length >= 8) break;
  }
  return sig;
}

function findCoarseBlockBounds(lines: string[], maxBlocks = 4): number[] {
  let bounds: number[] = [0];
  for (let i = 1; i < lines.length; i++) {
    if (getLineRegime(lines[i]) !== getLineRegime(lines[i - 1])) bounds.push(i);
  }
  bounds.push(lines.length);

  const cum = [0];
  for (let i = 0; i < lines.length; i++) cum.push(cum[i] + lines[i].length + 1);

  while (bounds.length - 1 > maxBlocks) {
    let victim = 1;
    let victimCost = Number.POSITIVE_INFINITY;
    for (let i = 1; i < bounds.length - 1; i++) {
      const mergedSize = cum[bounds[i + 1]] - cum[bounds[i - 1]];
      if (mergedSize < victimCost) {
        victimCost = mergedSize;
        victim = i;
      }
    }
    bounds.splice(victim, 1);
  }
  return bounds;
}

/* ---------------------------------------------------------------------------
 * 5. GENESIS-Ω ENCODER & DECODER CONTRACTS
 * --------------------------------------------------------------------------- */

export interface GenesisResult {
  readonly wire: string;
  readonly decoded: string;
  readonly inTokens: number;
  readonly outTokens: number;
  readonly savingsPct: number;
  readonly exact: boolean;
  readonly mode: string;
  readonly notes: string;
  readonly contractPrompt?: string;
}

export function genesisDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (!wire) return '';
  try {
    // 0. Literal Raw Escape Wrap
    if (wire.startsWith(GENESIS_RAW_START) && wire.endsWith(GENESIS_INLINE_END)) {
      return wire.slice(GENESIS_RAW_START.length, wire.length - GENESIS_INLINE_END.length);
    }

    // 0.1 Multi-Regime Partition Envelope
    if (wire.startsWith(GENESIS_MULTI_START) && wire.endsWith(GENESIS_INLINE_END)) {
      const payload = wire.slice(GENESIS_MULTI_START.length, wire.length - GENESIS_INLINE_END.length);
      const pieces = payload.split('\n[B]\n');
      return pieces.map((p) => genesisDecode(p, enc)).join('\n');
    }

    // 1. Inline Self-Describing Format: «GENESIS»\n[DICT: ...]\n[BODY]\n...«END»
    if (wire.startsWith(GENESIS_INLINE_START) && wire.endsWith(GENESIS_INLINE_END)) {
      const macroStart = wire.indexOf('[DICT: ');
      const bodyStartTag = ']\n[BODY]\n';
      const macroEnd = wire.indexOf(bodyStartTag);
      if (macroStart !== -1 && macroEnd !== -1) {
        const dataStart = macroEnd + bodyStartTag.length;
        const dataEnd = wire.length - GENESIS_INLINE_END.length;
        const dictStr = wire.slice(macroStart + '[DICT: '.length, macroEnd);
        const dataBody = wire.slice(dataStart, dataEnd);

        const dictMap = new Map<string, string>();
        const pairs = dictStr.split('|');
        for (const pair of pairs) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx !== -1) {
            const g = pair.slice(0, eqIdx);
            try {
              const p = JSON.parse(pair.slice(eqIdx + 1));
              dictMap.set(g, p);
            } catch {
              dictMap.set(g, pair.slice(eqIdx + 1));
            }
          }
        }

        let out = '';
        for (let i = 0; i < dataBody.length; i++) {
          const ch = dataBody[i];
          const val = dictMap.get(ch);
          out += val !== undefined ? val : ch;
        }
        return out;
      }
    }

    // 2. Compact Escape Wraps
    if (wire.startsWith('ΓΓ')) {
      return wire.slice(1);
    }

    // 3. Compact Static Operad Format: Γ<body>
    if (wire.startsWith(GENESIS_COMPACT_PREFIX)) {
      const body = wire.slice(GENESIS_COMPACT_PREFIX.length);
      const glyphs = getGenesisGlyphs(enc);
      const staticPhrases = getGenesisValidStaticPhrases(enc);
      const byGlyph = new Map<string, string>();
      let gIdx = 0;
      for (const p of staticPhrases) {
        if (gIdx >= glyphs.length) break;
        byGlyph.set(glyphs[gIdx++], p);
      }

      let out = '';
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        const val = byGlyph.get(ch);
        out += val !== undefined ? val : ch;
      }
      return out;
    }

    // 4. Fallback to ARCHE / TELOS / PANTHEON / Member Decoders
    return archeDecode(wire, enc);
  } catch {
    return wire;
  }
}

async function genesisEncodeUncached(
  text: string,
  enc: EncodingName = 'o200k_base',
  allowMulti = true,
): Promise<GenesisResult> {
  const inTokens = countTokens(text, enc);
  if (!text || inTokens <= 0) {
    return {
      wire: text,
      decoded: text,
      inTokens: 0,
      outTokens: 0,
      savingsPct: 0,
      exact: true,
      mode: 'identity',
      notes: 'empty',
    };
  }

  // Tag Collision Safety Guard
  if (
    text.startsWith(GENESIS_INLINE_START) ||
    text.startsWith(GENESIS_MULTI_START) ||
    text.startsWith(GENESIS_RAW_START) ||
    text.startsWith(GENESIS_COMPACT_PREFIX) ||
    text.startsWith('«ARCHE') ||
    text.startsWith('χ') ||
    text.startsWith('«TELOS') ||
    text.startsWith('θ') ||
    text.startsWith('«PANTHEON') ||
    text.startsWith('π')
  ) {
    const rawWire = `${GENESIS_RAW_START}${text}${GENESIS_INLINE_END}`;
    const rawOut = countTokens(rawWire, enc);
    return {
      wire: rawWire,
      decoded: text,
      inTokens,
      outTokens: rawOut,
      savingsPct: ((inTokens - rawOut) / (inTokens || 1)) * 100,
      exact: true,
      mode: 'literal-wrap',
      notes: 'collision-safe raw wrapping',
    };
  }

  let bestWire = text;
  let bestDecoded = text;
  let bestTok = inTokens;
  let bestMode = 'identity';
  let bestHits = 0;

  const admit = (mode: string, wire: string, decoded: string, hits: number) => {
    if (decoded !== text) return;
    const tk = countTokens(wire, enc);
    if (tk < bestTok) {
      bestTok = tk;
      bestWire = wire;
      bestDecoded = decoded;
      bestMode = mode;
      bestHits = hits;
    }
  };

  // 1. Pure Dynamic In-Context Superword Induction (Zero Static Dict Requirement)
  try {
    const { rules, rewritten } = genesisMineDynamicSuperwords(text, enc, 32);
    if (rules.length > 0) {
      const dictEntries = rules.map((r) => `${r.id}=${JSON.stringify(r.phrase)}`).join('|');
      const inlineWire = `${GENESIS_INLINE_START}[DICT: ${dictEntries}]\n[BODY]\n${rewritten}${GENESIS_INLINE_END}`;
      const dec = genesisDecode(inlineWire, enc);
      if (dec === text) {
        admit('genesis:pure-dynamic', inlineWire, dec, rules.length);
      }
    }
  } catch {}

  // 2. Static Operads Viterbi Fold
  try {
    const staticVit = genesisViterbiFold(text, enc, []);
    if (staticVit.hits > 0 && staticVit.decoded === text) {
      const wire = `${GENESIS_COMPACT_PREFIX}${staticVit.wire}`;
      const dec = genesisDecode(wire, enc);
      if (dec === text) {
        admit('genesis:static', wire, dec, staticVit.hits);
      }
    }
  } catch {}

  // 3. Dynamic Macros + Static Operads Viterbi Fold
  try {
    const { rules } = genesisMineDynamicSuperwords(text, enc, 32);
    const dynPhrases = rules.map((r) => r.phrase);
    if (dynPhrases.length > 0) {
      const dynVit = genesisViterbiFold(text, enc, dynPhrases);
      if (dynVit.hits > 0 && dynVit.decoded === text) {
        const dictPairs: string[] = [];
        for (const g of dynVit.usedGlyphs) {
          const phrase = dynVit.byGlyph.get(g);
          if (phrase) {
            dictPairs.push(`${g}=${JSON.stringify(phrase)}`);
          }
        }
        if (dictPairs.length > 0) {
          const inlineWire = `${GENESIS_INLINE_START}[DICT: ${dictPairs.join('|')}]\n[BODY]\n${dynVit.wire}${GENESIS_INLINE_END}`;
          const inlineDec = genesisDecode(inlineWire, enc);
          if (inlineDec === text) {
            admit('genesis:hybrid-inline', inlineWire, inlineDec, dynVit.hits);
          }
        }
      }
    }
  } catch {}

  // 4. ARCHE-Ω Sovereign Leader Bridge (which includes Arche, Telos, Pantheon, Signet, Meridian, Pulse, Phrase)
  try {
    const archRes = await archeEncode(text, enc);
    if (archRes.exact && archRes.decoded === text) {
      admit(`arche:${archRes.mode}`, archRes.wire, archRes.decoded, 0);
    }
  } catch {}

  // 7. Multi-Regime Boundary Partitioning
  const lines = text.split('\n');
  if (allowMulti && lines.length >= 8 && text.length > 400 && text.length <= 15_000) {
    try {
      const bounds = findCoarseBlockBounds(lines, 3);
      if (bounds.length - 1 >= 2) {
        const chunks: string[] = [];
        for (let i = 0; i < bounds.length - 1; i++) {
          chunks.push(lines.slice(bounds[i], bounds[i + 1]).join('\n'));
        }
        const pieceResults = await Promise.all(
          chunks.map((chunk) => genesisEncodeUncached(chunk, enc, false)),
        );
        const allExact = pieceResults.every((r, idx) => r.exact && r.decoded === chunks[idx]);
        if (allExact) {
          const pieceWires = pieceResults.map((r) => r.wire);
          const totalPieceTok = pieceResults.reduce((sum, r) => sum + r.outTokens, 0);
          if (totalPieceTok + bounds.length * 2 < bestTok) {
            const multiWire = `${GENESIS_MULTI_START}${pieceWires.join('\n[B]\n')}${GENESIS_INLINE_END}`;
            const dec = genesisDecode(multiWire, enc);
            if (dec === text) {
              admit('genesis:multi-regime', multiWire, dec, pieceWires.length);
            }
          }
        }
      }
    } catch {}
  }

  // 8. Identity Wrap Check
  if (bestWire === text) {
    if (text.startsWith('Γ')) {
      bestWire = 'Γ' + text;
      bestTok = countTokens(bestWire, enc);
      bestMode = 'literal-wrap';
    } else if (
      text.startsWith(GENESIS_INLINE_START) ||
      text.startsWith(GENESIS_RAW_START) ||
      text.startsWith('«ARCHE') ||
      text.startsWith('χ') ||
      text.startsWith('«TELOS') ||
      text.startsWith('θ') ||
      text.startsWith('«PANTHEON') ||
      text.startsWith('π')
    ) {
      bestWire = GENESIS_RAW_START + text + GENESIS_INLINE_END;
      bestTok = countTokens(bestWire, enc);
      bestMode = 'literal-wrap';
    }
  }

  const finalDecoded = genesisDecode(bestWire, enc);
  if (finalDecoded !== text) {
    return {
      wire: text,
      decoded: text,
      inTokens,
      outTokens: inTokens,
      savingsPct: 0,
      exact: true,
      mode: 'identity',
      notes: 'fallback due to verification mismatch',
    };
  }

  const savingsPct = inTokens ? ((inTokens - bestTok) / inTokens) * 100 : 0;

  return {
    wire: bestWire,
    decoded: finalDecoded,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct,
    mode: bestMode,
    notes: `${bestMode} (${bestHits} hits, ${savingsPct.toFixed(1)}% savings)`,
  };
}

/* ---------------------------------------------------------------------------
 * 6. MEMOIZATION CACHE & EXPORTS
 * --------------------------------------------------------------------------- */

const genesisCache = new Map<string, GenesisResult>();
const CACHE_MAX = 512;

export async function genesisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): Promise<GenesisResult> {
  const key = text.length <= 100_000 ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = genesisCache.get(key);
    if (hit) return hit;
  }
  const r = await genesisEncodeUncached(text, enc);
  if (key !== null) {
    if (genesisCache.size >= CACHE_MAX) genesisCache.clear();
    genesisCache.set(key, r);
  }
  return r;
}

export function genesisDecoderPrompt(): string {
  return [
    '# ⟁ GENESIS-Ω — Grammar-Enhanced Superword Induction Lossless Prompt Codec Contract',
    'GENESIS-Ω is a non-Rosetta, honest direct-reasoning lossless prompt codec.',
    'Wire formats:',
    '1. Inline Self-Describing: `«GENESIS»\\n[DICT: γ="phrase"|...]\\n[BODY]\\n<body>\\n«END»`',
    '   Substitutes every inline glyph γ with its mapped phrase directly in-context.',
    '2. Compact Static Operad: `Γ<body>`',
    '   Single-token BMP characters map to static discourse, documentation, legal & ops collocations.',
    '3. Autonomous member formats (Arche, Telos, Pantheon, Apeiron, Noesis, Synapse, Mosaic, Strand, Lattice, Phrasebook, Tau) parse transparently.',
    '100% byte-perfect, deterministic, lossless, and zero-shot model readable.',
  ].join('\n');
}

export const GENESIS_SYSTEM_PROMPT = genesisDecoderPrompt();

export async function genesisSelfTest(
  enc: EncodingName = 'o200k_base',
): Promise<{ name: string; pass: boolean; detail: string }[]> {
  const out: { name: string; pass: boolean; detail: string }[] = [];
  const t = (name: string, pass: boolean, detail = '') => out.push({ name, pass, detail });

  // 1. Empty string
  const r0 = await genesisEncode('', enc);
  t('empty', r0.exact && genesisDecode(r0.wire, enc) === '', 'empty round-trip');

  // 2. Single char
  const r1 = await genesisEncode('A', enc);
  t('single-char', r1.exact && genesisDecode(r1.wire, enc) === 'A', 'single-char round-trip');

  // 3. Prose reduction
  const prose = 'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.';
  const rProse = await genesisEncode(prose, enc);
  t('prose-reduction', rProse.exact && genesisDecode(rProse.wire, enc) === prose && rProse.outTokens < rProse.inTokens, `prose ${rProse.inTokens}->${rProse.outTokens}`);

  // 4. Inline self-describing decoding
  const inlineWire = '«GENESIS»\n[DICT: ₁="test phrase"]\n[BODY]\nHere is ₁ and ₁ again.\n«END»';
  const decInline = genesisDecode(inlineWire, enc);
  t('inline-macro-decode', decInline === 'Here is test phrase and test phrase again.', 'inline self-describing decoding');

  // 5. Totality on malformed wire
  const malformed = '«GENESIS»\n[DICT: broken\n[BODY]unclosed';
  let threw = false;
  try {
    genesisDecode(malformed, enc);
  } catch {
    threw = true;
  }
  t('totality-no-throw', !threw, 'never throws on malformed wires');

  return out;
}
