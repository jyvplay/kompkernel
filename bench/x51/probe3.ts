// X51 probe phase 3: full functional-dependency scan (proper CSV rows, expanded corpus) + DAEDALUS-measured column deletion.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

// --- CSV row splitter preserving raw spans (single-line records only) ---
interface RawRow { fields: string[]; values: string[]; raw: string }
function splitCsvLine(line: string, delim: string): RawRow | null {
  const fields: string[] = []; const values: string[] = []; let i = 0; const n = line.length;
  while (true) {
    let j = i; let val = '';
    if (line[j] === '"') { j++; let closed = false;
      while (j < n) { if (line[j] === '"') { if (line[j+1] === '"') { val += '"'; j += 2; } else { j++; closed = true; break; } } else val += line[j++]; }
      if (!closed) return null;
    } else { while (j < n && line[j] !== delim) val += line[j++]; }
    fields.push(line.slice(i, j)); values.push(val);
    if (j >= n) break; if (line[j] !== delim) return null; i = j + 1;
    if (i > n) break; if (i === n) { fields.push(''); values.push(''); break; }
  }
  return { fields, values, raw: line };
}
interface Dec { neg: boolean; mag: bigint; scale: number }
function parseDec(s: string): Dec | null { const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s); if (!m) return null; const f = m[3] ?? ''; return { neg: m[1] === '-', mag: BigInt(m[2] + f), scale: f.length }; }
function renderRat(num: bigint, den: bigint, scale: number, mode: string): string {
  const neg = num < 0n; const a = neg ? -num : num; const sn = a * (10n ** BigInt(scale));
  let q = sn / den; const r = sn % den;
  if ((mode === 'half-up') && r * 2n >= den) q += 1n; else if (mode === 'ceil' && r > 0n && !neg) q += 1n;
  let d = q.toString(); if (scale > 0) { d = d.padStart(scale + 1, '0'); d = d.slice(0, -scale) + '.' + d.slice(-scale); }
  return (neg && q !== 0n ? '-' : '') + d;
}
const rat = (d: Dec): [bigint, bigint] => [d.neg ? -d.mag : d.mag, 10n ** BigInt(d.scale)];

interface Hit { file: string; delim: string; rows: number; targetIdx: number; target: string; rel: string; colTok: number; kind: string }
const hits: Hit[] = [];
const corpora: string[] = [];
for (const d of ['bench/holdout','bench/holdout-tab','bench/holdout-tbl','bench/holdout-x40','bench/z11/fresh','bench/z48/corpus','bench/z48/synthetic','bench/x20/lanes-heldout','bench/llm-blind-tab/hidden','bench/llm-blind-tab/hidden2','bench/train'])
  if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isFile() && /\.(csv|tsv|txt)$/.test(f)) corpora.push(p); }

for (const file of corpora) {
  const text = fs.readFileSync(file, 'utf8');
  const fname = file.split('/').pop()!;
  for (const delim of [',', '\t', ';']) {
    const lines = text.split(/\r?\n/).filter(l => l.length > 0);
    if (lines.length < 8) continue;
    const rows: RawRow[] = []; let ok = true;
    for (const l of lines) { const r = splitCsvLine(l, delim); if (!r) { ok = false; break; } rows.push(r); }
    if (!ok) continue;
    const C = rows[0]!.values.length; if (C < 2 || C > 24 || rows.some(r => r.values.length !== C)) continue;
    const header = rows[0]!.values; const data = rows.slice(1); if (data.length < 8) continue;
    const V = data.map(r => r.values);
    const dec = V.map(r => r.map(parseDec));
    const numeric = Array.from({ length: C }, (_, c) => dec.every(r => r[c] !== null));
    const colTok = Array.from({ length: C }, (_, c) => data.reduce((a, r) => a + T(r.fields[c]!) + 1, 0));
    const test = (c: number, rel: string, kind: string, f: (i: number) => string | null) => {
      for (let i = 0; i < V.length; i++) { const v = f(i); if (v === null || v !== V[i]![c]) return; }
      hits.push({ file: fname, delim: delim === '\t' ? 'TAB' : delim, rows: V.length, targetIdx: c, target: header[c] ?? `col${c}`, rel, colTok: colTok[c]!, kind });
    };
    const H = (i: number) => header[i] ?? `col${i}`;
    for (let c = 0; c < C; c++) {
      // duplicate column (baseline sanity; owned by APOGRAPHE colM / KOLUMN R)
      for (let a = 0; a < C; a++) if (a !== c) test(c, `= ${H(a)}`, 'dup', i => V[i]![a]!);
      // substring FDs: before/after first sep; upper/lower; concat A+sep+B; A+const; const+A
      for (let a = 0; a < C; a++) { if (a === c) continue;
        test(c, `upper(${H(a)})`, 'string', i => V[i]![a]!.toUpperCase());
        test(c, `lower(${H(a)})`, 'string', i => V[i]![a]!.toLowerCase());
        for (const sep of ['_', '-', '/', '.', ' ', '@', ':']) {
          test(c, `${H(a)} before first ${JSON.stringify(sep)}`, 'string', i => { const x = V[i]![a]!; const k = x.indexOf(sep); return k < 0 ? null : x.slice(0, k); });
          test(c, `${H(a)} after last ${JSON.stringify(sep)}`, 'string', i => { const x = V[i]![a]!; const k = x.lastIndexOf(sep); return k < 0 ? null : x.slice(k + 1); });
        }
        { const v0 = V[0]![a]!, t0 = V[0]![c]!;
          if (v0 && t0.startsWith(v0) && t0.length > v0.length) { const suf = t0.slice(v0.length); test(c, `${H(a)}+${JSON.stringify(suf)}`, 'string', i => V[i]![a]! + suf); }
          if (v0 && t0.endsWith(v0) && t0.length > v0.length) { const pre = t0.slice(0, t0.length - v0.length); test(c, `${JSON.stringify(pre)}+${H(a)}`, 'string', i => pre + V[i]![a]!); } }
        for (let b = 0; b < C; b++) { if (b === c || b === a) continue;
          const a0 = V[0]![a]!, b0 = V[0]![b]!, t0 = V[0]![c]!;
          if (a0 && b0 && t0.startsWith(a0) && t0.endsWith(b0) && t0.length >= a0.length + b0.length) { const sep = t0.slice(a0.length, t0.length - b0.length); if (sep.length <= 8) test(c, `${H(a)}+${JSON.stringify(sep)}+${H(b)}`, 'string', i => V[i]![a]! + sep + V[i]![b]!); }
        }
      }
      // lookup FD: A -> C consistent, distinct A in [2..40], C not constant, A not unique-per-row
      for (let a = 0; a < C; a++) { if (a === c) continue;
        const map = new Map<string, string>(); let consistent = true;
        for (let i = 0; i < V.length; i++) { const k = V[i]![a]!, v = V[i]![c]!; if (map.has(k) && map.get(k) !== v) { consistent = false; break; } map.set(k, v); }
        if (!consistent || map.size < 2 || map.size > 40) continue;
        const distinctC = new Set(map.values()).size; if (distinctC < 2) continue;
        if (map.size === V.length) continue;
        const mapTok = T([...map.entries()].map(([k, v]) => `${k}=${v}`).join(', '));
        hits.push({ file: fname, delim: delim === '\t' ? 'TAB' : delim, rows: V.length, targetIdx: c, target: header[c] ?? `col${c}`, rel: `lookup(${H(a)}) mapSize=${map.size} mapTok~${mapTok}`, colTok: colTok[c]!, kind: 'lookup' });
      }
      if (!numeric[c]) continue;
      for (let a = 0; a < C; a++) { if (a === c || !numeric[a]) continue;
        // shifted: C_i = A_i - A_{i-1}; C_i = A_{i-1} (string form checked numerically rendered at own scale bypass: use raw)
        test(c, `${H(a)}[i]-${H(a)}[i-1]`, 'shift', i => { if (i === 0) return V[0]![c]!; const [an, ad] = rat(dec[i]![a]!); const [bn, bd] = rat(dec[i-1]![a]!); return renderRat(an * bd - bn * ad, ad * bd, dec[i]![c]!.scale, 'half-up'); });
        // fitted K: C = A*K with K rational from first nonzero
        { let ki = -1; for (let i = 0; i < V.length; i++) if (dec[i]![a]!.mag !== 0n) { ki = i; break; }
          if (ki >= 0) { const [an, ad] = rat(dec[ki]![a]!); const [cn, cd] = rat(dec[ki]![c]!); let kn = cn * ad, kd = cd * an; if (kd < 0n) { kn = -kn; kd = -kd; }
            if (kd > 0n && !(kn === kd)) for (const mode of ['half-up', 'trunc']) test(c, `${H(a)}*K(${kn}/${kd})[${mode}]`, 'fittedK', i => { const [xn, xd] = rat(dec[i]![a]!); return renderRat(xn * kn, xd * kd, dec[i]![c]!.scale, mode); }); } }
        for (let b = 0; b < C; b++) { if (b === c || b === a || !numeric[b]) continue;
          test(c, `${H(a)}+${H(b)}`, 'arith', i => { const [an, ad] = rat(dec[i]![a]!); const [bn, bd] = rat(dec[i]![b]!); return renderRat(an * bd + bn * ad, ad * bd, dec[i]![c]!.scale, 'half-up'); });
          test(c, `${H(a)}-${H(b)}`, 'arith', i => { const [an, ad] = rat(dec[i]![a]!); const [bn, bd] = rat(dec[i]![b]!); return renderRat(an * bd - bn * ad, ad * bd, dec[i]![c]!.scale, 'half-up'); });
          test(c, `${H(a)}*${H(b)}`, 'arith', i => { const [an, ad] = rat(dec[i]![a]!); const [bn, bd] = rat(dec[i]![b]!); return renderRat(an * bn, ad * bd, dec[i]![c]!.scale, 'half-up'); });
          for (const mode of ['half-up', 'trunc', 'ceil']) for (const pct of [false, true])
            test(c, `${pct ? '100*' : ''}${H(a)}/${H(b)}[${mode}]`, 'arith', i => { const [an, ad] = rat(dec[i]![a]!); const [bn, bd] = rat(dec[i]![b]!); if (bn === 0n) return null; let nn = an * bd, dd = ad * bn; if (pct) nn *= 100n; if (dd < 0n) { nn = -nn; dd = -dd; } return renderRat(nn, dd, dec[i]![c]!.scale, mode); });
        }
      }
    }
  }
}
console.log('== FD HITS (kind!=dup shown; dup counted separately) ==');
let dup = 0;
for (const h of hits) { if (h.kind === 'dup') { dup++; continue; } console.log(JSON.stringify(h)); }
console.log(`dup hits=${dup} nonDup=${hits.length - dup}`);

// --- DAEDALUS-measured deletion for the strongest hits (arith/string/fittedK kinds, colTok>=150) ---
function dae(text: string): number { const r = daedalusEncode(text, ENC); if (!r.exact || r.decoded !== text) throw new Error('daedalus inexact'); return r.messageTokens; }
function ako(text: string): number { const r = akolouthia2Encode(text, ENC); if (!r.exact || r.decoded !== text) throw new Error('ako inexact'); return countTokens(r.decoderPrompt, ENC); }
function dropColumn(text: string, delim: string, idx: number): string {
  const parts = text.split(/(\r?\n)/); const out: string[] = [];
  for (const p of parts) { if (p === '\n' || p === '\r\n' || p === '') { out.push(p); continue; } const r = splitCsvLine(p, delim); if (!r) { out.push(p); continue; }
    const f = r.fields.filter((_, i) => i !== idx); out.push(f.join(delim)); }
  return out.join('');
}
const contractFor = (h: Hit) => `Restore the missing column ${h.target} (position ${h.targetIdx + 1} of each row) computed as ${h.rel}; other columns are in order.`;
const shortlist = hits.filter(h => ['arith', 'string', 'fittedK', 'shift'].includes(h.kind) && h.colTok >= 150)
  .sort((x, y) => y.colTok - x.colTok).slice(0, 10);
console.log('== MEASURED DELETION ==');
const byFile = new Map<string, Hit[]>();
for (const h of shortlist) { const key = h.file; if (!byFile.has(key)) byFile.set(key, []); byFile.get(key)!.push(h); }
for (const [f, hs] of byFile) {
  const full = corpora.find(p => p.endsWith('/' + f))!; const text = fs.readFileSync(full, 'utf8');
  const base = Math.min(dae(text), ako(text));
  for (const h of hs) {
    const delim = h.delim === 'TAB' ? '\t' : h.delim;
    const reduced = dropColumn(text, delim, h.targetIdx);
    const cand = Math.min(dae(reduced), ako(reduced)) + T(contractFor(h)) + 1;
    console.log(JSON.stringify({ file: f, target: h.target, rel: h.rel, kind: h.kind, baseMinParent: base, candPlusContract: cand, delta: cand - base }));
  }
}
console.log('DONE');
