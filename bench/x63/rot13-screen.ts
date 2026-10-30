import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';

const lanes = [
  ['kb', 'bench/holdout-work/kb-article.txt'],
  ['email', 'bench/holdout-work/email-thread.txt'],
  ['answer', 'bench/holdout-work/llm-answer.md'],
  ['diff', 'bench/holdout-work/unified-diff.patch'],
  ['tree-src', 'bench/z55/lanes/tree-src.txt'],
  ['tree-bench', 'bench/z55/lanes/tree-bench.txt'],
] as const;
const rot13 = (s: string) => s.replace(/[A-Za-z]/g, (c) => {
  const n = c.charCodeAt(0), base = n >= 97 ? 97 : 65;
  return String.fromCharCode(base + ((n - base + 13) % 26));
});
const results = lanes.map(([name, path]) => {
  const source = fs.readFileSync(path, 'utf8');
  const transformed = rot13(source);
  return {
    name, path, sha256: crypto.createHash('sha256').update(source).digest('hex'),
    chars: source.length, sourceTokens: countTokens(source, 'o200k_base'),
    transformedTokens: countTokens(transformed, 'o200k_base'),
    exact: rot13(transformed) === source,
  };
});
const receipt = { encoding: 'o200k_base', transform: 'ASCII ROT13 letters; all other UTF-16 code units literal', results };
fs.mkdirSync('bench/x63/receipts', { recursive: true });
fs.writeFileSync('bench/x63/receipts/rot13-screen.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (results.some((r) => !r.exact || r.transformedTokens <= r.sourceTokens)) process.exitCode = 1;
