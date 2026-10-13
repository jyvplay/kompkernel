// Z39: build the external LLM-decode test kit for VERITAS-P (same legend and instruction as VERITAS-Q).
// Output (regenerable, NOT committed): kit/<id>.prompt.txt  = the single user message (no system prompt),
//                                      kit/manifest.jsonl    = id, source file, sha256 of original, token counts.
// The original text is never put in the prompt. Score replies with score.ts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { veritasPEncode } from '@/lib/omega/veritas-p';
const OUT = process.env.KIT_OUT ?? '/home/user/z39/kit-p';
const FILES = [
  'bench/holdout/readme.txt', 'bench/holdout/gh-prose.txt', 'bench/holdout/license.txt',
  'bench/z28/wrapped-real/git-readme.md', 'bench/z28/wrapped-real/linux-coding-style.rst',
  'bench/holdout/code-ts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt',
  'bench/z29/ops-real/df-h.txt', 'bench/z29/ops-real/ls-usr-lib.txt',
];
fs.mkdirSync(OUT, { recursive: true });
const lines: string[] = [];
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.error('missing', f); continue; }
  const text = fs.readFileSync(f, 'utf8');
  const q = veritasPEncode(text);
  const id = path.basename(f).replace(/[^A-Za-z0-9._-]/g, '_');
  if (q.legend === 'none') { console.error('no legend (raw), skipped', f); continue; }
  if (!q.exact) { console.error('NOT EXACT, skipped', f); continue; }
  fs.writeFileSync(path.join(OUT, `${id}.prompt.txt`), q.wire, 'utf8');
  lines.push(JSON.stringify({ id, source: f, sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'), chars: text.length, inTokens: q.inTokens, vxpTokens: q.outTokens, codec: 'veritas-p', legend: q.legend }));
}
fs.writeFileSync(path.join(OUT, 'manifest.jsonl'), lines.join('\n') + '\n');
console.log(`wrote ${lines.length} prompts to ${OUT}`);
