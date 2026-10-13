// Z38: share of o200k tokens that are markup/whitespace-only, per lane, on the 151-file corpus.
// Classes: ws-only token, blank-line run token, md table separator row, leading-indent token, trailing-space token.
import fs from 'node:fs';
import { tokenStrings } from '@/lib/omega/bpe';
const R = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const agg: Record<string, { files: number; tok: number; ws: number; sepRow: number; indent: number; trail: number }> = {};
for (const r of R) {
  if (!fs.existsSync(r.file)) continue;
  const text = fs.readFileSync(r.file, 'utf8');
  const toks = tokenStrings(text, 'o200k_base');
  let ws = 0, indent = 0, trail = 0;
  for (const t of toks) {
    if (/^\s+$/.test(t.s)) ws++;
    else if (/^\s/.test(t.s) && /^\s*\S/.test(t.s) && t.s.startsWith('  ')) indent++;
  }
  // table separator rows: lines matching ^\s*\|?\s*:?-{3,}
  let sepRow = 0;
  const lines = text.split('\n');
  for (const ln of lines) if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(ln) && ln.includes('-')) sepRow++;
  for (const ln of lines) if (/[ \t]+$/.test(ln)) trail++;
  const g = (agg[r.group] ??= { files: 0, tok: 0, ws: 0, sepRow: 0, indent: 0, trail: 0 });
  g.files++; g.tok += toks.length; g.ws += ws; g.indent += indent; g.sepRow += sepRow; g.trail += trail;
}
for (const [k, g] of Object.entries(agg)) console.log(JSON.stringify({ lane: k, files: g.files, tokens: g.tok, wsOnlyTokPct: +(100 * g.ws / g.tok).toFixed(2), indentTokPct: +(100 * g.indent / g.tok).toFixed(2), sepRowLines: g.sepRow, trailingSpaceLines: g.trail }));
