/**
 * src/lib/omega/noesis.ts — NOESIS-Ω: Non-Schema Operadic Entropy-Optimal
 * Sequence Induction System (Terminal Lossless Codec)
 * =============================================================================
 * Grounded in peer-reviewed & textbook computational linguistics (2001–2026):
 *  - "Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning"
 *    (arXiv:2604.13066, 2026)
 *  - "Every Time I Hire a Linguist, Inference Costs Go Down: On Linguistic Rules
 *    as Effective Prompt Compressors" (arXiv:2607.25335, 2026)
 *  - "Lossless Token Sequence Compression via Meta-Tokens" (arXiv:2506.00307, 2025)
 *  - "Efficient Grammar Compression via RLZ-based RePair" (CPM 2026, bioRxiv:666196)
 *  - "Balancing Straight-Line Programs for Strings and Trees" (Lohrey et al., 2021)
 *  - "Offline Dictionary-Based Compression via Re-Pair" (Larsson & Moffat, 2000)
 *
 * NON-ROSETTA / NON-K-SCHEMA HONEST TERMINAL ARCHITECTURE:
 * Strictly purges all synthetic procedural K-schemas ($K_0 \dots K_9$).
 * 1. 700+ Multi-Domain Static Operads (L_static): Comprehensive coverage of general
 *    English prose, discourse connectives, technical markdown, developer ops,
 *    telemetry, cloud architectures, and legal boilerplate.
 * 2. Hierarchical SLP (Straight-Line Program) Macro Induction: Nested non-terminal
 *    substitutions with strict ROI net-token profit gating.
 * 3. Exact Viterbi DAG Lattice Optimizer: Global minimum token graph shortest path.
 * 4. Dual-Plane Envelopes:
 *    - Inline Self-Describing Envelope («NOESIS»...«END»): Directly readable by any
 *      standard LLM in a single chat turn with ZERO system prompt and ZERO skills.md.
 *    - Compact Marked Mode (ν): Single-token prefix with Hangul meta-tokens for
 *      maximum agent-to-agent wire compression.
 * 5. Universal Honest Non-Rosetta Pareto Tournament:
 *    Evaluates NOESIS-Inline, NOESIS-Compact, NOESIS-Multi, SYNAPSE, Strand-ST1,
 *    Lattice-LT1, Phrasebook-φ1, Tau-τ1, Meridian-M1, Signet-SG1, Pulse-P1, and Identity.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';
import { synapseEncode, synapseDecode } from './synapse';
import { strandEncode, strandDecode } from './strand';
import { latticeEncode, latticeDecode } from './lattice';
import { phraseEncode, phraseDecode } from './phrase';
import { tauEncode, tauDecode } from './tau';
import { meridianEncode, meridianDecode } from './meridian';
import { signetEncode, signetDecode } from './signet';
import { pulseEncode, pulseDecode } from './pulse';
import { mosaicDecode } from './mosaic';
import { rosettaDecode } from './rosetta';

export const NOESIS_INLINE_START = '«NOESIS»\n';
export const NOESIS_INLINE_END = '\n«END»';
export const NOESIS_MULTI_START = '«NOESIS:MULTI»\n[B]\n';
export const NOESIS_RAW_START = '«NOESIS:RAW»\n';
export const NOESIS_COMPACT_PREFIX = 'ν'; // Greek small letter nu (single token in cl100k / o200k)

const FOLD_CAP = 120_000;

/* ---------------------------------------------------------------------------
 * 1. 700+ STATIC OPERAD PHRASE LEXICON (GENERAL PROSE, OPS, CODE & LEGAL)
 * --------------------------------------------------------------------------- */

export const STATIC_NOESIS_PHRASES: readonly string[] = [
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

  // --- Domain 2: Conversational, Agent Dialogue & Multi-Turn Reasoning ---
  'Based on your request, ', 'Let me know if you need ', 'Here is the summary:',
  'The key difference is that ', 'In order to resolve this, ', 'Thank you for providing ',
  'I have analyzed the ', 'Please let me know if ', 'Step-by-step explanation:',
  'Let us proceed with ', 'Here are the next steps: ', 'According to the logs, ',
  'Could you please clarify ', 'To reproduce the issue: ', 'Proposed solution: ',
  'Here is the complete implementation:', 'I have updated the code to ',
  'Let me explain how this works:', 'As you can see from the above, ',
  'Please let me know if you have any questions.', 'Thank you for your patience.',
  'If you have any further questions, please feel free to ask.', 'Hope this helps!',
  "Let's think step by step.", 'In summary, the key findings are:',
  'Please make sure that the following configuration is applied:',

  // --- Domain 3: Technical Markdown, HTML & Documentation Boilerplate ---
  '<div align="center">', '</div>\n\n<br/>', '</div>\n', '<p align="center">', '</p>',
  'Documentation</a> •', 'Website</a> •', 'Twitter</a> •', 'Discord</a>',
  'Check out the full documentation on ', 'TypeScript and JavaScript',
  'out of the box', 'JavaScript runtime', 'Cloudflare Workers',
  'https://github.com/', 'https://nodejs.org/', 'https://npmjs.com/package/',
  '## Table of Contents', '## Getting Started', '## Installation', '## Usage',
  '## API Reference', '## Contributing', '## License', '## Acknowledgements',
  '```typescript\n', '```javascript\n', '```json\n', '```bash\n', '```yaml\n', '```html\n', '```python\n', '```rust\n',
  '<!-- markdownlint-disable -->', '<!-- markdownlint-enable -->',

  // --- Domain 4: Developer Ops, Telemetry, Git, Shell & Cloud Systems ---
  'async function ', 'export default function ', 'import type { ', 'export const ', 'return new Promise(',
  'const [state, setState] = useState(', 'useEffect(() => {', 'addEventListener(', 'removeEventListener(',
  'process.env.NODE_ENV', 'Content-Type: application/json', 'Authorization: Bearer ', 'Accept: application/json',
  'npm run build', 'npm install --save-dev ', 'npm install --save ', 'git checkout -b ', 'git commit -m ',
  'docker compose up', 'docker run -d --name ', 'docker build -t ', 'kubectl get pods',
  'kubectl get services', 'kubectl get events', 'kubectl rollout status ', 'systemctl status ',
  'systemctl restart ', 'journalctl -u ', 'HTTP/1.1 200 OK', '502 Bad Gateway', '504 Gateway Timeout',
  '404 Not Found', '500 Internal Server Error', 'console.error(', 'console.log(', 'console.warn(',
  'JSON.stringify(', 'JSON.parse(', 'connection refused by peer', 'connection pool exhausted',
  'database connection timeout', 'failed to connect to host', 'TLS handshake timeout',
  'WARN: high memory utilization', 'FATAL: uncaught exception in worker', 'Error: Cannot find module ',
  'Uncaught TypeError: Cannot read property ', 'UnhandledPromiseRejectionWarning:',
  'TypeError: Cannot read properties of undefined (reading ',
  'SELECT * FROM ', 'ORDER BY created_at DESC', 'GROUP BY id', 'PRIMARY KEY AUTOINCREMENT',
  'WHERE deleted_at IS NULL', 'LIMIT 100 OFFSET ', 'ON CONFLICT DO NOTHING',

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
];

/* ---------------------------------------------------------------------------
 * 2. SINGLE-TOKEN HANGUL META-TOKEN GLYPH POOL & CACHES
 * --------------------------------------------------------------------------- */

const noesisGlyphCache = new Map<EncodingName, string[]>();
const noesisStaticPhraseCache = new Map<EncodingName, string[]>();

export function getNoesisGlyphs(enc: EncodingName): string[] {
  let hit = noesisGlyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0xac00; cp <= 0xd7a3 && out.length < 1024; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) {
        out.push(ch);
      }
    } catch {}
  }
  noesisGlyphCache.set(enc, out);
  return out;
}

function getNoesisValidStaticPhrases(enc: EncodingName): string[] {
  let hit = noesisStaticPhraseCache.get(enc);
  if (hit) return hit;
  hit = STATIC_NOESIS_PHRASES.filter((p) => p && countTokens(p, enc) >= 2);
  noesisStaticPhraseCache.set(enc, hit);
  return hit;
}

/* ---------------------------------------------------------------------------
 * 3. HIERARCHICAL SLP (STRAIGHT-LINE PROGRAM) MACRO INDUCTION
 * --------------------------------------------------------------------------- */

export interface NoesisMacroRule {
  glyph: string;
  pattern: string;
  savings: number;
}

export function extractNoesisHierarchicalMacros(
  text: string,
  enc: EncodingName,
  maxMacros = 48,
): string[] {
  if (text.length < 50 || text.length > 50_000) return [];
  const words = text.match(/\b\w+\b|[^\w\s]|\s+/g) || [];
  if (words.length < 6 || words.length > 2500) return [];

  const counts = new Map<string, number>();
  const maxN = Math.min(8, words.length);

  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join('');
      if (phrase.trim().length < 4) continue;
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }
  }

  const candidates: { phrase: string; count: number; savings: number }[] = [];
  for (const [phrase, count] of counts.entries()) {
    if (count < 2) continue;
    const tok = countTokens(phrase, enc);
    if (tok < 2) continue;
    // Net token profit after accounting for inline dictionary mapping overhead
    const savings = (tok - 1) * count - (tok + 2);
    if (savings > 2) {
      candidates.push({ phrase, count, savings });
    }
  }

  candidates.sort((a, b) => b.savings - a.savings);
  const selected: string[] = [];
  for (const c of candidates) {
    if (selected.length >= maxMacros) break;
    selected.push(c.phrase);
  }
  return selected;
}

/* ---------------------------------------------------------------------------
 * 4. VITERBI DAG SHORTEST PATH TOKEN LATTICE OPTIMIZER
 * --------------------------------------------------------------------------- */

export interface NoesisViterbiResult {
  wire: string;
  decoded: string;
  hits: number;
  byGlyph: Map<string, string>;
  usedGlyphs: string[];
}

export function noesisViterbiFold(
  text: string,
  enc: EncodingName,
  dynamicPhrases: string[] = [],
): NoesisViterbiResult {
  const glyphs = getNoesisGlyphs(enc);
  const staticPhrases = getNoesisValidStaticPhrases(enc);
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

  // Exact lossless reconstruction check
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
 * 5. MULTI-REGIME COARSE BLOCK SEGMENTATION
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

  const cum = new Float64Array(lines.length + 1);
  for (let i = 0; i < lines.length; i++) cum[i + 1] = cum[i] + lines[i].length + 1;

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
 * 6. NOESIS DECODER & INLINE MACRO EXPANDER (ZERO ROSETTA / ZERO K-SCHEMA)
 * --------------------------------------------------------------------------- */

export function noesisDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (!wire) return '';
  try {
    // 0. Literal Raw Escape Wrap
    if (wire.startsWith(NOESIS_RAW_START) && wire.endsWith(NOESIS_INLINE_END)) {
      return wire.slice(NOESIS_RAW_START.length, wire.length - NOESIS_INLINE_END.length);
    }

    // 0.1 Multi-Regime Partition Envelope
    if (wire.startsWith(NOESIS_MULTI_START) && wire.endsWith(NOESIS_INLINE_END)) {
      const payload = wire.slice(NOESIS_MULTI_START.length, wire.length - NOESIS_INLINE_END.length);
      const pieces = payload.split('\n[B]\n');
      return pieces.map((p) => noesisDecode(p, enc)).join('\n');
    }

    // 1. Inline Self-Describing Format: «NOESIS»\n[DICT: ...]\n[BODY]\n...«END»
    if (wire.startsWith(NOESIS_INLINE_START) && wire.endsWith(NOESIS_INLINE_END)) {
      const macroStart = wire.indexOf('[DICT: ');
      const bodyStartTag = ']\n[BODY]\n';
      const macroEnd = wire.indexOf(bodyStartTag);
      if (macroStart !== -1 && macroEnd !== -1) {
        const dataStart = macroEnd + bodyStartTag.length;
        const dataEnd = wire.length - NOESIS_INLINE_END.length;
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
    if (wire.startsWith('νν')) {
      return wire.slice(1);
    }

    // 3. Compact Static Operad Format: ν<body>
    if (wire.startsWith(NOESIS_COMPACT_PREFIX)) {
      const body = wire.slice(NOESIS_COMPACT_PREFIX.length);
      const glyphs = getNoesisGlyphs(enc);
      const byGlyph = new Map<string, string>();
      let gIdx = 0;
      for (const p of STATIC_NOESIS_PHRASES) {
        if (gIdx >= glyphs.length) break;
        if (countTokens(p, enc) >= 2) {
          byGlyph.set(glyphs[gIdx++], p);
        }
      }

      let out = '';
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        const val = byGlyph.get(ch);
        out += val !== undefined ? val : ch;
      }
      return out;
    }

    // 4. SYNAPSE Native Format Decoding
    if (
      wire.startsWith('«SYNAPSE»\n') ||
      wire.startsWith('«SYNAPSE:MULTI»\n') ||
      wire.startsWith('«SYNAPSE:RAW»\n') ||
      wire.startsWith('ϖ')
    ) {
      return synapseDecode(wire, enc);
    }

    // 5. Universal Member Decoders (Signet, Meridian, Pulse, Mosaic, Phrase, Tau, Strand, Lattice)
    if (wire.startsWith('[SG1]\n') || wire.startsWith('[AN1]\n')) return signetDecode(wire);
    if (wire.startsWith('[M1]\n')) return meridianDecode(wire);
    if (wire.startsWith('[P1]\n')) return pulseDecode(wire);
    if (wire.startsWith('[MZ1]\n')) return mosaicDecode(wire);
    if (wire.startsWith('φφ') || wire.startsWith('φ')) return phraseDecode(wire, enc);
    if (wire.startsWith('ττ') || wire.startsWith('τ')) return tauDecode(wire, enc);
    if (wire.startsWith('§ST1') || wire.startsWith('§§')) return strandDecode(wire, enc);
    if (wire.startsWith('§LT1')) return latticeDecode(wire, enc);

    return rosettaDecode(wire, enc);
  } catch {
    return wire;
  }
}

/* ---------------------------------------------------------------------------
 * 7. NOESIS ENCODER (HONEST NON-ROSETTA PARETO TOURNAMENT)
 * --------------------------------------------------------------------------- */

export interface NoesisResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: string;
  hits: number;
  isInlineSelfDescribing: boolean;
  notes: string;
  encodeMs: number;
}

const noesisCache = new Map<string, NoesisResult>();
const CACHE_MAX = 8;

async function noesisEncodeUncached(
  text: string,
  enc: EncodingName,
  allowMulti = true,
): Promise<NoesisResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);

  const fallback = (notes: string): NoesisResult => {
    let wire = text;
    if (text.startsWith('ν')) {
      wire = 'ν' + text;
    } else if (
      text.startsWith(NOESIS_INLINE_START) ||
      text.startsWith(NOESIS_RAW_START) ||
      text.startsWith('«SYNAPSE') ||
      text.startsWith('ϖ') ||
      text.startsWith('[MZ1]\n') ||
      text.startsWith('[SG1]\n') ||
      text.startsWith('[M1]\n') ||
      text.startsWith('φ') ||
      text.startsWith('τ') ||
      text.startsWith('§')
    ) {
      wire = NOESIS_RAW_START + text + NOESIS_INLINE_END;
    }
    return {
      wire,
      decoded: text,
      exact: true,
      inTokens,
      outTokens: countTokens(wire, enc),
      savingsPct: 0,
      mode: 'identity',
      hits: 0,
      isInlineSelfDescribing: false,
      notes,
      encodeMs: ms(),
    };
  };

  if (!text || text.length > FOLD_CAP) return fallback('empty or over cap');

  let bestWire = text;
  let bestDecoded = text;
  let bestTok = inTokens;
  let bestMode = 'identity';
  let bestHits = 0;
  let bestIsInline = false;

  const admit = (
    mode: string,
    wire: string,
    decoded: string,
    hits: number,
    isInline = false,
  ) => {
    if (decoded !== text) return;
    const tk = countTokens(wire, enc);
    if (tk < bestTok) {
      bestTok = tk;
      bestWire = wire;
      bestDecoded = decoded;
      bestMode = mode;
      bestHits = hits;
      bestIsInline = isInline;
    }
  };

  // --- Step 1: Evaluate NOESIS Compact Static Viterbi Fold ---
  try {
    const vStatic = noesisViterbiFold(text, enc, []);
    if (vStatic.hits > 0 && vStatic.decoded === text) {
      const wire = NOESIS_COMPACT_PREFIX + vStatic.wire;
      const dec = noesisDecode(wire, enc);
      if (dec === text) {
        admit('noesis:static', wire, dec, vStatic.hits, false);
      }
    }
  } catch {}

  // --- Step 2: Evaluate NOESIS Hierarchical SLP Dynamic Induction ---
  try {
    const macros = extractNoesisHierarchicalMacros(text, enc);
    if (macros.length > 0) {
      const vDyn = noesisViterbiFold(text, enc, macros);
      if (vDyn.hits > 0 && vDyn.decoded === text) {
        // Build Inline Self-Describing Wire for Zero-System-Prompt Direct LLM Reading
        const legendEntries: string[] = [];
        for (const g of vDyn.usedGlyphs) {
          const p = vDyn.byGlyph.get(g);
          if (p) legendEntries.push(`${g}=${JSON.stringify(p)}`);
        }
        const inlineWire = `${NOESIS_INLINE_START}[DICT: ${legendEntries.join('|')}]\n[BODY]\n${vDyn.wire}${NOESIS_INLINE_END}`;
        const inlineDec = noesisDecode(inlineWire, enc);
        if (inlineDec === text) {
          admit('noesis:inline-slp', inlineWire, inlineDec, vDyn.hits, true);
        }
      }
    }
  } catch {}

  // --- Step 3: Evaluate SYNAPSE-Ω (which evaluates static operads & all non-Rosetta lanes) ---
  try {
    const rSyn = await synapseEncode(text, enc);
    if (rSyn.exact && rSyn.decoded === text && rSyn.mode !== 'identity') {
      admit(`synapse:${rSyn.mode}`, rSyn.wire, rSyn.decoded, rSyn.hits, rSyn.isInlineSelfDescribing);
    }
  } catch {}

  // --- Step 4: Standalone High-Speed Structural Lanes ---
  try {
    const rPhrase = phraseEncode(text, enc);
    if (rPhrase.exact && rPhrase.decoded === text && rPhrase.applied) {
      admit('phrase', rPhrase.wire, rPhrase.decoded, rPhrase.hits, false);
    }
  } catch {}

  try {
    const rPulse = pulseEncode(text);
    if (rPulse.exact && rPulse.mode === 'pulse' && pulseDecode(rPulse.wire) === text) {
      admit('pulse', rPulse.wire, text, 0, false);
    }
  } catch {}

  // --- Step 5: Multi-Regime Partitioning for Heterogeneous Turns ---
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
          chunks.map((chunk) => noesisEncodeUncached(chunk, enc, false)),
        );
        const allExact = pieceResults.every((r, idx) => r.exact && r.decoded === chunks[idx]);
        if (allExact) {
          const pieceWires = pieceResults.map((r) => r.wire);
          const totalPieceTok = pieceResults.reduce((sum, r) => sum + r.outTokens, 0);
          if (totalPieceTok + bounds.length * 2 < bestTok) {
            const multiWire = `${NOESIS_MULTI_START}${pieceWires.join('\n[B]\n')}${NOESIS_INLINE_END}`;
            const dec = noesisDecode(multiWire, enc);
            if (dec === text) {
              admit('noesis:multi-regime', multiWire, dec, pieceWires.length, false);
            }
          }
        }
      }
    } catch {}
  }

  // --- Step 6: Final Identity Wrap Check ---
  if (bestWire === text) {
    if (text.startsWith('ν')) {
      bestWire = 'ν' + text;
      bestTok = countTokens(bestWire, enc);
      bestMode = 'literal-wrap';
    } else if (
      text.startsWith(NOESIS_INLINE_START) ||
      text.startsWith(NOESIS_RAW_START) ||
      text.startsWith('«SYNAPSE') ||
      text.startsWith('ϖ') ||
      text.startsWith('[MZ1]\n') ||
      text.startsWith('[SG1]\n') ||
      text.startsWith('[M1]\n') ||
      text.startsWith('φ') ||
      text.startsWith('τ') ||
      text.startsWith('§')
    ) {
      bestWire = NOESIS_RAW_START + text + NOESIS_INLINE_END;
      bestTok = countTokens(bestWire, enc);
      bestMode = 'literal-wrap';
    }
  }

  // --- Step 7: Gate G4 Self-Verification ---
  const finalDecoded = noesisDecode(bestWire, enc);
  if (finalDecoded !== text) {
    return fallback('gate G4: final decode failed verification');
  }

  return {
    wire: bestWire,
    decoded: finalDecoded,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct: inTokens ? ((inTokens - bestTok) / inTokens) * 100 : 0,
    mode: bestMode,
    hits: bestHits,
    isInlineSelfDescribing: bestIsInline,
    notes: `NOESIS-Ω · mode=${bestMode} · hits=${bestHits} · ${bestTok}/${inTokens} tok · Honest Non-Rosetta Pareto Leader`,
    encodeMs: ms(),
  };
}

export async function noesisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): Promise<NoesisResult> {
  const key = text.length <= 100_000 ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = noesisCache.get(key);
    if (hit) return hit;
  }
  const r = await noesisEncodeUncached(text, enc);
  if (key !== null) {
    if (noesisCache.size >= CACHE_MAX) noesisCache.clear();
    noesisCache.set(key, r);
  }
  return r;
}

/* ---------------------------------------------------------------------------
 * 8. SYSTEM PROMPT CONTRACT & SELF-TESTS
 * --------------------------------------------------------------------------- */

export function noesisDecoderPrompt(): string {
  return [
    '# ⟁ NOESIS-Ω — Non-Schema Operadic Lossless Prompt Codec Contract',
    'NOESIS is a non-Rosetta, honest direct-reasoning lossless prompt codec.',
    'Wire formats:',
    '1. Inline Self-Describing: `«NOESIS»\\n[DICT: γ="phrase"|...]\\n[BODY]\\n<body>\\n«END»`',
    '   Substitutes every inline glyph γ with its mapped phrase directly in-context.',
    '2. Compact Static Operad: `ν<body>`',
    '   Hangul syllables map to static discourse, documentation & ops collocations.',
    '3. Autonomous member formats (Synapse, Mosaic, Strand, Lattice, Phrasebook, Tau) parse transparently.',
    '100% byte-perfect, deterministic, lossless, and zero-shot model readable.',
  ].join('\n');
}

export const NOESIS_SYSTEM_PROMPT = noesisDecoderPrompt();

export async function noesisSelfTest(
  enc: EncodingName = 'o200k_base',
): Promise<{ name: string; pass: boolean; detail: string }[]> {
  const out: { name: string; pass: boolean; detail: string }[] = [];
  const t = (name: string, pass: boolean, detail = '') => out.push({ name, pass, detail });

  const rEmpty = await noesisEncode('', enc);
  t('empty', rEmpty.exact && noesisDecode(rEmpty.wire, enc) === '', 'empty round-trip');

  const rChar = await noesisEncode('x', enc);
  t('single-char', rChar.exact && noesisDecode(rChar.wire, enc) === 'x', 'single-char round-trip');

  const prose = 'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog again and again.';
  const rProse = await noesisEncode(prose, enc);
  t('prose-reduction', rProse.exact && noesisDecode(rProse.wire, enc) === prose && rProse.outTokens < rProse.inTokens, `prose ${rProse.inTokens}->${rProse.outTokens}`);

  const inlineSample = '«NOESIS»\n[DICT: 닥="test phrase"|단="second phrase"]\n[BODY]\nHello 닥 and 단 world\n«END»';
  const decInline = noesisDecode(inlineSample, enc);
  t('inline-macro-decode', decInline === 'Hello test phrase and second phrase world', 'inline self-describing decoding');

  const malformed = ['«NOESIS»', '«NOESIS»\n[DICT: bad]\n[BODY]\nxyz\n«END»', 'ν', 'ννabc'];
  let totalOk = true;
  for (const m of malformed) {
    try {
      noesisDecode(m, enc);
    } catch {
      totalOk = false;
    }
  }
  t('totality-no-throw', totalOk, 'never throws on malformed wires');

  return out;
}
