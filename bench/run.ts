/**
 * bench/run.ts — CLI entry: runs the leaderboard on the chaotic 900-char
 * hetero fixture plus the repo's canonical fixture set and new categories.
 * Real tokenizer only.
 */
import { leaderboard, printBoard, type Row } from './leaderboard';
import {
  CHAOS_900,
  CHAOS_G_CJK,
  NATURAL_PROSE_1000,
  HYBRID_PROSE_1200,
  OUTPUT_PROMPT_LOG_2000,
  CHAOS_1500,
  mosaicFixtures,
  MOSAIC_HANDTRACE_300,
} from './fixtures';

async function main() {
  const encArg = (process.argv[2] as any) || 'o200k_base';

  // 1. CHAOS_900
  if (CHAOS_900.length !== 900) {
    console.error('CHAOS_900 FIXTURE LENGTH != 900, fix the fixture');
    process.exit(2);
  }
  const board = await leaderboard(CHAOS_900, encArg);
  printBoard('CHAOS-900', CHAOS_900, encArg, board.rows, board.inTokens);

  // 2. CHAOS_G_CJK
  if (CHAOS_G_CJK.length !== 900) {
    console.error('CHAOS_G_CJK FIXTURE LENGTH != 900, fix the fixture');
    process.exit(2);
  }
  const gBoard = await leaderboard(CHAOS_G_CJK, encArg);
  printBoard('CHAOS-G (CJK-heavy)', CHAOS_G_CJK, encArg, gBoard.rows, gBoard.inTokens);

  // 3. NATURAL_PROSE_1000
  if (NATURAL_PROSE_1000.length !== 1000) {
    console.error('NATURAL_PROSE_1000 FIXTURE LENGTH != 1000, fix the fixture');
    process.exit(2);
  }
  const npBoard = await leaderboard(NATURAL_PROSE_1000, encArg);
  printBoard('NATURAL-PROSE-1000', NATURAL_PROSE_1000, encArg, npBoard.rows, npBoard.inTokens);

  // 4. HYBRID_PROSE_1200
  if (HYBRID_PROSE_1200.length !== 1200) {
    console.error('HYBRID_PROSE_1200 FIXTURE LENGTH != 1200, fix the fixture');
    process.exit(2);
  }
  const hpBoard = await leaderboard(HYBRID_PROSE_1200, encArg);
  printBoard('HYBRID-PROSE-1200', HYBRID_PROSE_1200, encArg, hpBoard.rows, hpBoard.inTokens);

  // 5. OUTPUT_PROMPT_LOG_2000
  if (OUTPUT_PROMPT_LOG_2000.length !== 2000) {
    console.error('OUTPUT_PROMPT_LOG_2000 FIXTURE LENGTH != 2000, fix the fixture');
    process.exit(2);
  }
  const plBoard = await leaderboard(OUTPUT_PROMPT_LOG_2000, encArg);
  printBoard('OUTPUT-PROMPT-LOG-2000', OUTPUT_PROMPT_LOG_2000, encArg, plBoard.rows, plBoard.inTokens);

  // 6. CHAOS_1500
  if (CHAOS_1500.length !== 1500) {
    console.error('CHAOS_1500 FIXTURE LENGTH != 1500, fix the fixture');
    process.exit(2);
  }
  const c15Board = await leaderboard(CHAOS_1500, encArg);
  printBoard('CHAOS-1500', CHAOS_1500, encArg, c15Board.rows, c15Board.inTokens);

  const f = mosaicFixtures();
  const agentTurn = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;
  const suite: Array<[string, string]> = [
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
    ['natural-prose-1000', NATURAL_PROSE_1000],
    ['hybrid-prose-1200', HYBRID_PROSE_1200],
    ['prompt-log-2000', OUTPUT_PROMPT_LOG_2000],
    ['chaos-1500', CHAOS_1500],
  ];

  const summary = new Map<string, { wire: number; deliv: number | null; exact: boolean }>();
  for (const [name, text] of suite) {
    const b = await leaderboard(text, encArg);
    printBoard(name, text, encArg, b.rows, b.inTokens);
    for (const r of b.rows) {
      if (!r.exact || !r.rt || r.wireTokens < 0) continue;
      const s = summary.get(r.key) ?? { wire: 0, deliv: 0, exact: true };
      s.wire += r.wireTokens;
      if (r.deliveredTokens != null) s.deliv = (s.deliv ?? 0) + r.deliveredTokens;
      summary.set(r.key, s);
    }
  }
  console.log('\n=== TOTAL wire tokens across ALL fixture categories (lower = better) ===');
  const tot = [...summary.entries()].map(([k, v]) => ({ k, w: v.wire, d: v.deliv })).sort((a, b) => a.w - b.w);
  for (const t of tot) console.log(t.k.padEnd(18), String(t.w).padStart(7), t.d != null ? String(t.d).padStart(8) : '       -');
}

main().catch((e) => { console.error(e); process.exit(1); });
