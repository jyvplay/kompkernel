/**
 * bench/pareto-frontier.ts
 * Comprehensive Pareto Frontier & Red Team Analysis across all categories:
 * - Existing: handtrace-300, json-log-40, csv-60, chat-48, grid-30, rle-1400,
 *   idrun-200, prose, agent-turn, two-regime, three-regime, chaos-900, chaos-G
 * - New: chaos-1500, natural-prose (literary, technical, essay), hybrid-prose (markdown, apispec),
 *   prompt-log-output (agent trajectory, reasoning trace).
 *
 * Checks 100% exact round-trip losslessness and identifies the true Pareto frontier.
 */
import { leaderboard, type Row } from './leaderboard';
import {
  CHAOS_900,
  CHAOS_G_CJK,
  CHAOS_1500,
  NATURAL_PROSE_SUITE,
  HYBRID_PROSE_SUITE,
  PROMPT_LOG_OUTPUT_SUITE,
  mosaicFixtures,
  MOSAIC_HANDTRACE_300,
} from './fixtures';
import { countTokens } from '../src/lib/omega/bpe';

export interface CategoryResult {
  category: string;
  charLength: number;
  inTokens: number;
  totalCodecsTested: number;
  exactCodecsCount: number;
  paretoWireLeader: { key: string; wireTokens: number; savingsPct: number; ms: number };
  paretoDeliveredLeader?: { key: string; deliveredTokens: number };
  allParetoLeaders: string[];
  rows: Row[];
}

export async function runParetoFrontierSuite(enc: 'o200k_base' | 'cl100k_base' = 'o200k_base'): Promise<CategoryResult[]> {
  const f = mosaicFixtures();
  const agentTurn = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;

  const categories: Array<[string, string]> = [
    // Existing categories
    ['handtrace-300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
    ['agent-turn', agentTurn],
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
    ['chaos-900', CHAOS_900],
    ['chaos-G', CHAOS_G_CJK],

    // Newly added categories
    ['chaos-1500', CHAOS_1500],
    ['natural-prose-literary', NATURAL_PROSE_SUITE.literary],
    ['natural-prose-technical', NATURAL_PROSE_SUITE.technical],
    ['natural-prose-essay', NATURAL_PROSE_SUITE.essay],
    ['hybrid-prose-markdown', HYBRID_PROSE_SUITE.markdownDoc],
    ['hybrid-prose-apispec', HYBRID_PROSE_SUITE.apiSpec],
    ['prompt-log-agent-trajectory', PROMPT_LOG_OUTPUT_SUITE.agentTrajectory],
    ['prompt-log-reasoning-trace', PROMPT_LOG_OUTPUT_SUITE.reasoningTrace],
  ];

  const results: CategoryResult[] = [];

  console.log(`\n================================================================================`);
  console.log(`PARETO FRONTIER & RED TEAM EVALUATION SUITE (${enc})`);
  console.log(`================================================================================\n`);

  for (const [name, text] of categories) {
    const inTokens = countTokens(text, enc);
    const board = await leaderboard(text, enc);
    const exactRows = board.rows.filter((r) => r.exact && r.rt && r.wireTokens >= 0);

    if (exactRows.length === 0) {
      throw new Error(`CRITICAL: No exact lossless codecs succeeded on category '${name}'`);
    }

    const minWire = Math.min(...exactRows.map((r) => r.wireTokens));
    const wireLeaders = exactRows.filter((r) => r.wireTokens === minWire);
    const primaryWireLeader = wireLeaders[0];
    const savingsPct = inTokens > 0 ? ((inTokens - minWire) / inTokens) * 100 : 0;

    let deliveredLeader: { key: string; deliveredTokens: number } | undefined;
    const deliveredRows = exactRows.filter((r) => r.deliveredTokens != null);
    if (deliveredRows.length > 0) {
      const minDeliv = Math.min(...deliveredRows.map((r) => r.deliveredTokens as number));
      const delivLeaders = deliveredRows.filter((r) => r.deliveredTokens === minDeliv);
      deliveredLeader = { key: delivLeaders.map((r) => r.key).join(', '), deliveredTokens: minDeliv };
    }

    const paretoKeys = Array.from(new Set(wireLeaders.map((r) => r.key)));

    results.push({
      category: name,
      charLength: text.length,
      inTokens,
      totalCodecsTested: board.rows.length,
      exactCodecsCount: exactRows.length,
      paretoWireLeader: {
        key: wireLeaders.map((r) => r.key).join(', '),
        wireTokens: minWire,
        savingsPct,
        ms: primaryWireLeader.ms,
      },
      paretoDeliveredLeader: deliveredLeader,
      allParetoLeaders: paretoKeys,
      rows: board.rows,
    });

    console.log(`Category: ${name.padEnd(28)} | Chars: ${String(text.length).padStart(5)} | In-Tok: ${String(inTokens).padStart(5)}`);
    console.log(`  🏆 Wire Pareto Leader(s): ${wireLeaders.map((r) => r.key).join(', ')} -> ${minWire} tok (${savingsPct.toFixed(1)}% savings)`);
    if (deliveredLeader) {
      console.log(`  📦 Delivered Leader(s)  : ${deliveredLeader.key} -> ${deliveredLeader.deliveredTokens} tok`);
    }
    console.log(`--------------------------------------------------------------------------------`);
  }

  return results;
}

async function main() {
  const results = await runParetoFrontierSuite('o200k_base');

  console.log(`\n================================================================================`);
  console.log(`PARETO FRONTIER SUMMARY TABLE`);
  console.log(`================================================================================`);
  console.log(`Category                    Chars  InTok  WireTok  Savings%  Pareto Leaders`);
  console.log(`--------------------------------------------------------------------------------`);

  for (const r of results) {
    console.log(
      r.category.padEnd(26) +
      String(r.charLength).padStart(7) +
      String(r.inTokens).padStart(7) +
      String(r.paretoWireLeader.wireTokens).padStart(9) +
      (r.paretoWireLeader.savingsPct.toFixed(1) + '%').padStart(10) + '  ' +
      r.paretoWireLeader.key
    );
  }
}

if (process.argv[1]?.endsWith('pareto-frontier.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
