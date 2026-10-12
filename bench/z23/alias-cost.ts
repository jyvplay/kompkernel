// Measures the token cost of VX alias references in the body and tests 1-token alias characters.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasEncode } from '@/lib/omega/veritas';
const enc = 'o200k_base' as const;
const files: string[] = [
  'bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt',
  'bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt',
  ...fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)),
  ...fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f)),
];
// candidate alias characters: single o200k tokens on their own
const cand: string[] = [];
for (let c = 0xa1; c < 0x2000 && cand.length < 400; c++) {
  const ch = String.fromCodePoint(c);
  if (/\s/.test(ch)) continue;
  if (countTokens(ch, enc) === 1) cand.push(ch);
}
let totRef = 0, totTok = 0, totAlias = 0, totKeyMismatch = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const v = veritasEncode(t, enc);
  if (!v.wire.startsWith('[[VX1\n')) continue;
  const hdrEnd = v.wire.indexOf('\n]]\n');
  const body = v.wire.slice(hdrEnd + 4);
  const keys = [...new Set([...body.matchAll(/~([0-9a-zA-Z])/g)].map((m) => m[1]).filter((k) => true))];
  const refs = [...body.matchAll(/~([0-9a-zA-Z])/g)].length;
  // token cost of the body as written, and with each ~k replaced by a candidate alias
  const free = cand.filter((c) => !t.includes(c));
  const map = new Map<string, string>();
  keys.forEach((k, i) => map.set(k, free[i % free.length]));
  const bodyAlias = body.replace(/~([0-9a-zA-Z])/g, (_m, k) => map.get(k) as string);
  const a = countTokens(body, enc), b = countTokens(bodyAlias, enc);
  totRef += refs; totTok += a; totAlias += b;
  console.log(`${path.basename(f)}: refs=${refs} keys=${keys.length} body=${a} aliasBody=${b} saved=${a - b} freeAliasChars=${free.length}`);
}
console.log(`TOTAL refs=${totRef} body tokens=${totTok} alias-body tokens=${totAlias} saved=${totTok - totAlias}`);
console.log(`one-token alias pool size (non-space, non-ASCII-letter, single token): ${cand.length}`);
console.log('sample candidates:', cand.slice(0, 40).join(' '));
