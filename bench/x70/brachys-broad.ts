/**
 * X70 broad gate: BRACHYS vs the shipped frontier on every table-shaped lane in
 * the bench trees, plus prose/code controls. Each row is measured twice in one
 * process: the frontier (tagstackEncode) and BRACHYS. Every BRACHYS message is
 * decoded by the from-spec reader and compared code-unit for code-unit.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { brachysEncode, brachysDecodeMessage } from '../../src/lib/omega/brachys';

const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = brachysEncode(text, enc);
  const specDecoded = r.brachys ? brachysDecodeMessage(r.message) : null;
  const row = {
    path: p, chars: text.length, raw: countTokens(text, enc),
    frontier: r.frontierFloor, brachysM: r.messageTokens,
    delta: r.messageTokens - r.frontierFloor,
    winner: r.brachysWinner, arm: r.brachysArm,
    contract: r.contractTokens, wire: r.wireTokens, dirs: r.dirs.join(';'),
    specReaderExact: r.brachys ? specDecoded === text : null,
    frontierExact: r.decoded === text,
    messageSha: crypto.createHash('sha256').update(r.message, 'utf8').digest('hex').slice(0, 16),
    ms: r.ms, notes: r.notes,
  };
  rows.push(row);
  console.error(`${p}: raw ${row.raw} frontier ${row.frontier} brachys ${row.brachysM} (${row.delta}) ${row.winner} arm=${row.arm} c+w=${row.contract}+${row.wire} spec=${row.specReaderExact} ${row.ms}ms`);
  fs.mkdirSync('bench/x70/receipts', { recursive: true });
  fs.writeFileSync('bench/x70/receipts/brachys-broad.json', JSON.stringify({ encoding: enc, node: process.version, rows }, null, 2) + '\n');
}
const wins = rows.filter((r) => r.delta < 0);
console.log(`lanes ${rows.length}  wins ${wins.length}  total frontier ${rows.reduce((a, b) => a + b.frontier, 0)}  total brachys ${rows.reduce((a, b) => a + b.brachysM, 0)}  saved ${rows.reduce((a, b) => a + Math.min(0, b.delta), 0)}`);
