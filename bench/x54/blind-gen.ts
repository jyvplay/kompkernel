// X54 blind samples: B1 = statement_A header+data rows 100..139 (40 rows),
// B2 = mai-excerpt header+data rows 60..84 (25 rows, German format).
import * as fs from 'node:fs';
import { athroismosPlan } from '../../src/lib/omega/athroismos';
const ENC = 'o200k_base' as const;
fs.mkdirSync('bench/x54/blind/visible', { recursive: true });
fs.mkdirSync('bench/x54/blind/hidden', { recursive: true });
fs.mkdirSync('bench/x54/blind/decode', { recursive: true });
function emit(name: string, path: string, from: number, to: number) {
  const lines = fs.readFileSync(path, 'utf8').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const slice = [lines[0]!, ...lines.slice(from, to)].join('\n') + '\n';
  const p = athroismosPlan(slice, ENC);
  if (!p) { console.log(name, 'NO PLAN'); process.exit(1); }
  fs.writeFileSync(`bench/x54/blind/visible/${name}.message`, p.contract + '\n' + p.reducedText);
  fs.writeFileSync(`bench/x54/blind/hidden/${name}.orig`, slice);
  console.log(name, 'ready rows=' + (to - from));
}
emit('B1', 'bench/x54/fixtures/statement_A.csv', 100, 140);
emit('B2', 'bench/x54/fixtures/mai-excerpt.csv', 60, 85);
