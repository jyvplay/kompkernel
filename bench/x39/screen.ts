// X39 screen: is there a structural *isomorphism* of the source that the
// tokenizer prices lower?  Every transform here is invertible by a one-line
// instruction, so each is a candidate codec wrapper.  Pure token counting --
// no encoding, no search.  Runs in seconds.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

const tok = (s: string) => encode(s).length;

/** Columnar transpose of a delimited table.  Returns null if not rectangular. */
function transpose(text: string, delim: string): string | null {
  const lines = text.split('\n');
  // trailing newline -> trailing empty row
  const rows: string[][] = [];
  for (const l of lines) {
    if (l === '' && rows.length > 0 && lines[lines.length - 1] === l) continue;
    rows.push(l.split(delim));
  }
  if (rows.length < 3) return null;
  const k = rows[0].length;
  if (k < 2) return null;
  for (const r of rows) if (r.length !== k) return null;
  const cols: string[] = [];
  for (let c = 0; c < k; c++) {
    const vals: string[] = [];
    for (const r of rows) vals.push(r[c]);
    cols.push(vals.join(' '));
  }
  return cols.join('\n') + '\n';
}

function untranspose(t: string, delim: string): string {
  const lines = t.replace(/\n$/, '').split('\n');
  const cols = lines.map((l) => l.split(' '));
  const n = cols[0].length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(cols.map((c) => c[i]).join(delim));
  return out.join('\n') + '\n';
}

const r2 = (n: number) => String(n).padStart(6);

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const base = tok(text);
  const name = path.split('/').pop()!;

  const results: string[] = [];

  // --- T1: comma -> space (comma is a standalone token; space merges forward)
  if (text.includes(',')) {
    results.push(`cmsp=${r2(tok(text.split(',').join(' ')))}`);
  } else results.push(`cmsp=     -`);

  // --- T2: tab -> space
  if (text.includes('\t')) {
    results.push(`tabsp=${r2(tok(text.split('\t').join(' ')))}`);
  } else results.push(`tabsp=     -`);

  // --- T3: pipe -> space
  if (text.includes('|')) {
    results.push(`pipsp=${r2(tok(text.split('|').join(' ')))}`);
  } else results.push(`pipsp=     -`);

  // --- T4: columnar transpose, per candidate delimiter
  let bestT = '';
  for (const d of [',', '\t', '|']) {
    const t = transpose(text, d);
    if (t === null) continue;
    // must round-trip exactly
    if (untranspose(t, d) !== text) continue;
    const v = tok(t);
    if (bestT === '' || v < parseInt(bestT.split('=')[1], 10)) bestT = `tr${d === ',' ? 'cm' : d === '\t' ? 'tb' : 'pp'}=${r2(v)}`;
  }
  results.push(bestT === '' ? `trans=     -` : bestT);

  // --- T5: transpose AND comma->space (combined: delimiter becomes space)
  let bestTS = '';
  for (const d of [',', '\t', '|']) {
    const t = transpose(text, d);
    if (t === null) continue;
    if (untranspose(t, d) !== text) continue;
    const v = tok(t);
    if (bestTS === '' || v < parseInt(bestTS.split('=')[1], 10)) bestTS = `trsp=${r2(v)}`;
  }
  results.push(bestTS === '' ? `trsp=     -` : bestTS);

  console.log(`${name.padEnd(28)} raw=${r2(base)}  ${results.join('  ')}`);
}
