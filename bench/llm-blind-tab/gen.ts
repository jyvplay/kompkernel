// Writes the column-arm message for each hidden table (forced column arm), plus the hidden checks.
import fs from 'node:fs';
import { parseTable, transposeTable, untransposeTable, COLUMN_NOTE } from '../../src/lib/omega/tabmin';
import { lakonikosEncode } from '../../src/lib/omega/lakonikos';
import { chironDecode } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';
for (const i of [1, 2, 3]) {
  const T = fs.readFileSync(`bench/llm-blind-tab/hidden/table_${i}.csv`, 'utf8');
  const rows = parseTable(T)!;
  const TT = transposeTable(rows);
  const col = lakonikosEncode(TT, 'o200k_base');
  const msg = COLUMN_NOTE + '\n' + col.decoderPrompt;
  const ok = untransposeTable(chironDecode(col.wire)) === T;
  fs.writeFileSync(`bench/llm-blind-tab/visible/msg_${i}.txt`, msg);
  fs.writeFileSync(`bench/llm-blind-tab/hidden/wire_${i}.txt`, col.wire);
  fs.writeFileSync(`bench/llm-blind-tab/hidden/colTT_${i}.txt`, TT);
  console.log(JSON.stringify({ i, rows: rows.length, cols: rows[0].length, msgTokens: countTokens(msg, 'o200k_base'), rawTokens: countTokens(T, 'o200k_base'), roundTrip: ok, arm: col.mode }));
}
