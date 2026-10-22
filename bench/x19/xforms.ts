// X19: candidate pre-DAEDALUS transforms, each byte-invertible with a one-sentence reader rule.

/* ---------- DPE: date / clock separator elision ---------- */
const isD = (c: string) => c >= '0' && c <= '9';
function validDate(y: number, m: number, d: number) {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= dim;
}
export function dpeDecode(s: string): string {
  let out = ''; let i = 0; const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === 'T') {
      let j = i + 1; while (j < n && isD(s[j])) j++;
      const r = s.slice(i + 1, j);
      if (r.length === 6) { out += 'T' + r.slice(0,2) + ':' + r.slice(2,4) + ':' + r.slice(4,6); i = j; continue; }
      if (r.length === 4) { out += 'T' + r.slice(0,2) + ':' + r.slice(2,4); i = j; continue; }
      out += c; i++; continue;
    }
    if (isD(c)) {
      let j = i; while (j < n && isD(s[j])) j++;
      const r = s.slice(i, j);
      if (r.length === 8 && validDate(+r.slice(0,4), +r.slice(4,6), +r.slice(6,8))) {
        out += `${r.slice(0,4)}-${r.slice(4,6)}-${r.slice(6,8)}`; i = j; continue;
      }
      out += r; i = j; continue;
    }
    out += c; i++;
  }
  return out;
}
export function dpeEncode(text: string) {
  let s = text.replace(/T(\d{2}):(\d{2}):(\d{2})/g, (_m, a, b, c) => `T${a}${b}${c}`)
              .replace(/T(\d{2}):(\d{2})(?!\d|:)/g, (_m, a, b) => `T${a}${b}`)
              .replace(/(\d{4})-(\d{2})-(\d{2})/g, (m, a, b, c) =>
                validDate(+a, +b, +c) ? `${a}${b}${c}` : m);
  if (dpeDecode(s) !== text) return null;
  return s;
}
export const DPE_RULE_LONG = ' In digit runs: 8 digits reading as a valid YYYYMMDD become YYYY-MM-DD; T plus 6 digits becomes T HH:MM:SS, T plus 4 digits T HH:MM.';
export const DPE_RULE_SHORT = ' 8-digit runs that are valid dates take dashes (YYYY-MM-DD); T then 6 digits is HH:MM:SS.';

/* ---------- THOUSANDS-SEPARATOR elision ---------- */
export function thouDecode(s: string): string {
  return s.replace(/(?<![0-9.])([0-9]{1,3}(?:§[0-9]{3})+)(?![0-9])/g, (m) => m);
}
export function thouEncode(text: string): string | null {
  const out = text.replace(/(?<![0-9,.])([0-9]{1,3}(?:,[0-9]{3})+)(?![0-9])/g, (m) => m.replace(/,/g, '§'));
  return out === text ? null : out;
}
export const THOU_RULE = ' § inside a number is a thousands comma.';

/* ---------- REFLOW: hard line-wrap elision ---------- */
function greedyWrap(words: string[], w: number): string[] {
  const lines: string[] = []; let cur = '';
  for (const wd of words) {
    if (!cur) { cur = wd; continue; }
    if (cur.length + 1 + wd.length <= w) cur += ' ' + wd;
    else { lines.push(cur); cur = wd; }
  }
  if (cur !== '' || lines.length === 0) lines.push(cur);
  return lines;
}
export function reflowEncode(text: string): { out: string; width: number } | null {
  const paras = text.split(/(\n[ \t]*\n)/);
  let width = 0, changed = 0;
  const outParas = paras.map((p) => {
    if (/^\n[ \t]*\n$/.test(p) || p === '') return p;
    const lines = p.split('\n');
    const body = lines.filter(l => l.trim() !== '');
    if (body.length < 3) return p;
    // candidate width: max line length
    const w = Math.max(...body.map(l => l.length));
    if (w < 30 || w > 200) return p;
    const joined = body.map(l => l.trim()).join(' ');
    const re = greedyWrap(joined.split(' ').filter(x => x !== ''), w);
    if (re.length !== body.length) return p;
    for (let i = 0; i < re.length; i++) if (re[i] !== body[i]) return p;
    changed++; width = w;
    return body.join(' ');
  });
  if (!changed) return null;
  const out = outParas.join('');
  if (out === text) return null;
  if (reflowDecode(out, width) !== text) return null;   // final byte-exactness guard
  return { out, width };
}
export function reflowDecode(s: string, width: number): string {
  return s.split('\n').map(l => (l.trim() === '' ? l : greedyWrap(l.split(' ').filter(x => x !== ''), width).join('\n'))).join('\n');
}
export function reflowRule(width: number) { return ` Each line is wrapped at ${width} columns: re-wrap it.`; }
