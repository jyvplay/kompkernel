/**
 * bench/test-pareto-redteam.ts
 * =============================================================================
 * PARETO RED TEAM & SYSTEM-WIDE LOSSLESSNESS VERIFICATION SUITE
 *
 * Runs all active codecs against all fixture categories (natural prose, hybrid
 * prose, output prompt log, chaos-1500, chaos-900, chaos-g, chaos-f, etc.)
 * under real BPE tokenization (o200k_base and cl100k_base).
 *
 * Computes exact byte-perfect losslessness D(E(x)) === x, measures execution
 * latency, and determines the true non-dominated Pareto frontier for each category.
 * =============================================================================
 */

import { leaderboard, type Row } from './leaderboard';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import {
  CHAOS_900,
  CHAOS_G_CJK,
  CHAOS_F_LLM_REPORT,
  MOSAIC_HANDTRACE_300,
  BANYAN_INTERLEAVED,
  NATURAL_PROSE,
  HYBRID_PROSE,
  OUTPUT_PROMPT_LOG,
  CHAOS_1500,
  mosaicFixtures,
} from './fixtures';

export interface CategoryResult {
  category: string;
  inTokens: number;
  chars: number;
  paretoFrontier: Row[];
  allValidRows: Row[];
  totalCodecsTested: number;
  exactLosslessCount: number;
}

export function computeParetoFrontier(rows: Row[]): Row[] {
  // Only exact byte-perfect codecs that succeeded
  const valid = rows.filter((r) => r.exact && r.rt && r.wireTokens >= 0);

  // Sort primarily by wireTokens ascending, secondarily by ms ascending
  const sorted = [...valid].sort((a, b) => {
    if (a.wireTokens !== b.wireTokens) return a.wireTokens - b.wireTokens;
    return a.ms - b.ms;
  });

  const frontier: Row[] = [];
  let minMs = Infinity;

  for (const r of sorted) {
    if (r.ms < minMs) {
      frontier.push(r);
      minMs = r.ms;
    } else if (frontier.length > 0 && r.wireTokens === frontier[frontier.length - 1].wireTokens) {
      // Keep ties on token count if ms is equal or close
    }
  }

  return frontier;
}

export async function testCategoryPareto(
  category: string,
  text: string,
  enc: EncodingName = 'o200k_base'
): Promise<CategoryResult> {
  const board = await leaderboard(text, enc);
  const paretoFrontier = computeParetoFrontier(board.rows);
  const validRows = board.rows.filter((r) => r.exact && r.rt && r.wireTokens >= 0);

  return {
    category,
    inTokens: board.inTokens,
    chars: text.length,
    paretoFrontier,
    allValidRows: validRows,
    totalCodecsTested: board.rows.length,
    exactLosslessCount: validRows.length,
  };
}

export async function runFullParetoSuite(enc: EncodingName = 'o200k_base') {
  const mf = mosaicFixtures();
  const agentTurn = mf.prose + '\n' + mf.jsonLog + '\n' + mf.rle + '\n' + mf.chat;

  const categories: Array<[string, string]> = [
    ['NATURAL_PROSE', NATURAL_PROSE],
    ['HYBRID_PROSE', HYBRID_PROSE],
    ['OUTPUT_PROMPT_LOG', OUTPUT_PROMPT_LOG],
    ['CHAOS_1500', CHAOS_1500],
    ['CHAOS_900', CHAOS_900],
    ['CHAOS_G_CJK', CHAOS_G_CJK],
    ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['MOSAIC_HANDTRACE_300', MOSAIC_HANDTRACE_300],
    ['BANYAN_INTERLEAVED', BANYAN_INTERLEAVED],
    ['jsonLog-40', mf.jsonLog],
    ['csv-60', mf.csv],
    ['chat-48', mf.chat],
    ['grid-30', mf.grid],
    ['rle-1400', mf.rle],
    ['idrun-200', mf.idrun],
    ['prose-short', mf.prose],
    ['agent-turn', agentTurn],
  ];

  console.log(`\n=============================================================================`);
  console.log(` SYSTEM-WIDE PARETO RED TEAM SUITE (${enc})`);
  console.log(`=============================================================================`);

  const results: CategoryResult[] = [];

  for (const [name, text] of categories) {
    const res = await testCategoryPareto(name, text, enc);
    results.push(res);

    console.log(`\n--- CATEGORY: ${res.category} (${res.chars} chars, ${res.inTokens} in-tokens) ---`);
    console.log(`  Lossless Codecs Passed: ${res.exactLosslessCount}/${res.totalCodecsTested}`);
    console.log(`  Top Pareto Leaders (Wire Tokens, Speed, Savings):`);

    const top3 = [...res.allValidRows].sort((a, b) => a.wireTokens - b.wireTokens).slice(0, 5);
    for (const r of top3) {
      const pct = res.inTokens ? (((res.inTokens - r.wireTokens) / res.inTokens) * 100).toFixed(1) : '0.0';
      console.log(
        `    * ${r.key.padEnd(18)} : ${String(r.wireTokens).padStart(5)} tokens (${pct}% savings) in ${Math.round(r.ms)}ms [${r.note || 'OK'}]`
      );
    }
  }

  console.log(`\n=============================================================================`);
  console.log(` PARETO FRONTIER SUMMARY ACROSS ALL ${results.length} CATEGORIES`);
  console.log(`=============================================================================`);

  for (const res of results) {
    const winner = [...res.allValidRows].sort((a, b) => a.wireTokens - b.wireTokens)[0];
    const savings = res.inTokens ? (((res.inTokens - winner.wireTokens) / res.inTokens) * 100).toFixed(1) : '0.0';
    console.log(
      `${res.category.padEnd(22)} | in: ${String(res.inTokens).padStart(5)} | best wire: ${String(winner.wireTokens).padStart(5)} (${savings}%) | leader: ${winner.key}`
    );
  }

  return results;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('test-pareto-redteam')) {
  runFullParetoSuite('o200k_base').catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
