// X149 POLYSTELI feasibility prototype v2: two regex row-classes for ls -l.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const src = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8');
const lines = src.split('\n');

interface Grid { nameStart: number; rows: [string[], string][]; }
function fitClass(rows: string[]): Grid | null {
  const parsed: [string, number, number][][] = [];
  for (const l of rows) {
    const f: [string, number, number][] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(l))) f.push([m[0], m.index, m.index + m[0].length]);
    parsed.push(f);
  }
  // grid model: each of the first k fields ENDS at a uniform column edge
  // (right-edge tiling); the tail is the verbatim remainder after the last edge.
  const n = Math.min(...parsed.map((f) => f.length));
  if (n < 5) return null;
  let k = 0;
  const ends: number[] = [];
  for (let c = 0; c < n; c++) {
    const endSet = new Set(parsed.map((f) => f[c]![2]));
    if (endSet.size !== 1) break;
    ends.push(parsed[0]![c]![2]); k++;
  }
  if (k < 4) return null;
  const rowsF: [string[], string][] = parsed.map((f, i) => [
    f.slice(0, k).map((x) => x[0]),
    rows[i]!.slice(ends[k - 1]!),
  ]);
  return { nameStart: ends[k - 1]!, rows: rowsF };
}

const classes = new Map<string, string[]>();
for (const l of lines) {
  let key = 'other';
  if (/^[-dlbcps][-\w]{9}\s+\d+\s+\S+\s+\S+\s+\d+\s+\w{3}\s+\d+\s+([\d:]+|\d{4})\s+/.test(l)) key = 'F';
  else if (/^[-dlbcps][-\w]{9}\s+\d+\s+\S+\s+\S+\s+\d+\s+->\s+/.test(l)) key = 'L';
  if (!classes.has(key)) classes.set(key, []);
  classes.get(key)!.push(l);
}
const marker = '॥';
let coded = '', contract = 0, grids = 0, rowsN = 0;
const parts: string[] = [];
for (const [key, rows] of classes) {
  if (key === 'other' || rows.length < 4) { parts.push(rows.join('\n')); continue; }
  const g = fitClass(rows);
  if (!g) { parts.push(rows.join('\n')); continue; }
  // per-column widths from the uniform ends of the fitted grid
  const re = /\S+/g;
  const widths: number[] = [];
  {
    const f0 = g.rows[0]![0];
    let prev = 0;
    const first = rows[0]!;
    const pos: [string, number, number][] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(first))) pos.push([m[0], m.index, m.index + m[0].length]);
    for (let c = 0; c < f0.length - 1; c++) { widths.push(pos[c]![2] - prev); prev = pos[c]![2]; }
  }
  const mk = `${marker}${widths.join(',')}:${rows.length} rows single-spaced, pad field k to width k.\n`;
  contract += countTokens(mk, 'o200k_base');
  grids++; rowsN += rows.length;
  parts.push(mk + g.rows.map(([f, tail]) => f.join(' ') + (tail ? tail.replace(/^\s+/, ' ') : '')).join('\n'));
}
coded = parts.join('\n');
const source = countTokens(src, 'o200k_base');
const gross = countTokens(coded, 'o200k_base');
console.log(JSON.stringify({ source, grossCoded: gross, contract, grids, rowsN, delta: gross - source }));
console.log(coded.slice(0, 600));
