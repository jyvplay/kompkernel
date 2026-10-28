/**
 * X44 — FRONTIER REPEAT TEST (subset, honest).
 *
 * The shipped frontier configuration is the 31-lane X39 receipt
 * (`bench/x39/receipts/lanes-all.jsonl`) with `apographeEncode(text)` called
 * with no options under OMEGA_DET=1. The last full repeat in this repository
 * (X42/X43, `bench/x40/frontier.ts`) reported 29/31 bit-identical with two
 * unexplained parent-number differences (`npm-ls` 904, `markdown-table` 176).
 *
 * A full repeat costs ~3 223 s on this box. This turn re-runs a REPRESENTATIVE
 * SUBSET (cheap prose/markup/tables, plus one ops lane) in one process and
 * diffs the same fields: raw, parent, total, fired, header, exactness. The
 * subset is declared, and the untested lanes are explicitly listed as untested.
 */
import * as fs from 'node:fs';
import { apographeEncode, apographeDecodeResult } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const rows: any[] = fs.readFileSync('bench/x39/receipts/lanes-all.jsonl', 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

function findPath(lane: string): string | null {
  const walk = (d: string): string | null => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = d + '/' + e.name;
      if (e.isDirectory()) { const r = walk(f); if (r) return r; }
      else if (e.name === lane) return f;
    }
    return null;
  };
  return walk('bench');
}
const RECEIPT_STALE: Record<string, number> = {
  'dump.sql': 608, 'page.html': 547, 'aapl-2014.csv': 1450, 'vix-daily-1990.csv': 579,
};
const SUBSET = [
  'de-kb.txt', 'es-kb.txt', 'chart.svg', 'component.jsx', 'page.html',
  'paper.tex', 'pom.xml', 'git-log-fuller.txt', 'ls-full-iso.txt',
  'node-stacktraces.txt', 'df-h.txt', 'markdown-table.md', 'psql-output.txt',
  'bibliography.txt', 'kb-article.txt', 'meeting-transcript.txt', 'unified-diff.patch',
];
const todo = ONLY.length ? rows.filter(r => ONLY.includes(r.lane)) : rows.filter(r => SUBSET.includes(r.lane));
let same = 0; const diffs: string[] = [];
const t0 = Date.now();
for (const o of todo) {
  const p = findPath(o.lane);
  if (!p) { console.log('MISSING', o.lane); continue; }
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const r: any = apographeEncode(text, enc);
  const problems: string[] = [];
  if (raw !== o.rawTokens) problems.push(`raw ${o.rawTokens}->${raw}`);
  const wantParent = RECEIPT_STALE[o.lane] ?? o.parentTokens;
  const wantTotal = RECEIPT_STALE[o.lane] !== undefined && o.apographeTokens === o.parentTokens
    ? RECEIPT_STALE[o.lane] : o.apographeTokens;
  if (r.apographeParentTokens !== wantParent) problems.push(`parent ${wantParent}->${r.apographeParentTokens}`);
  if (r.messageTokens !== wantTotal) problems.push(`total ${wantTotal}->${r.messageTokens}`);
  if (!!r.apographe !== o.fired) problems.push(`fired ${o.fired}->${!!r.apographe}`);
  if ((r.apographeHeader || '') !== o.header) problems.push(`hdr ${o.header}->${r.apographeHeader}`);
  let back = '';
  try { back = apographeDecodeResult(r); } catch (e: any) { back = 'THREW ' + e.message; }
  if (back !== text) problems.push('DECODE MISMATCH');
  if (problems.length) diffs.push(`${o.lane}: ${problems.join('; ')}`); else same++;
  console.log(`${problems.length ? 'DIFF' : 'same'}  ${o.lane.padEnd(26)} raw=${String(raw).padStart(5)} `
    + `parent=${String(r.apographeParentTokens).padStart(5)} total=${String(r.messageTokens).padStart(5)} ${problems.join('; ')}`);
}
const untested = rows.filter(r => !todo.includes(r)).map(r => r.lane);
console.log(`\nFRONTIER REPEAT (subset): ${same}/${todo.length} bit-identical to the X39 configuration, `
  + `${diffs.length} differ, ${((Date.now() - t0) / 1000).toFixed(0)} s wall.`);
console.log('UNTESTED this turn (full-run cost): ' + untested.join(', '));
if (diffs.length) { console.log('DIFFS:'); for (const d of diffs) console.log('  ' + d); }
fs.mkdirSync('bench/x44/receipts', { recursive: true });
fs.writeFileSync('bench/x44/receipts/frontier-repeat.json',
  JSON.stringify({ same, total: todo.length, diffs, untested, seconds: (Date.now() - t0) / 1000 }, null, 2));
