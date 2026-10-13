// Z38: whitespace share of the VXR wire body (default search, speed) on the ops and ops_real lanes, and the
// collapse bound on the wire body only (header and key characters untouched).
import fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
import { veritasREncode } from '@/lib/omega/veritas-r';
import { TERMINATOR } from '@/lib/omega/veritas-u';
const R = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sel = R.filter((r) => r.group === 'ops_real' || r.group === 'ops');
const agg: Record<string, { n: number; out: number; ws: number; tok: number; collapsed: number }> = {};
for (const r of sel) {
  const text = fs.readFileSync(r.file, 'utf8');
  const enc = veritasREncode(text);
  const w = enc.wire;
  const ti = w.indexOf('\n' + TERMINATOR + '\n');
  const body = w.slice(ti + TERMINATOR.length + 2);
  const toks = tokenStrings(body, 'o200k_base');
  const ws = toks.filter((t) => /^\s+$/.test(t.s)).length;
  const bodyTok = toks.length;
  const collapsedBody = body.replace(/ {2,}/g, ' ');
  const g = (agg[r.group] ??= { n: 0, out: 0, ws: 0, tok: 0, collapsed: 0 });
  g.n++; g.out += enc.outTokens; g.ws += ws; g.tok += bodyTok; g.collapsed += countTokens(collapsedBody, 'o200k_base');
  console.error(r.file.split('/').pop(), enc.outTokens, 'bodyTok', bodyTok, 'wsTok', ws);
}
for (const [k, g] of Object.entries(agg)) console.log(JSON.stringify({ lane: k, files: g.n, vxrOut: g.out, bodyTok: g.tok, wsOnlyBodyTokPct: +(100 * g.ws / g.tok).toFixed(2), bodyCollapsed: g.collapsed, bodySavePctOfOut: +(100 * (g.tok - g.collapsed) / g.out).toFixed(2) }));
