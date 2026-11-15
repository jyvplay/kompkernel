/**
 * X115 raw mechanism screen. Candidates are reversible and priced with the live
 * o200k tokenizer. This is NOT a frontier claim: a raw win is only a necessary
 * condition. Each candidate has an independent decoder and byte-exact gate.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const T = (s: string) => countTokens(s, enc);

// ---- 1. Unix symbolic mode <-> octal isomorphism -------------------------
const MODE_RE = /^([dlcbps-])([r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-])(?= )/;
const OCTAL_RE = /^([dlcbps-])([0-7]{4})(?= )/;
const MODE_CONTRACT = 'Stat: a leading Tnnn field is file type T plus octal special,owner,group,other bits; expand each octal digit to rwx, then s/S or t/T for special bits; other bytes verbatim.';
function modeToOctal(type: string, sym: string): string | null {
  if (sym.length !== 9) return null;
  let special = 0;
  const triples: string[] = [];
  for (let i = 0; i < 3; i++) {
    const a = sym[i * 3]!, b = sym[i * 3 + 1]!, c = sym[i * 3 + 2]!;
    if (a !== 'r' && a !== '-') return null;
    if (b !== 'w' && b !== '-') return null;
    let v = (a === 'r' ? 4 : 0) + (b === 'w' ? 2 : 0);
    if (i === 0 && (c === 's' || c === 'S')) special |= 4;
    if (i === 1 && (c === 's' || c === 'S')) special |= 2;
    if (i === 2 && (c === 't' || c === 'T')) special |= 1;
    const exec = c === 'x' || c === 's' || c === 't';
    if (!exec && c !== '-' && c !== 'S' && c !== 'T') return null;
    v += exec ? 1 : 0;
    triples.push(String(v));
  }
  return type + special + triples.join('');
}
function octalToMode(field: string): string | null {
  const m = OCTAL_RE.exec(field + ' ');
  if (!m) return null;
  const type = m[1]!, digits = m[2]!;
  const special = Number(digits[0]);
  let out = type;
  for (let i = 0; i < 3; i++) {
    const v = Number(digits[i + 1]);
    out += v & 4 ? 'r' : '-';
    out += v & 2 ? 'w' : '-';
    const exec = (v & 1) !== 0;
    if (i === 0 && (special & 4)) out += exec ? 's' : 'S';
    else if (i === 1 && (special & 2)) out += exec ? 's' : 'S';
    else if (i === 2 && (special & 1)) out += exec ? 't' : 'T';
    else out += exec ? 'x' : '-';
  }
  return out;
}
function modeEncode(text: string): { wire: string; ok: boolean; fired: boolean; hits: number } {
  if (!text || text.split('\n').some(l => OCTAL_RE.test(l))) return { wire: text, ok: false, fired: false, hits: 0 };
  let hits = 0;
  const out = text.replace(new RegExp(MODE_RE.source, 'gm'), (all, type, sym) => {
    const oct = modeToOctal(type, sym);
    if (oct === null) return all;
    hits++; return oct;
  });
  if (!hits) return { wire: text, ok: false, fired: false, hits: 0 };
  const wire = MODE_CONTRACT + '\n' + out;
  const ok = modeDecode(wire) === text;
  return { wire: ok ? wire : text, ok, fired: ok, hits };
}
function modeDecode(wire: string): string {
  if (!wire.startsWith(MODE_CONTRACT + '\n')) return wire;
  const body = wire.slice(MODE_CONTRACT.length + 1);
  return body.replace(/^([dlcbps-][0-7]{4})(?= )/gm, (f) => octalToMode(f) ?? f);
}

// ---- 2. Comma-set bitmap over a declared ordered alphabet -----------------
const SET_CONTRACT = 'Sets: in the last whitespace field of N-field lines, comma items are a subset of A; replace the field by hex mask H (bit i = A[i], LSB first), printing selected A items in order; other bytes verbatim.';
function setEncode(text: string): { wire: string; ok: boolean; fired: boolean; hits: number } {
  if (!text) return { wire: text, ok: false, fired: false, hits: 0 };
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const cells = lines.map(l => [...l.matchAll(/\S+/g)].map(m => ({ s: m[0], at: m.index ?? 0 })));
  const counts = new Map<number, number>();
  for (const cs of cells) if (cs.length >= 3) counts.set(cs.length, (counts.get(cs.length) ?? 0) + 1);
  let best: any = null;
  for (const [n] of counts) {
    const idx = cells.map((cs, i) => cs.length === n ? i : -1).filter(i => i >= 0);
    if (idx.length < 4) continue;
    const alphabet: string[] = []; const seen = new Set<string>();
    let eligible = 0;
    for (const i of idx) {
      const last = cells[i]![n - 1]!.s;
      if (!last.includes(',')) continue;
      const items = last.split(',');
      if (items.some(x => !x) || new Set(items).size !== items.length) continue;
      // Require row order to be the global first-appearance order.
      const pos = items.map(x => { if (!seen.has(x)) { seen.add(x); alphabet.push(x); } return alphabet.indexOf(x); });
      if (pos.some((p, k) => k > 0 && p <= pos[k - 1]!)) continue;
      eligible++;
    }
    if (eligible >= 4 && alphabet.length >= 3 && alphabet.length <= 64) {
      const saved = eligible * 2; // rough; exact tokenizer below
      if (!best || saved > best.saved) best = { n, idx, alphabet, eligible, saved };
    }
  }
  if (!best) return { wire: text, ok: false, fired: false, hits: 0 };
  const alphaIndex = new Map(best.alphabet.map((x: string, i: number) => [x, i]));
  let hits = 0;
  const out = lines.map((line, i) => {
    const cs = cells[i]!;
    if (cs.length !== best.n) return line;
    const last = cs[best.n - 1]!;
    if (!last.s.includes(',')) return line;
    const items = last.s.split(',');
    if (items.some(x => !alphaIndex.has(x)) || new Set(items).size !== items.length) return line;
    const pos = items.map(x => alphaIndex.get(x)!);
    if (pos.some((p, k) => k > 0 && p <= pos[k - 1]!)) return line;
    let mask = 0n;
    for (const p of pos) mask |= 1n << BigInt(p);
    hits++;
    return line.slice(0, last.at) + '0x' + mask.toString(16) + line.slice(last.at + last.s.length);
  });
  if (!hits) return { wire: text, ok: false, fired: false, hits: 0 };
  const contract = SET_CONTRACT.replace('N', String(best.n)).replace('A', JSON.stringify(best.alphabet));
  const wire = contract + '\n' + out.join('\n') + (final ? '\n' : '');
  const ok = setDecode(wire) === text;
  return { wire: ok ? wire : text, ok, fired: ok, hits };
}
function setDecode(wire: string): string {
  const nl = wire.indexOf('\n'); if (nl < 0) return wire;
  const contract = wire.slice(0, nl);
  const m = /^Sets: in the last whitespace field of (\d+)-field lines, comma items are a subset of (\[.*\]); replace/.exec(contract);
  if (!m) return wire;
  const n = Number(m[1]); const alphabet = JSON.parse(m[2]!) as string[];
  const body = wire.slice(nl + 1); const final = body.endsWith('\n');
  const lines = (final ? body.slice(0, -1) : body).split('\n');
  const out = lines.map(line => {
    const cs = [...line.matchAll(/\S+/g)].map(x => ({ s: x[0], at: x.index ?? 0 }));
    if (cs.length !== n) return line;
    const last = cs[n - 1]!;
    if (!/^0x[0-9a-f]+$/.test(last.s)) return line;
    const mask = BigInt(last.s);
    const items: string[] = [];
    for (let i = 0; i < alphabet.length; i++) if (mask & (1n << BigInt(i))) items.push(alphabet[i]!);
    return line.slice(0, last.at) + items.join(',') + line.slice(last.at + last.s.length);
  });
  return out.join('\n') + (final ? '\n' : '');
}

const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8'); const raw = T(text);
  const mode = modeEncode(text), set = setEncode(text);
  const row = { path: p, raw, mode: mode.ok ? T(mode.wire) : null, modeHits: mode.hits, modeExact: mode.ok,
    set: set.ok ? T(set.wire) : null, setHits: set.hits, setExact: set.ok };
  rows.push(row);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)} mode ${String(row.mode ?? '-').padStart(5)} (${mode.hits}) set ${String(row.set ?? '-').padStart(5)} (${set.hits}) exact ${mode.ok}/${set.ok}`);
}
const sum = (k: string) => rows.reduce((a, r) => a + (r[k] ?? r.raw), 0);
console.log(`TOTAL raw ${sum('raw')} mode ${sum('mode')} set ${sum('set')}`);
fs.mkdirSync('bench/x115/receipts', { recursive: true });
fs.writeFileSync('bench/x115/receipts/screen.json', JSON.stringify({ schema: 'kompkernel-x115-screen-v1', date: '2026-11-14', note: 'raw screen only; no parent gate', totals: { raw: sum('raw'), mode: sum('mode'), set: sum('set') }, rows }, null, 2) + '\n');
