/**
 * X79 — WHITESPACE ELISION AROUND SEPARATORS. A whitespace run is its own chunk, so
 * "key: value" costs 3 tok and "key:value" costs 2. Unlike a dictionary this is a
 * TOKENIZATION change, which is the only axis measured to survive the frontier.
 * Each transform is a declared rule, so it is invertible.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const TX: Array<[string, (s: string) => { out: string; contract: string; n: number } | null]> = [
  ['colon-space', (S) => {
    // every ':' must be followed by exactly one space, and must not end a line
    if (!/:/.test(S)) return null;
    if (/: (?! )/.test(S) === false && false) return null;
    const total = (S.match(/:/g) ?? []).length;
    const good = (S.match(/: /g) ?? []).length;
    if (total !== good) return null;              // some ':' is not ": "
    if (/: *$/m.test(S)) return null;             // trailing colon
    if (/:  +/g.test(S)) return null;             // double space after colon
    if (total < 4) return null;
    return { out: S.replace(/: /g, ':'), contract: '§SPACE every ":" is followed by a space', n: total };
  }],
  ['eq-spaces', (S) => {
    if (!/=/.test(S)) return null;
    const total = (S.match(/=/g) ?? []).length;
    const good = (S.match(/ = /g) ?? []).length;
    if (total !== good) return null;
    if (total < 4) return null;
    return { out: S.replace(/ = /g, '='), contract: '§SPACE every "=" is surrounded by single spaces', n: total };
  }],
  ['arrow-spaces', (S) => {
    const total = (S.match(/->/g) ?? []).length;
    const good = (S.match(/ -> /g) ?? []).length;
    if (total < 4 || total !== good) return null;
    return { out: S.replace(/ -> /g, '->'), contract: '§SPACE every "->" is surrounded by single spaces', n: total };
  }],
  ['comma-space', (S) => {
    const total = (S.match(/,/g) ?? []).length;
    const good = (S.match(/, /g) ?? []).length;
    if (total < 4 || total !== good) return null;
    return { out: S.replace(/, /g, ','), contract: '§SPACE every "," is followed by a space', n: total };
  }],
  ['pipe-spaces', (S) => {
    const total = (S.match(/\|/g) ?? []).length;
    const good = (S.match(/ \| /g) ?? []).length;
    if (total < 4 || total !== good) return null;
    return { out: S.replace(/ \| /g, '|'), contract: '§SPACE every "|" is surrounded by single spaces', n: total };
  }],
];
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const raw = T(S, enc);
  const parts: string[] = [];
  for (const [name, f] of TX) {
    const r = f(S);
    if (!r) { parts.push(`${name} n/a`); continue; }
    const after = T(r.contract + '\n' + r.out, enc);
    const d = after - raw;
    parts.push(`${name} ${d >= 0 ? '+' : ''}${d}(${r.n})`);
    rows.push({ path: p, name, raw, after, d, n: r.n });
  }
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(5)} | ${parts.join(' ')}`);
}
fs.writeFileSync('bench/x79/receipts/sep.json', JSON.stringify(rows, null, 1) + '\n');
