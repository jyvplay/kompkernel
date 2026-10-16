/** POLYCHRON reserved-syntax and CHIRON-prefix collision checks. */
import fs from 'node:fs';
import path from 'node:path';
import { polychronEncode, polychronDecode } from '@/lib/omega/polychron';

const ROOT = '/home/user/kompkernel';
const cases = [
  ['valid-chiron-program', '§家foo¶家家家'],
  ['malformed-chiron-prefix', '§Afoo¶AAA'],
  ['valid-dp-looking-identity', '@dp 0,6\nDATE,OPEN\n1990-01-02,1.000\n1990-01-03,2.000\n'],
  ['raw-prefix-identity', '@raw\nDATE,OPEN\n1990-01-02,1.000\n1990-01-03,2.000\n'],
  ['literal-date-marker', 'DATE,OPEN\n1990-01-02,1.000\n※d1,2.000\n'],
  ['crlf-identity', 'DATE,OPEN\r\n1990-01-02,1.000\r\n1990-01-03,2.000\r\n'],
] as const;
const rows = cases.map(([name, text]) => {
  const a = polychronEncode(text);
  const b = polychronEncode(text);
  const decoded = polychronDecode(a.wire);
  return { name, ok: decoded === text && Buffer.from(decoded).equals(Buffer.from(text)) && a.wire === b.wire && a.arm === b.arm, arm: a.arm, exact: a.exact, wirePrefix: a.wire.slice(0, 16) };
});
const out = path.join(ROOT, 'bench/polychron/receipts/collisions.jsonl');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, rows.map(JSON.stringify).join('\n') + '\n', 'utf8');
console.error(`POLYCHRON collisions: ${rows.filter(r => r.ok).length}/${rows.length}; receipt=${out}`);
if (rows.some(r => !r.ok)) process.exitCode = 1;
