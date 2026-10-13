// Z36 probe: line-prefix delta (LPD). Each line whose longest common prefix with the previous line is >= KMIN
// is rewritten as MARK[k] + rest, where k = min(LCP, KMAX). Then VXR encodes the rewritten text.
// Measures tokens of VXR(LPD(text)) and checks exact inverse. Not a codec yet: legend cost is not included.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasREncode } from '@/lib/omega/veritas-r';
const KMIN = 6, KMAX = 40;
function pool(text: string): string[] {
  const out: string[] = [];
  for (let c = 0xe000; out.length < KMAX + 2 && c < 0xf8ff; c++) { const ch = String.fromCharCode(c); if (!text.includes(ch)) out.push(ch); }
  return out;
}
function lpdForward(text: string): string {
  const P = pool(text); const ESC = P[0]; const MARK = P.slice(1); // MARK[k-KMIN]
  const lines = text.split('\n'); const out: string[] = [];
  let prev = '';
  for (const cur of lines) {
    let k = 0; const lim = Math.min(prev.length, cur.length);
    while (k < lim && prev[k] === cur[k]) k++;
    if (k >= KMIN) { const kk = Math.min(k, KMAX); out.push(MARK[kk - KMIN] + cur.slice(kk)); }
    else if (cur.length && (cur[0] === ESC || MARK.includes(cur[0]))) out.push(ESC + cur);
    else out.push(cur);
    prev = cur;
  }
  return out.join('\n');
}
function lpdInverse(enc: string, text: string): string {
  const P = pool(text); const ESC = P[0]; const MARK = P.slice(1);
  const lines = enc.split('\n'); const out: string[] = []; let prev = '';
  for (const l of lines) {
    let cur: string;
    if (l.length && l[0] === ESC) cur = l.slice(1);
    else if (l.length && MARK.includes(l[0])) { const kk = MARK.indexOf(l[0]) + KMIN; cur = prev.slice(0, kk) + l.slice(1); }
    else cur = l;
    out.push(cur); prev = cur;
  }
  return out.join('\n');
}
const files = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const base = veritasREncode(text).outTokens;
  const enc = lpdForward(text);
  const inv = lpdInverse(enc, text) === text;
  const wire = veritasREncode(enc);
  const rawEnc = countTokens(enc, 'o200k_base');
  console.log(JSON.stringify({ f: f.split('/').slice(-1)[0], base: base, lpd: wire.outTokens, lpdRaw: rawEnc, exactInv: inv, exactVXR: wire.exact, delta: wire.outTokens - base }));
}
