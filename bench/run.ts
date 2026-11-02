/**
 * bench/run.ts — CLI entry: runs the leaderboard on the chaotic 900-char
 * hetero fixture plus the repo's canonical fixture set. Real tokenizer only.
 */
import { leaderboard, printBoard, type Row } from './leaderboard';
import {
  CHAOS_900,
  CHAOS_G_CJK,
  mosaicFixtures,
  MOSAIC_HANDTRACE_300,
  NATURAL_PROSE,
  HYBRID_PROSE,
  OUTPUT_PROMPT_LOG,
  CHAOS_1500,
} from './fixtures';

// ---------------------------------------------------------------------------
// THE 900-CHARACTER CHAOTIC HETERO FIXTURE
// prose + markdown list + CSV + JSON + random code + Chinese + log line.
// Constructed to be exactly 900 characters (verified at runtime).
// ---------------------------------------------------------------------------

async function main() {
  const encArg = (process.argv[2] as any) || 'o200k_base';
  const chaos1500Len = [...CHAOS_1500].length;
  console.log(`CHAOS_1500 length = ${CHAOS_1500.length} chars, ${chaos1500Len} code points`);
  if (CHAOS_1500.length !== 1500) {
    console.error('CHAOS_1500 FIXTURE LENGTH != 1500, fix the fixture');
    process.exit(2);
  }
  const c1500Board = await leaderboard(CHAOS_1500, encArg);
  printBoard('CHAOS-1500', CHAOS_1500, encArg, c1500Board.rows, c1500Board.inTokens);

  const chaosLen = [...CHAOS_900].length;
  console.log(`CHAOS_900 length = ${CHAOS_900.length} chars, ${chaosLen} code points`);
  if (CHAOS_900.length !== 900) {
    console.error('FIXTURE LENGTH != 900, fix the fixture');
    process.exit(2);
  }

  const board = await leaderboard(CHAOS_900, encArg);
  printBoard('CHAOS-900', CHAOS_900, encArg, board.rows, board.inTokens);

  const gLen = [...CHAOS_G_CJK].length;
  console.log(`CHAOS_G length = ${CHAOS_G_CJK.length} chars, ${gLen} code points`);
  if (CHAOS_G_CJK.length !== 900) {
    console.error('FIXTURE LENGTH != 900, fix the fixture');
    process.exit(2);
  }
  const gBoard = await leaderboard(CHAOS_G_CJK, encArg);
  printBoard('CHAOS-G (CJK-heavy)', CHAOS_G_CJK, encArg, gBoard.rows, gBoard.inTokens);
  const gExact = gBoard.rows.filter((r) => r.exact && r.rt && r.wireTokens >= 0);
  const gBest = Math.min(...gExact.map((r) => r.wireTokens));
  console.log(`\nbest wire tokens on CHAOS-G = ${gBest} (${gExact.filter((r) => r.wireTokens === gBest).map((r) => r.key).join(', ')})`);

  // Pareto analysis on CHAOS-900: frontier over (wireTokens) for exact codecs.
  const exactRows = board.rows.filter((r) => r.exact && r.rt && r.wireTokens >= 0);
  const bestWire = Math.min(...exactRows.map((r) => r.wireTokens));
  const bestDeliv = Math.min(...exactRows.filter((r) => r.deliveredTokens != null).map((r) => r.deliveredTokens as number));
  console.log(`\nbest wire tokens = ${bestWire} (${exactRows.filter((r) => r.wireTokens === bestWire).map((r) => r.key).join(', ')})`);
  console.log(`best delivered tokens = ${bestDeliv} (${exactRows.filter((r) => r.deliveredTokens === bestDeliv).map((r) => r.key).join(', ')})`);

  const f = mosaicFixtures();
  const agentTurn = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;
  const suite: Array<[string, string]> = [
    ['natural-prose', NATURAL_PROSE],
    ['hybrid-prose', HYBRID_PROSE],
    ['output-prompt-log', OUTPUT_PROMPT_LOG],
    ['chaos-1500', CHAOS_1500],
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
  console.log('\n=== TOTAL wire tokens across fixture suite (lower = better) ===');
  const tot = [...summary.entries()].map(([k, v]) => ({ k, w: v.wire, d: v.deliv })).sort((a, b) => a.w - b.w);
  for (const t of tot) console.log(t.k.padEnd(14), String(t.w).padStart(7), t.d != null ? String(t.d).padStart(8) : '       -');
}

main().catch((e) => { console.error(e); process.exit(1); });
