// Z35: build the VXR wire from a character-level selection and count exact one-chat tokens. Exactness checked.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { aliasPool, veritasADecode, escBody } from '@/lib/omega/veritas-a';
import { wireR } from '@/lib/omega/veritas-r';
const enc = 'o200k_base' as const;
const [selPath, textPath] = process.argv.slice(2);
const sel = JSON.parse(fs.readFileSync(selPath, 'utf8')).chosen as { phrase: string; starts: number[] }[];
const text = fs.readFileSync(textPath, 'utf8');
const pool = aliasPool(enc).filter((c) => !text.includes(c));
if (sel.length > pool.length) throw new Error('not enough keys');
const entries = sel.map((s, i) => ({ key: pool[i], phrase: s.phrase }));
const spans: { st: number; len: number; key: string }[] = [];
sel.forEach((s, i) => s.starts.forEach((st) => spans.push({ st, len: s.phrase.length, key: pool[i] })));
spans.sort((a, b) => a.st - b.st);
const body0 = escBody(text);
let body = '', pos = 0;
for (const sp of spans) {
  if (sp.st < pos) throw new Error('overlap');
  body += body0.slice(pos, sp.st) + sp.key;
  pos = sp.st + sp.len;
}
body += body0.slice(pos);
const wire = wireR(entries, body);
const exact = veritasADecode(wire) === text;
console.log(JSON.stringify({ file: textPath.split('/').pop(), entries: entries.length, spans: spans.length, outTokens: countTokens(wire, enc), inTokens: countTokens(text, enc), exact }));
