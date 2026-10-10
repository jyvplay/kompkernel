// Experiment: line-prefix elision (copy the previous line's first n separator-delimited spans).
// Encoding: a line whose leading part equals the previous line's prefix up to its n-th separator
// is written as '⇡' + n (n = 1..9) + remainder. A literal line starting with '⇡' is written '⇡⇡' + rest.
const SEP = new Set(['-', '/', ':', ',', ' ', '.', '\t', '|']);
function cutAfterNthSep(s: string, n: number): number {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (SEP.has(s[i])) { c++; if (c === n) return i + 1; }
  return -1;
}
export function elideEncode(text: string, minKeep = 4): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let prev = '';
  for (const cur of lines) {
    let best = -1, bestN = 0;
    for (let n = 1; n <= 9; n++) {
      const p = cutAfterNthSep(prev, n);
      if (p < 0 || p > cur.length) break;
      if (cur.startsWith(prev.slice(0, p)) && p >= minKeep) { best = p; bestN = n; }
    }
    if (bestN > 0 && cur.length > best) out.push('⇡' + bestN + cur.slice(best));
    else if (cur.startsWith('⇡')) out.push('⇡⇡' + cur.slice(1));
    else out.push(cur);
    prev = cur;
  }
  return out.join('\n');
}
export function elideDecode(wire: string): string {
  const lines = wire.split('\n');
  const out: string[] = [];
  let prev = '';
  for (const w of lines) {
    let cur: string;
    if (w.startsWith('⇡⇡')) cur = '⇡' + w.slice(2);
    else if (/^⇡[1-9]/.test(w)) {
      const n = Number(w[1]); const p = cutAfterNthSep(prev, n);
      cur = prev.slice(0, p) + w.slice(2);
    } else cur = w;
    out.push(cur); prev = cur;
  }
  return out.join('\n');
}
