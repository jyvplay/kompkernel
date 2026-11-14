/**
 * X114 mechanism screen. These are REAL reversible transforms priced on the
 * repository's real lanes with the live o200k tokenizer. They are NOT codec
 * claims: no parent/frontier gate is run here. The purpose is to find a seam
 * large enough to justify a full codec + parent A/B.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const T = (s: string) => countTokens(s, enc);

// ---- Layout channel: join admissible lines, transmit words-per-line. ----
const LAYOUT_CONTRACT = 'Layout: each char is a line word-count (a=1..z=26,A=27..Z=52,0=blank). Rebuild lines from the following words, join with LF, append final LF iff flag=1.';
function layoutEncode(text: string): { wire: string; ok: boolean } {
  if (!text.length || text.includes('\r') || text.includes('\t')) return { wire: text, ok: false };
  const final = text.endsWith('\n');
  const body = final ? text.slice(0, -1) : text;
  const lines = body.split('\n');
  const counts: number[] = [];
  const words: string[] = [];
  for (const line of lines) {
    if (line === '') { counts.push(0); continue; }
    if (line !== line.trim() || / {2,}/.test(line)) return { wire: text, ok: false };
    const ws = line.split(' ');
    if (ws.some(w => !w)) return { wire: text, ok: false };
    counts.push(ws.length); words.push(...ws);
  }
  if (counts.some(c => c > 52)) return { wire: text, ok: false };
  const layout = counts.map(c => c === 0 ? '0' : c <= 26 ? String.fromCharCode(96 + c) : String.fromCharCode(64 + c - 26)).join('');
  const wire = `${LAYOUT_CONTRACT}\n${final ? 1 : 0}|${layout}\n${words.join(' ')}`;
  return { wire, ok: layoutDecode(wire) === text };
}
function layoutDecode(wire: string): string {
  if (!wire.startsWith(LAYOUT_CONTRACT + '\n')) return wire;
  const rest = wire.slice(LAYOUT_CONTRACT.length + 1);
  const nl = rest.indexOf('\n');
  const [flag, layout] = rest.slice(0, nl).split('|');
  const words = rest.slice(nl + 1).split(' ').filter(Boolean);
  const lines: string[] = []; let at = 0;
  for (const ch of layout ?? '') {
    const c = ch === '0' ? 0 : ch >= 'a' && ch <= 'z' ? ch.charCodeAt(0) - 96 : ch.charCodeAt(0) - 64 + 26;
    lines.push(words.slice(at, at + c).join(' ')); at += c;
  }
  return lines.join('\n') + (flag === '1' ? '\n' : '');
}

// ---- Delta layout channel: first count absolute, then differences. ----
const DELTA_CONTRACT = 'Layout: first char is words on line 1 (a=1..z=26,A=27..Z=52); each later char is the change from the previous line (a=-13..m=-1,n=0,o=1..z=12,0=blank line). Rebuild lines from the following words, join with LF, append final LF iff flag=1.';
function deltaLayoutEncode(text: string): { wire: string; ok: boolean } {
  if (!text.length || text.includes('\r') || text.includes('\t')) return { wire: text, ok: false };
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const counts: number[] = []; const words: string[] = [];
  for (const line of lines) {
    if (line === '') { counts.push(0); continue; }
    if (line !== line.trim() || / {2,}/.test(line)) return { wire: text, ok: false };
    const ws = line.split(' '); if (ws.some(w => !w)) return { wire: text, ok: false };
    counts.push(ws.length); words.push(...ws);
  }
  if (!counts.length || counts[0]! > 52 || counts[0] === 0) return { wire: text, ok: false };
  const chars: string[] = [counts[0]! <= 26 ? String.fromCharCode(96 + counts[0]!) : String.fromCharCode(64 + counts[0]! - 26)];
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] === 0) { chars.push('0'); continue; }
    const d = counts[i]! - counts[i - 1]!;
    if (d < -13 || d > 12) return { wire: text, ok: false };
    chars.push(String.fromCharCode(110 + d)); // n=0, a=-13, z=12
  }
  const wire = `${DELTA_CONTRACT}\n${final ? 1 : 0}|${chars.join('')}\n${words.join(' ')}`;
  return { wire, ok: deltaLayoutDecode(wire) === text };
}
function deltaLayoutDecode(wire: string): string {
  if (!wire.startsWith(DELTA_CONTRACT + '\n')) return wire;
  const rest = wire.slice(DELTA_CONTRACT.length + 1);
  const nl = rest.indexOf('\n');
  const [flag, layout] = rest.slice(0, nl).split('|');
  const words = rest.slice(nl + 1).split(' ').filter(Boolean);
  const lines: string[] = []; let at = 0; let prev = 0;
  for (let i = 0; i < (layout ?? '').length; i++) {
    const ch = layout![i]!;
    let c: number;
    if (i === 0) c = ch >= 'a' && ch <= 'z' ? ch.charCodeAt(0) - 96 : ch.charCodeAt(0) - 64 + 26;
    else if (ch === '0') c = 0;
    else { c = prev + (ch.charCodeAt(0) - 110); }
    lines.push(words.slice(at, at + c).join(' ')); at += c; prev = c;
  }
  return lines.join('\n') + (flag === '1' ? '\n' : '');
}

// ---- Sentence-case canon: lowercase, restore predictable capitals, list exceptions. ----
const CASE_CONTRACT = 'Case: text is lowercased. Capitalize the first letter after each .!? and at each line start; then apply the listed [line,word] capitals. Words are space-separated; lines are LF-separated.';
function caseEncode(text: string): { wire: string; ok: boolean } {
  if (!/[A-Za-z]/.test(text)) return { wire: text, ok: false };
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const lower = lines.map(l => l.toLowerCase());
  const exceptions: Array<[number, number]> = [];
  const rebuilt = lower.map((line, li) => {
    const words = line.split(' ');
    return words.map((w, wi) => {
      const orig = lines[li]!.split(' ')[wi] ?? '';
      if (!orig || !w) return w;
      const first = orig[0]!;
      const predictable = (wi === 0 || /[.!?]$/.test(words[wi - 1] ?? '')) && first === first.toUpperCase() && first !== first.toLowerCase();
      if (first === first.toUpperCase() && first !== first.toLowerCase() && !predictable) {
        exceptions.push([li + 1, wi + 1]);
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    }).join(' ');
  });
  const wire = `${CASE_CONTRACT}\n${JSON.stringify(exceptions)}\n${rebuilt.join('\n')}${final ? '\n' : ''}`;
  return { wire, ok: caseDecode(wire) === text };
}
function caseDecode(wire: string): string {
  if (!wire.startsWith(CASE_CONTRACT + '\n')) return wire;
  const rest = wire.slice(CASE_CONTRACT.length + 1);
  const nl = rest.indexOf('\n');
  const exceptions = JSON.parse(rest.slice(0, nl)) as Array<[number, number]>;
  const body = rest.slice(nl + 1);
  const final = body.endsWith('\n');
  const lines = (final ? body.slice(0, -1) : body).split('\n');
  const ex = new Set(exceptions.map(([l, w]) => `${l}:${w}`));
  const out = lines.map((line, li) => line.split(' ').map((w, wi) => {
    if (!w) return w;
    const prev = wi > 0 ? line.split(' ')[wi - 1] ?? '' : '';
    const predictable = wi === 0 || /[.!?]$/.test(prev);
    if (predictable || ex.has(`${li + 1}:${wi + 1}`)) return w.charAt(0).toUpperCase() + w.slice(1);
    return w;
  }).join(' '));
  return out.join('\n') + (final ? '\n' : '');
}

const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const l = layoutEncode(text), dl = deltaLayoutEncode(text), c = caseEncode(text);
  const row = { path: p, raw, layout: l.ok ? T(l.wire) : null, deltaLayout: dl.ok ? T(dl.wire) : null,
    case: c.ok ? T(c.wire) : null, layoutExact: l.ok, deltaExact: dl.ok, caseExact: c.ok };
  rows.push(row);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  layout ${String(row.layout ?? '-').padStart(5)}  delta ${String(row.deltaLayout ?? '-').padStart(5)}  case ${String(row.case ?? '-').padStart(5)}  exact ${l.ok}/${dl.ok}/${c.ok}`);
}
const sum = (k: string) => rows.reduce((a, r) => a + (r[k] ?? r.raw), 0);
console.log(`TOTAL raw ${sum('raw')} layout ${sum('layout')} delta ${sum('deltaLayout')} case ${sum('case')}`);
fs.mkdirSync('bench/x114/receipts', { recursive: true });
fs.writeFileSync('bench/x114/receipts/screen.json', JSON.stringify({ note: 'raw-token screen only; no parent gate', rows }, null, 2));
