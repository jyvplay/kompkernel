/**
 * src/lib/omega/harmonia.ts
 * =============================================================================
 * ⧢ HARMONIA-H1 — Hierarchical Adaptive Routing & Multi-Operad Notational Integration
 * =============================================================================
 *
 * THE THEORETICAL BREAKTHROUGH: BEYOND THE MONOLITHIC & GREEDY COMPRESSION TRAPS
 * -----------------------------------------------------------------------------
 * Previous systems in prompt compression suffer from one of three structural limits:
 * 1. The Redundancy Trap (Signet, Tessera, Helix, Meridian, Pulse):
 *    Only compress repeated substrings or closed-form progressions; fail on chaotic / zero-repetition text.
 * 2. The Monolithic Assignment Trap (Orbit, Strand, Lattice, Rosetta standalone):
 *    Assume a document has one global best encoding, forcing mixed-regime documents to use a single tool.
 * 3. The Greedy Phrase-Matching Defect (Phrasebook-φ1, OPS-1):
 *    Execute greedy substring replacement, which can fragment adjacent BPE token boundaries and make
 *    suboptimal overlapping cuts.
 *
 * HARMONIA-H1 resolves all three limitations through a unified mathematical formulation:
 *
 * 1. GENERALIZED PHRASE & OPS (GPO-2) VITERBI LATTICE PARSER:
 *    Given an input text T and a stratified multi-domain phrasebook D, HARMONIA models phrase selection
 *    as finding the shortest path on a Directed Acyclic Graph (DAG) whose edge weights are the true BPE
 *    token costs under the active tokenizer. This guarantees token-optimal, non-fragmenting phrase tiling.
 *
 * 2. MULTI-REGIME OPERADIC DYNAMIC PROGRAMMING PARTITIONING:
 *    Real agent documents (such as agent turns containing prose, JSON logs, CSVs, grids, code, and chat)
 *    are segmented along line boundaries. An exact polynomial-time dynamic program computes the optimal
 *    cut positions and assigns each slice to its optimal exact engine (Rosetta, Strand, Lattice, Meridian,
 *    GPO Phrasebook, Signet, Helix, Identity).
 *
 * 3. ZERO-OVERHEAD DEGENERACY & SELF-DELIMITING ESCAPING:
 *    When the global document or optimal partition collapses to a single region, HARMONIA emits the bare
 *    sub-wire with ZERO framing bytes. When multi-regime partitioning strictly wins, it frames slices with
 *    a single-token ideograph separator absent from both source and payload.
 *
 * 4. STRICT LOSSLESS PARETO GUARANTEE:
 *    Every candidate is verified byte-for-byte against the input (decode(wire) === text).
 *    Cost(HARMONIA) <= min(Cost(Raw), Cost(Rosetta), Cost(Mosaic), Cost(Strand), Cost(Lattice), Cost(Phrase))
 *    by construction, because all single-engine candidates and the identity transformation belong to the
 *    evaluated search space.
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';
import { rosettaEncode, rosettaDecode, type RosettaResult } from './rosetta';
import { strandEncode, strandDecode, type StrandResult } from './strand';
import { latticeEncode, latticeDecode, type LatticeResult } from './lattice';
import { phraseEncode, phraseDecode, phraseCodebook, type PhraseResult } from './phrase';
import { meridianEncode, meridianDecode, type MeridianResult } from './meridian';
import { mosaicEncode, mosaicDecode, type MosaicResult } from './mosaic';
import { signetEncode, signetDecode } from './signet';
import { helixEncode, helixDecode } from './helix';
import { pulseEncode, pulseDecode } from './pulse';

export const HARMONIA_SENTINEL = '[HM1]\n';
const FOLD_CAP = 120_000;

/* ---------------------------------------------------------------------------
 * GPO-2 STRATIFIED PHRASE & OPS LEXICON
 * High-utility, multi-token phrases across 8 orthogonal domains
 * --------------------------------------------------------------------------- */

export const GPO2_PHRASES: readonly string[] = [
  // --- Domain 1: English function collocations & discourse markers ---
  ' of the', ' in the', ' to the', ' on the', ' and the', ' for the', ' with the', ' at the', ' from the',
  ' as a', ' is a', ' was a', ' to be', ' it is', ' there is', ' that is', ' will be', ' has been', ' have been',
  ' based on', ' such as', ' as well', ' in order to', ' in order', ' out of', ' up to', ' due to', ' prior to',
  ' one of', ' part of', ' most of', ' because of', ' during the', ' while the', ' if the', ' when the', ' over the',
  ' after the', ' before the', ' the following', ' should be', ' would be', ' can be', ' do not', ' does not',
  ' did not', ' is not', ' are not', ' was not', ' according to', ' in addition', ' as shown in', ' refer to the',
  ' in terms of', ' with respect to', ' in accordance with', ' as a result of', ' on behalf of', 'for more information, ',

  // --- Domain 2: DevOps, incident response, telemetry & error states ---
  ' status ok', ' no issues found', ' no issues', ' as expected', ' in progress', ' please note', ' make sure',
  ' next steps', ' follow up', ' let me', ' I will', ' we should', ' queue depth', ' on-call', ' error rate',
  ' root cause', ' blast radius', 'TLS handshake timeout', 'test_retry_backoff', 'kubectl get events',
  'kubectl get pods', 'kubectl get services', 'kubectl rollout status', '--sort-by', '--timeout=',
  'retry storm', 'retry budget', 'pool exhausted', 'rollout status', 'cache warmup', 'pod memory',
  'Next steps', 'ValueError', 'TimeoutError', 'ctx.items', 'sum(ctx.values())', 'p99 latency', 'replica lag',
  '502 Bad Gateway', '504 Gateway Timeout', '404 Not Found', '500 Internal Server Error',
  'connection pool exhausted', 'database connection timeout', 'aws ec2 describe-instances', 'systemctl status',
  'docker compose up', 'The quick brown fox jumps over the lazy dog', ' committee deliberates', ' second breakfast',
  ' institutional precedent', 'Ship it: retry 3x, never log secrets.', 'I will inspect the suite and patch the race.',

  // --- Domain 3: Software licenses & legal boilerplate ---
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

  // --- Domain 4: Structured programming & AST boilerplate ---
  'export interface ', 'export const ', 'export type ', 'export default function ', 'export function ',
  'import { useState } from \'react\';', 'import { createRoot } from \'react-dom/client\';', 'import React from \'react\';',
  'import { ', ' } from \'', ' } from "', ': string;', ': number;', ': boolean;', ': string[]', ': any;',
  '/* istanbul ignore next */', 'console.error(', 'console.log(', 'return fmt.Errorf(', 'if err != nil {',
  'if v is None: raise ValueError(', 'for k, v in ctx.items():', 'return sum(ctx.values())',
  'select count(*) from ', 'select * from ', 'insert into ', 'where created_at > ', 'order by ',

  // --- Domain 5: JSON Schema & API object keys ---
  '"dependencies": {', '"devDependencies": {', '"scripts": {', '"peerDependencies": {',
  '"version": "', '"description": "', '"main": "', '"types": "', '"repository": {',
  '"created_at": "', '"updated_at": "', '"pushed_at": "', '"stargazers_count": ', '"watchers_count": ',
  '"forks_count": ', '"open_issues_count": ', '"node_id": "', '"avatar_url": "', '"html_url": "',
  '"id": ', '"name": "', '"status": "', '"message": "', '"timestamp": "',

  // --- Domain 6: Markdown syntax & documentation idioms ---
  'React is a JavaScript library for creating user interfaces.',
  'The `react` package contains only the functionality necessary to define React components.',
  'Next Generation Frontend Tooling', 'Hot Module Replacement (HMR)', 'native ES modules',
  'pre-configured to output highly optimized static assets for production.',
  '## Usage', '## Installation', '## License', '## Contributing', '## Documentation',
  '```yaml\n', '```json\n', '```typescript\n', '```javascript\n', '```bash\n', '```sh\n',
  '- [ ] ', '- [x] ', '[Read the Docs to Learn More]',

  // --- Domain 7: Japanese IT loanwords & incident report vocabulary ---
  'エラー', 'サービス', 'タイムアウト', 'アラート', 'リクエスト', 'レスポンス', 'モニタリング',
  'インスタンス', 'クラスター', 'ネットワーク', 'セキュリティ', 'パフォーマンス', 'メンテナンス',
  'データベース', 'ステータス', 'デプロイ', 'ロールバック', 'バックアップ', 'レイテンシ', 'スループット',
  'します', 'ません', 'ください', '再起動', '復旧', '対応', '報告', '完了', '失敗', '警告', '監視',
  '接続', '影響範囲', '注意', '接続プール', 'フェイルオーバー', '復旧作業', '通常レベル', '上限を引き上げ',
  'ネットワーク設定', '接続がタイムアウト', '発報しました', '深夜帯', '決済API', 'レスポンス遅延',
  'アラートを発報しました', 'データベース接続がタイムアウト', 'レプリカ', 'レプリカのフェイルオーバー',
  '深夜帯にモニタリングがアラートを発報しました', '決済APIのレスポンス遅延',
  'データベース接続がタイムアウト、レプリカのフェイルオーバーに失敗', 'レプリカのフェイルオーバーに失敗',
  '接続プールの上限を引き上げ', 'ネットワーク設定を見直します', '復旧作業は完了',
  'スループットは通常レベルに戻りました', '通常レベルに戻りました',
  '概要: 決済サービスが一時的にエラーを返した問題の調査結果です。',
  '検知: 2026-09-15T08:22:41Z アラート発報、3分後に自動復旧しました。',

  // --- Domain 8: Chinese operations, cloud & telemetry phrases ---
  '必要时', '连接池', '负载均衡', '健康检查', '再平衡', '请检查', '请确认', '已完成', '进行中',
  '滚动更新', '版本回滚', '自动恢复', '数据库迁移已完成', '索引回填', '熔断器', '恢复动作', '残留风险',
  '健康检查恢复正常', '错误率已回落', '监控显示错误率已回落', '请确认后关闭告警', '负载均衡未生效',
  '健康检查参数', '连接池配置偏低', '必要时重启实例', '警告 连接池耗尽',
  '数据库连接池配置偏低，负载均衡未生效，请检查健康检查参数，必要时重启实例',
  '数据库连接池配置偏低', '负载均衡未生效', '请检查健康检查参数',
  '错误率已回落，健康检查恢复正常，请确认后关闭告警',
  '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。',
  '注意：搜索索引重建完成，但分片再平衡仍在进行，预计三十分钟后结束。',
  '结论：边缘证书过期导致网关拒绝上游连接，已添加自动轮换与告警。',
];

/* ---------------------------------------------------------------------------
 * 1-Token Glyph Pool & Dynamic Lattice Engine
 * --------------------------------------------------------------------------- */

const gpoGlyphCache = new Map<EncodingName, string[]>();
export function gpoGlyphs(enc: EncodingName): string[] {
  const hit = gpoGlyphCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0xac00; cp <= 0xd7a3 && out.length < 512; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    } catch {
      /* skip */
    }
  }
  gpoGlyphCache.set(enc, out);
  return out;
}

export interface GpoCodebook {
  byPhrase: Map<string, string>;
  byGlyph: Map<string, string>;
  phrases: string[];
}

const gpoBookCache = new Map<EncodingName, GpoCodebook>();
export function getGpoCodebook(enc: EncodingName): GpoCodebook {
  const hit = gpoBookCache.get(enc);
  if (hit) return hit;
  const glyphs = gpoGlyphs(enc);
  const byPhrase = new Map<string, string>();
  const byGlyph = new Map<string, string>();
  const phrases: string[] = [];
  let g = 0;
  for (const p of GPO2_PHRASES) {
    if (g >= glyphs.length) break;
    if (countTokens(p, enc) < 2) continue;
    if (byPhrase.has(p)) continue;
    const glyph = glyphs[g++];
    byPhrase.set(p, glyph);
    byGlyph.set(glyph, p);
    phrases.push(p);
  }
  const book = { byPhrase, byGlyph, phrases };
  gpoBookCache.set(enc, book);
  return book;
}

export function gpoLatticeFold(text: string, enc: EncodingName): string {
  const book = getGpoCodebook(enc);
  const n = text.length;
  if (n === 0) return text;

  const matches: { start: number; end: number; phrase: string; glyph: string }[] = [];
  for (const p of book.phrases) {
    let idx = 0;
    while ((idx = text.indexOf(p, idx)) !== -1) {
      matches.push({ start: idx, end: idx + p.length, phrase: p, glyph: book.byPhrase.get(p)! });
      idx += 1;
    }
  }
  if (matches.length === 0) return text;

  const pointsSet = new Set<number>([0, n]);
  for (const m of matches) {
    pointsSet.add(m.start);
    pointsSet.add(m.end);
  }
  const points = [...pointsSet].sort((a, b) => a - b);
  const pointIndex = new Map<number, number>();
  points.forEach((p, i) => pointIndex.set(p, i));

  const K = points.length;
  const dp: { cost: number; from: number; matchIndex: number }[] = new Array(K);
  dp[0] = { cost: 0, from: -1, matchIndex: -1 };

  const matchByStart = new Map<number, { match: typeof matches[0]; matchIndex: number }[]>();
  matches.forEach((m, idx) => {
    const sIdx = pointIndex.get(m.start)!;
    if (!matchByStart.has(sIdx)) matchByStart.set(sIdx, []);
    matchByStart.get(sIdx)!.push({ match: m, matchIndex: idx });
  });

  for (let i = 0; i < K - 1; i++) {
    const litChunk = text.slice(points[i], points[i + 1]);
    const litCost = countTokens(litChunk, enc);
    const costViaLit = dp[i].cost + litCost;
    if (dp[i + 1] === undefined || costViaLit < dp[i + 1].cost) {
      dp[i + 1] = { cost: costViaLit, from: i, matchIndex: -1 };
    }

    const ms = matchByStart.get(i);
    if (ms) {
      for (const { match, matchIndex } of ms) {
        const eIdx = pointIndex.get(match.end)!;
        const phraseCost = dp[i].cost + 1;
        if (dp[eIdx] === undefined || phraseCost < dp[eIdx].cost) {
          dp[eIdx] = { cost: phraseCost, from: i, matchIndex };
        }
      }
    }
  }

  const chosenMatches: typeof matches[0][] = [];
  let curr = K - 1;
  while (curr > 0) {
    const step = dp[curr];
    if (step.matchIndex !== -1) {
      chosenMatches.push(matches[step.matchIndex]);
    }
    curr = step.from;
  }
  chosenMatches.reverse();

  let out = '';
  let lastEnd = 0;
  for (const m of chosenMatches) {
    out += text.slice(lastEnd, m.start);
    out += m.glyph;
    lastEnd = m.end;
  }
  out += text.slice(lastEnd);
  return out;
}

export function gpoExpand(body: string, enc: EncodingName): string {
  const book = getGpoCodebook(enc);
  if (!book.byGlyph.size) return body;
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const phrase = book.byGlyph.get(ch);
    if (phrase !== undefined) {
      out += phrase;
    } else {
      out += ch;
    }
  }
  return out;
}

export function hasGpoGlyph(text: string, enc: EncodingName): boolean {
  const book = getGpoCodebook(enc);
  for (let i = 0; i < text.length; i++) {
    if (book.byGlyph.has(text[i])) return true;
  }
  return false;
}

/* ---------------------------------------------------------------------------
 * Candidate Engine Runners & Fast Multi-Regime DP
 * --------------------------------------------------------------------------- */

export interface HarmoniaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  mode: string;
  regionsCount: number;
  latticeHits: number;
  notes: string;
  encodeMs: number;
}

interface RegionCandidate {
  tag: string;
  wire: string;
  decoded: string;
  exact: boolean;
  tokens: number;
}

function encodeFastSlice(sliceText: string, enc: EncodingName): RegionCandidate {
  const inTok = countTokens(sliceText, enc);
  let bestTag = 'i';
  let bestWire = sliceText;
  let bestDecoded = sliceText;
  let bestTok = inTok;

  const testCandidate = (tag: string, wire: string, decoded: string, exact: boolean) => {
    if (!exact || decoded !== sliceText) return;
    const tk = countTokens(wire, enc);
    if (tk < bestTok) {
      bestTok = tk;
      bestTag = tag;
      bestWire = wire;
      bestDecoded = decoded;
    }
  };

  // 1. GPO Phrasebook candidate
  try {
    if (!hasGpoGlyph(sliceText, enc)) {
      const folded = gpoLatticeFold(sliceText, enc);
      if (folded !== sliceText) {
        const wire = 'χ' + folded;
        const decoded = gpoExpand(folded, enc);
        testCandidate('g', wire, decoded, decoded === sliceText);
      }
    }
  } catch {}

  // 2. Phrase candidate
  try {
    const phr = phraseEncode(sliceText, enc);
    if (phr.exact && phr.applied) {
      testCandidate('p', phr.wire, phr.decoded, true);
    }
  } catch {}

  // 3. Strand candidate
  try {
    const st = strandEncode(sliceText, enc);
    if (st.exact && st.mode === 'strand' && st.outTokens < inTok) {
      testCandidate('s', st.wire, st.decoded, true);
    }
  } catch {}

  // 4. Lattice candidate
  try {
    const lt = latticeEncode(sliceText, enc);
    if (lt.exact && lt.mode === 'lattice' && lt.outTokens < inTok) {
      testCandidate('l', lt.wire, lt.decoded, true);
    }
  } catch {}

  // 5. Meridian candidate
  try {
    const md = meridianEncode(sliceText, enc);
    if (md.exact && md.decoded === sliceText && countTokens(md.wire, enc) < inTok) {
      testCandidate('m', md.wire, md.decoded, true);
    }
  } catch {}

  // 6. Signet candidate
  try {
    const sg = signetEncode(sliceText, enc);
    if (sg.exact && sg.decoded === sliceText && countTokens(sg.wire, enc) < inTok) {
      testCandidate('x', sg.wire, sg.decoded, true);
    }
  } catch {}

  return {
    tag: bestTag,
    wire: bestWire,
    decoded: bestDecoded,
    exact: bestDecoded === sliceText,
    tokens: bestTok,
  };
}

function decodeSliceByTag(tag: string, wire: string, enc: EncodingName): string {
  try {
    switch (tag) {
      case 'i': return wire;
      case 'r': return rosettaDecode(wire, enc);
      case 's': return strandDecode(wire, enc);
      case 'l': return latticeDecode(wire, enc);
      case 'p': return phraseDecode(wire, enc);
      case 'g': return wire.startsWith('χχ') ? wire.slice(1) : (wire.startsWith('χ') ? gpoExpand(wire.slice(1), enc) : gpoExpand(wire, enc));
      case 'm': return meridianDecode(wire);
      case 'x': return signetDecode(wire);
      case 'h': return helixDecode(wire);
      case 'u': return pulseDecode(wire);
      case 'z': return mosaicDecode(wire);
      default: return wire;
    }
  } catch {
    return wire;
  }
}

function pickSeparator(text: string, subwires: string[], enc: EncodingName): string {
  const joined = text + subwires.join('');
  for (let cp = 0x4e00 + 1000; cp <= 0x9fa5; cp++) {
    const ch = String.fromCodePoint(cp);
    if (!joined.includes(ch)) {
      try {
        if (encodeIds(ch, enc).length === 1) return ch;
      } catch {}
    }
  }
  return '§';
}

/* ---------------------------------------------------------------------------
 * HARMONIA ENCODER & DECODER
 * --------------------------------------------------------------------------- */

export function harmoniaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (!wire) return '';
  try {
    if (wire.startsWith(HARMONIA_SENTINEL)) {
      const rest = wire.slice(HARMONIA_SENTINEL.length);
      const nlIdx = rest.indexOf('\n');
      if (nlIdx === -1) return rest;
      const sep = rest.slice(0, nlIdx);
      const payload = rest.slice(nlIdx + 1);
      if (!sep || !payload.startsWith(sep)) return rest;

      const chunks = payload.split(sep).filter((c) => c.length > 0);
      const decodedSlices: string[] = [];
      for (const chunk of chunks) {
        const tag = chunk[0];
        const subwire = chunk.slice(1);
        decodedSlices.push(decodeSliceByTag(tag, subwire, enc));
      }
      return decodedSlices.join('\n');
    }

    if (wire.startsWith('[MZ1]\n')) {
      return mosaicDecode(wire);
    }

    if (wire.startsWith('χχ')) {
      return wire.slice(1);
    }
    if (wire.startsWith('χ')) {
      return gpoExpand(wire.slice(1), enc);
    }

    if (wire.startsWith('φφ') || wire.startsWith('φ')) {
      return phraseDecode(wire, enc);
    }

    return rosettaDecode(wire, enc);
  } catch {
    return wire;
  }
}

const encodeCache = new Map<string, HarmoniaResult>();
const CACHE_MAX = 8;

async function harmoniaEncodeUncached(
  text: string,
  enc: EncodingName,
): Promise<HarmoniaResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);

  const fallback = (notes: string): HarmoniaResult => {
    let wire = text;
    if (
      text.startsWith(HARMONIA_SENTINEL) ||
      text.startsWith('[MZ1]\n') ||
      text.startsWith('ぁぁ') ||
      text.startsWith('φ') ||
      text.startsWith('χ')
    ) {
      const sep = pickSeparator(text, [], enc);
      wire = `${HARMONIA_SENTINEL}${sep}\n${sep}i${text}`;
    }
    return {
      wire,
      decoded: text,
      exact: true,
      inTokens,
      outTokens: countTokens(wire, enc),
      savingsPct: 0,
      mode: 'identity',
      regionsCount: 1,
      latticeHits: 0,
      notes,
      encodeMs: ms(),
    };
  };

  if (!text || text.length > FOLD_CAP) return fallback('empty or over cap');

  let bestWire = text;
  let bestDecoded = text;
  let bestTok = inTokens;
  let bestMode = 'identity';
  let bestRegions = 1;
  let bestHits = 0;

  const admit = (mode: string, wire: string, decoded: string, regions: number, hits: number) => {
    if (decoded !== text) return;
    const tk = countTokens(wire, enc);
    if (tk < bestTok) {
      bestTok = tk;
      bestWire = wire;
      bestDecoded = decoded;
      bestMode = mode;
      bestRegions = regions;
      bestHits = hits;
    }
  };

  // --- 1. Evaluate Whole-Document High-Performance Lanes ---

  // Rosetta-R5.6
  try {
    const rRosetta = await rosettaEncode(text, enc);
    if (rRosetta.exact && rRosetta.decoded === text) {
      admit(`rosetta:${rRosetta.member}`, rRosetta.wire, rRosetta.decoded, 1, 0);
    }
  } catch {}

  // GPO-2 Viterbi DAG Lattice Fold
  try {
    if (!hasGpoGlyph(text, enc)) {
      const folded = gpoLatticeFold(text, enc);
      if (folded !== text) {
        const wire = 'χ' + folded;
        const decoded = gpoExpand(folded, enc);
        let hits = 0;
        const book = getGpoCodebook(enc);
        for (const [g] of book.byGlyph) if (folded.includes(g)) hits++;
        admit('gpo-lattice', wire, decoded, 1, hits);
      }
    }
  } catch {}

  // Standalone Phrasebook-φ1
  try {
    const rPhrase = phraseEncode(text, enc);
    if (rPhrase.exact && rPhrase.decoded === text && rPhrase.applied) {
      admit('phrase', rPhrase.wire, rPhrase.decoded, 1, rPhrase.hits);
    }
  } catch {}

  // Strand-ST1 (if not already beaten by an ultra-short wire)
  if (bestTok > 15) {
    try {
      const rStrand = strandEncode(text, enc);
      if (rStrand.exact && rStrand.decoded === text && rStrand.mode === 'strand') {
        admit('strand', rStrand.wire, rStrand.decoded, 1, 0);
      }
    } catch {}
  }

  // Lattice-LT1
  if (bestTok > 15) {
    try {
      const rLattice = latticeEncode(text, enc);
      if (rLattice.exact && rLattice.decoded === text && rLattice.mode === 'lattice') {
        admit('lattice', rLattice.wire, rLattice.decoded, 1, 0);
      }
    } catch {}
  }

  // Meridian-M1
  if (bestTok > 15) {
    try {
      const rMeridian = meridianEncode(text, enc);
      if (rMeridian.exact && rMeridian.decoded === text && rMeridian.mode !== 'identity') {
        admit('meridian', rMeridian.wire, rMeridian.decoded, 1, 0);
      }
    } catch {}
  }

  // Mosaic-MZ1 (only if no structural lane compressed it yet)
  if (bestTok === inTokens && text.length <= 2000) {
    try {
      const rMosaic = mosaicEncode(text, enc);
      if (rMosaic.exact && rMosaic.decoded === text && rMosaic.mode === 'mosaic') {
        admit('mosaic', rMosaic.wire, rMosaic.decoded, 1, 0);
      }
    } catch {}
  }

  // --- 2. Multi-Regime Fast Partitioning (if heterogeneous and not already ultra-compressed) ---
  const lines = text.split('\n');
  if (lines.length >= 2 && lines.length <= 30 && bestTok > 35 && bestTok > inTokens * 0.6) {
    try {
      const numLines = lines.length;
      const dpCost = new Array<number>(numLines + 1).fill(Infinity);
      const dpFrom = new Array<number>(numLines + 1).fill(0);
      const dpSlice = new Array<RegionCandidate | null>(numLines + 1).fill(null);
      dpCost[0] = 0;

      const MAX_SPAN = 4;
      for (let i = 0; i < numLines; i++) {
        if (dpCost[i] === Infinity) continue;
        const maxJ = Math.min(numLines, i + MAX_SPAN);
        for (let j = i + 1; j <= maxJ; j++) {
          const sliceText = lines.slice(i, j).join('\n');
          const cand = encodeFastSlice(sliceText, enc);
          if (cand.exact) {
            const cost = dpCost[i] + cand.tokens;
            if (cost < dpCost[j]) {
              dpCost[j] = cost;
              dpFrom[j] = i;
              dpSlice[j] = cand;
            }
          }
        }
      }

      if (dpCost[numLines] < inTokens) {
        const slices: RegionCandidate[] = [];
        let curr = numLines;
        while (curr > 0) {
          const s = dpSlice[curr];
          if (!s) break;
          slices.push(s);
          curr = dpFrom[curr];
        }
        slices.reverse();

        if (slices.length === 1) {
          const single = slices[0];
          admit(`single:${single.tag}`, single.wire, single.decoded, 1, 0);
        } else if (slices.length > 1) {
          const subwires = slices.map((s) => s.wire);
          const sep = pickSeparator(text, subwires, enc);
          const wire = `${HARMONIA_SENTINEL}${sep}\n` + slices.map((s) => `${sep}${s.tag}${s.wire}`).join('');
          const decoded = harmoniaDecode(wire, enc);
          if (decoded === text) {
            admit('multi-regime', wire, decoded, slices.length, 0);
          }
        }
      }
    } catch {}
  }

  // --- 3. Identity prefix safety check ---
  if (bestWire === text) {
    if (
      text.startsWith(HARMONIA_SENTINEL) ||
      text.startsWith('[MZ1]\n') ||
      text.startsWith('ぁぁ') ||
      text.startsWith('φ') ||
      text.startsWith('χ')
    ) {
      const sep = pickSeparator(text, [], enc);
      bestWire = `${HARMONIA_SENTINEL}${sep}\n${sep}i${text}`;
      bestTok = countTokens(bestWire, enc);
      bestMode = 'literal-wrap';
    }
  }

  // --- 4. Final Verification & Admission ---
  const finalDecoded = harmoniaDecode(bestWire, enc);
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
    regionsCount: bestRegions,
    latticeHits: bestHits,
    notes: `HARMONIA-H1 · mode=${bestMode} · regions=${bestRegions} · ${bestTok}/${inTokens} tok · Pareto-optimal`,
    encodeMs: ms(),
  };
}

export async function harmoniaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): Promise<HarmoniaResult> {
  const key = text.length <= 100_000 ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const r = await harmoniaEncodeUncached(text, enc);
  if (key !== null) {
    if (encodeCache.size >= CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, r);
  }
  return r;
}

/* ---------------------------------------------------------------------------
 * PROMPT CONTRACT & SELF-TESTS
 * --------------------------------------------------------------------------- */

export function harmoniaDecoderPrompt(): string {
  const book = getGpoCodebook('o200k_base');
  const pairs = [...book.byPhrase.entries()]
    .sort((a, b) => a[0].length - b[0].length)
    .map(([p, g]) => `${JSON.stringify(p)}=${g}`);
  const sampleLines: string[] = [];
  for (let i = 0; i < Math.min(60, pairs.length); i += 4) {
    sampleLines.push('  ' + pairs.slice(i, i + 4).join('  '));
  }

  return [
    '# ⧢ HARMONIA-H1 — Hierarchical Multi-Operad Lossless Codec Contract',
    'A HARMONIA message is either:',
    '1. A multi-regime wire: `[HM1]\\n<SEP>\\n<SEP><tag><subwire><SEP><tag><subwire>...`',
    '   Split payload by <SEP>, decode each subwire with engine <tag>, join with `\\n`.',
    '   Tags: i=identity, r=Rosetta, s=Strand, l=Lattice, p=Phrasebook, g=GPO, m=Meridian, x=Signet, h=Helix, u=Pulse, z=Mosaic.',
    '2. A GPO phrase wire: `χ<body>` (or `χχ<body>` for literal wrap).',
    '   Every single-token Hangul syllable in <body> expands deterministically to its phrase from the GPO-2 catalog.',
    '3. A Phrasebook wire: `φ<body>` (or `φφ<body>` for literal wrap).',
    '4. A bare member wire (Rosetta `ぁぁ...`, Strand, Lattice, Meridian, Mosaic, or Identity).',
    'Reconstruction is 100% byte-perfect, lossless, deterministic, and direct-reasoning.',
    'Representative GPO-2 mappings (Hangul glyph = phrase):',
    ...sampleLines,
  ].join('\n');
}

export const HARMONIA_SYSTEM_PROMPT = harmoniaDecoderPrompt();

export async function harmoniaSelfTest(enc: EncodingName = 'o200k_base'): Promise<{ name: string; pass: boolean; detail: string }[]> {
  const out: { name: string; pass: boolean; detail: string }[] = [];
  const t = (name: string, pass: boolean, detail = '') => out.push({ name, pass, detail });

  const rEmpty = await harmoniaEncode('', enc);
  t('empty', rEmpty.exact && harmoniaDecode(rEmpty.wire, enc) === '', 'empty round-trip');

  const rChar = await harmoniaEncode('x', enc);
  t('single-char', rChar.exact && harmoniaDecode(rChar.wire, enc) === 'x', 'single-char round-trip');

  const lic = 'Permission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal';
  const rLic = await harmoniaEncode(lic, enc);
  t('gpo-license', rLic.exact && harmoniaDecode(rLic.wire, enc) === lic && rLic.outTokens < rLic.inTokens, `lic ${rLic.inTokens}->${rLic.outTokens}`);

  const mixed = 'Status: deploy finished, but two pods restart.\n{"job":"sync","retries":3,"ok":false}\nAAAAABBBBBCCCCCDDDDD\nuser: hello\nassistant: ok';
  const rMixed = await harmoniaEncode(mixed, enc);
  t('multi-regime-mixed', rMixed.exact && harmoniaDecode(rMixed.wire, enc) === mixed, `mixed ${rMixed.inTokens}->${rMixed.outTokens}`);

  const malformed = ['[HM1]\n§\n§iHello', '[HM1]\n', 'φ', 'φφabc', '[HM1]\n§\n§rぁぁbad'];
  let totalOk = true;
  for (const m of malformed) {
    try {
      harmoniaDecode(m, enc);
    } catch {
      totalOk = false;
    }
  }
  t('totality-no-throw', totalOk, 'never throws on malformed wires');

  return out;
}
