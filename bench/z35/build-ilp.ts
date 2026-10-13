// Z35: build the VXR wire from an ILP selection (token-aligned flat spans) and count the exact one-chat tokens.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { aliasPool } from '@/lib/omega/veritas-a';
import { wireR } from '@/lib/omega/veritas-r';
import { veritasADecode } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const sel: { file: string; N: number; chosen: { phrase: string; starts: number[]; wspan: Record<string, number> }[] }[] = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const toksByFile = new Map<string, string[]>();
for (const l of fs.readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); toksByFile.set(r.file, r.toks); }
for (const rec of sel) {
  const text = fs.readFileSync(rec.file, 'utf8');
  const toks = toksByFile.get(rec.file)!;
  const pool = aliasPool(enc).filter((c) => !text.includes(c));
  const entries = rec.chosen.map((c, i) => ({ key: pool[i], phrase: c.phrase, starts: c.starts, wspan: c.wspan }));
  // mark replacements: token index -> entry index (spans are non-overlapping by construction of the ILP)
  const at = new Map<number, { ei: number; w: number }>();
  entries.forEach((e, ei) => e.starts.forEach((s) => at.set(s, { ei, w: e.wspan[String(s)] })));
  let body = '';
  for (let i = 0; i < toks.length; ) {
    const hit = at.get(i);
    if (hit) { body += entries[hit.ei].key; i += hit.w; } else { body += toks[i]; i++; }
  }
  const wire = wireR(entries.map((e) => ({ key: e.key, phrase: e.phrase })), body);
  const ok = veritasADecode(wire) === text;
  console.log(JSON.stringify({ file: rec.file.split('/').pop(), entries: entries.length, outTokens: countTokens(wire, enc), exact: ok, inTokens: countTokens(text, enc) }));
}
