/**
 * X79 — SHAPE-TRANSFORM SCREEN. KERMA won because it deletes bytes whose POSITION IS
 * DETERMINED BY STRUCTURE (APOGRAPHE's principle): no pointer is paid per occurrence.
 * What other shapes are position-determined? Screened here on RAW tokens first; only a
 * winner gets the expensive frontier test.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';

/** A. ordered-list markers "1. " "2. " ... sequential from `start` */
const ordered = (S: string) => {
  const re = /^(\s*)(\d+)([.)])\s+/gm;
  const nums: number[] = [];
  let m: RegExpExecArray | null; re.lastIndex = 0;
  while ((m = re.exec(S)) !== null) nums.push(Number(m[2]));
  if (nums.length < 4) return null;
  const start = nums[0];
  for (let i = 0; i < nums.length; i++) if (nums[i] !== start + i) return null; // must be strictly sequential
  let k = 0;
  const out = S.replace(re, (_x, sp, _n, _d) => { k++; return sp; });
  if (k !== nums.length) return null;
  return { out, contract: `§LIST lines numbered from ${start}`, n: k };
};
/** B. markdown/alternating table rule row: a line of only | - : spaces */
const ruleRow = (S: string) => {
  const lines = S.split('\n');
  const idx = lines.findIndex((l) => /^\s*\|?[\s|:-]+\|[\s|:-]*$/.test(l) && l.includes('-'));
  if (idx < 1 || idx >= lines.length - 1) return null;
  const cols = (lines[idx - 1].match(/\|/g) ?? []).length + 1;
  if (cols < 2) return null;
  const out = lines.slice(0, idx).concat(lines.slice(idx + 1)).join('\n');
  return { out, contract: `§RULE row ${idx + 1} is the |---| rule of ${cols} columns`, n: 1 };
};
/** C. uniform bullet markers at line start */
const bullets = (S: string) => {
  const lines = S.split('\n');
  let k = 0; const marks = new Set<string>();
  for (const l of lines) { const m = l.match(/^(\s*)([-*•])\s+/); if (m) { k++; marks.add(m[2]); } }
  if (k < 4 || marks.size !== 1) return null;
  const mk = [...marks][0];
  const out = lines.map((l) => l.replace(/^(\s*)([-*•])\s+/, (_x, sp) => sp)).join('\n');
  return { out, contract: `§BULLET every listed line starts with "${mk} "`, n: k };
};
/** D. blank-line runs collapsed to one */
const blanks = (S: string) => {
  const out = S.replace(/\n{3,}/g, '\n\n');
  if (out === S) return null;
  return { out, contract: '§BLANK blank runs collapse to one', n: (S.match(/\n{3,}/g) ?? []).length };
};
const TX: Array<[string, (s: string) => any]> = [['ordered', ordered], ['ruleRow', ruleRow], ['bullets', bullets], ['blanks', blanks]];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const raw = T(S, enc);
  const parts: string[] = [];
  for (const [name, f] of TX) {
    const r = f(S);
    if (!r) { parts.push(`${name} n/a`); continue; }
    const after = T(r.contract + '\n' + r.out, enc);
    parts.push(`${name} ${after - raw >= 0 ? '+' : ''}${after - raw} (${r.n})`);
  }
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(5)} | ${parts.join('  ')}`);
}
