// X16 probe: token cost of typographic punctuation in real prose/markdown files (raw o200k, no codec).
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const curly = (t.match(/[\u201C\u201D\u2018\u2019]/g) || []).length;
  const dash = (t.match(/\u2014|\u2013/g) || []).length;
  const ell = (t.match(/\u2026/g) || []).length;
  const norm = t.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\u2014/g, '--').replace(/\u2013/g, '-').replace(/\u2026/g, '...');
  const a = encode(t).length, b = encode(norm).length;
  console.log(JSON.stringify({ file: f, curly, dash, ell, rawTok: a, normTok: b, saved: a - b }));
}
