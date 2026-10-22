// X19 probe: deterministic-punctuation elision (DPE) — date/time separator removal.
// Reader rule R: (1) a maximal run of exactly 8 digits that reads as a valid YYYYMMDD becomes
// YYYY-MM-DD; (2) 'T' immediately followed by a maximal run of 6 digits becomes T HH:MM:SS, and
// 'T' followed by 4 digits becomes T HH:MM.  Encoder only rewrites patterns it can invert.

const DATE_RE = /(\d{4})-(\d{2})-(\d{2})/g;
const T6_RE = /T(\d{2}):(\d{2}):(\d{2})/g;
const T4_RE = /T(\d{2}):(\d{2})(?!\d|:)/g;

function validDate(y: number, m: number, d: number) {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= dim;
}

/** Reader: apply R to a wire text. */
export function dpeDecode(s: string): string {
  let out = '';
  let i = 0;
  const n = s.length;
  const isDigit = (c: string) => c >= '0' && c <= '9';
  while (i < n) {
    const c = s[i];
    if (c === 'T') {
      let j = i + 1;
      while (j < n && isDigit(s[j])) j++;
      const run = s.slice(i + 1, j);
      if (run.length === 6) { out += 'T' + run.slice(0, 2) + ':' + run.slice(2, 4) + ':' + run.slice(4, 6); i = j; continue; }
      if (run.length === 4) { out += 'T' + run.slice(0, 2) + ':' + run.slice(2, 4); i = j; continue; }
      out += c; i++; continue;
    }
    if (isDigit(c)) {
      let j = i;
      while (j < n && isDigit(s[j])) j++;
      const run = s.slice(i, j);
      if (run.length === 8) {
        const y = +run.slice(0, 4), m = +run.slice(4, 6), d = +run.slice(6, 8);
        if (validDate(y, m, d)) { out += `${run.slice(0, 4)}-${run.slice(4, 6)}-${run.slice(6, 8)}`; i = j; continue; }
      }
      out += run; i = j; continue;
    }
    out += c; i++;
  }
  return out;
}

/** Encoder: strip separators from dates and T-times; verify by dpeDecode. */
export function dpeEncode(text: string): { out: string; dates: number; times: number } | null {
  let s = text;
  let dates = 0, times = 0;
  // Pass 1: T-times (do first so the following 8-digit scan is unaffected).
  s = s.replace(T6_RE, (m, a, b, c) => { times++; return `T${a}${b}${c}`; });
  s = s.replace(T4_RE, (m, a, b) => { times++; return `T${a}${b}`; });
  // Pass 2: dates. Only rewrite ones that stay invertible.
  s = s.replace(DATE_RE, (m, a, b, c) => {
    const y = +a, mo = +b, d = +c;
    if (!validDate(y, mo, d)) return m;
    dates++;
    return `${a}${b}${c}`;
  });
  if (dpeDecode(s) !== text) return null;
  return { out: s, dates, times };
}
