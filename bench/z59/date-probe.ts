// X14: day-delta probe for calendar dates (YYYY-MM-DD) inside a DAEDALUS message.
// Measures one-chat M = contract + DAEDALUS decoder prompt, against plain DAEDALUS M.
// Exactness: expansion of the substituted text must equal the input, and the full DAEDALUS
// round trip must be exact. Identity-guarded in the codec; this probe reports the raw delta.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';

const MARK = '※d';
const CONTRACT = '※dN = the previous date plus N calendar days (N may be negative); write dates as YYYY-MM-DD.';
const DATE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
const TOKEN = /※d(-?\d+)|(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
const DAY = 86_400_000;
const MAX = Number(process.env.DATE_MAX ?? 999);

function toDays(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}
function fromDays(n: number): string {
  const dt = new Date(n * DAY);
  const p = (x: number, k: number) => String(x).padStart(k, '0');
  return `${p(dt.getUTCFullYear(), 4)}-${p(dt.getUTCMonth() + 1, 2)}-${p(dt.getUTCDate(), 2)}`;
}

export function dateSubstitute(text: string): { out: string; marks: number } {
  if (text.includes(MARK)) return { out: text, marks: 0 };
  let prev: number | null = null;
  let marks = 0;
  const out = text.replace(DATE, (whole, y, m, d) => {
    const cur = toDays(+y, +m, +d);
    let res = whole;
    if (prev !== null) {
      const n = cur - prev;
      if (Math.abs(n) <= MAX && fromDays(cur) === whole) { res = `${MARK}${n}`; marks++; }
    }
    prev = cur;
    return res;
  });
  return { out, marks };
}

export function dateExpand(wire: string): string {
  let prev: number | null = null;
  return wire.replace(TOKEN, (whole, n, y, m, d) => {
    if (n !== undefined) {
      if (prev === null) throw new Error('date: delta with no previous date');
      const cur = prev + Number(n);
      prev = cur;
      return fromDays(cur);
    }
    prev = toDays(+y, +m, +d);
    return whole;
  });
}

const files = process.argv.slice(2);
const rows: unknown[] = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const plain = daedalusEncode(text, 'o200k_base');
  const { out, marks } = dateSubstitute(text);
  const exp = dateExpand(out) === text;
  if (marks === 0) { rows.push({ file: f, marks, note: 'no marks' }); continue; }
  const d = daedalusEncode(out, 'o200k_base');
  const contract = countTokens(CONTRACT, 'o200k_base');
  const M = countTokens(CONTRACT + '\n' + d.decoderPrompt, 'o200k_base');
  rows.push({
    file: f, raw: text.length, marks, contractTokens: contract,
    identityM: plain.messageTokens, dateM: M, delta: M - plain.messageTokens,
    exactExpand: exp, exactDaedalus: d.exact,
  });
}
console.log(rows.map((r) => JSON.stringify(r)).join('\n'));
