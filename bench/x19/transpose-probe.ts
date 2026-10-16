// X19: does storing a table column-major help the arm? (transposition as a pre-transform)
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { densEncode } from '@/lib/omega/dendrons';
import { akolouthia2Encode } from '@/lib/omega/akolouthia2';

const enc = 'o200k_base' as const;

function arms(t: string): number {
  let m = Infinity;
  for (const f of [
    () => (lakonikosDualEncode(t, enc) as any).messageTokens.o200k_base,
    () => (densEncode(t, enc, {}) as any).messageTokens,
    () => (akolouthia2Encode(t, enc) as any).messageTokens,
  ]) { try { const v = f(); if (typeof v === 'number' && v < m) m = v; } catch {} }
  return m;
}

/** split a line into cells; return the delimiter actually used */
function splitLine(s: string, delim: string | null): { cells: string[]; n: number } {
  if (delim === null) { const c = s.trim().split(/\s+/); return { cells: c, n: c.length }; }
  return { cells: s.split(delim), n: s.split(delim).length };
}

function transpose(text: string, delim: string | null): string | null {
  const lines = text.split('\n');
  // trailing empty line is the file terminator
  const last = lines[lines.length - 1] === '' ? 1 : 0;
  const body = lines.slice(0, lines.length - last);
  if (body.length < 4) return null;
  const rows = body.map((s) => splitLine(s, delim));
  const widths = new Set(rows.map((r) => r.n));
  if (widths.size !== 1) return null;              // not rectangular -> give up
  const n = rows[0]!.n;
  if (n < 2) return null;
  const cols: string[] = [];
  for (let c = 0; c < n; c++) cols.push(rows.map((r) => r.cells[c]!).join('\n'));
  const out = cols.join('\n') + (last ? '\n' : '');
  return out;
}

for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const base = arms(text);
  let best = { label: '-', m: base };
  for (const [label, d] of [['comma', ','], ['tab', '\t'], ['ws', null], ['pipe', '|']] as Array<[string, string | null]>) {
    const t = transpose(text, d);
    if (t === null || t.length === 0) continue;
    const m = arms(t);
    if (m < best.m) best = { label, m };
    process.stderr.write(`  ${f.split('/').pop()} ${label}: ${m}\n`);
  }
  console.log(`${f}\t${base}\t${best.m}\t${best.label}\t${base - best.m}`);
}
