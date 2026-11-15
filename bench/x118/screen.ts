/** X118 raw mechanism screen. Reuses the X117 screen discipline: every trial
 * carries its whole in-band key and an independent inverse; raw o200k price is
 * a NECESSARY screen, not a frontier claim. No parent encode is called here.
 * Run: bash bench/x15/run.sh bench/x118/screen.ts [lanes] [out-prefix]
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const out = process.argv[3] ?? 'bench/x118/receipts/screen';
type Trial = { wire: string; exact: boolean; hits: number; note?: string };
const no = (text: string, note: string): Trial => ({ wire: text, exact: false, hits: 0, note });
const check = (text: string, wire: string, decode: (s: string) => string, hits: number): Trial => ({ wire, hits, exact: decode(wire) === text });
const MARKS = ['¤', '†', '‡', '¦', '¬', '÷', '¡', '¿', '¥', '£', '€', '©', '®', '♦', '♥', '♪', '♫', '★', '☆', '☎', '✓', '✔', '✨', '°', '±', '·', 'µ'];
const pick = (text: string) => MARKS.find(m => !text.includes(m) && T(m) === 1);

// A. Negation contraction: auxiliary + not -> n't. Existing n't forms are
// escaped, so the map is a bijection on the admitted case patterns. This is
// lexical morphology, not a dictionary of repeated spans.
const NEG: Array<[string, string]> = [
  ['do not', "don't"], ['does not', "doesn't"], ['did not', "didn't"],
  ['is not', "isn't"], ['are not', "aren't"], ['was not', "wasn't"], ['were not', "weren't"],
  ['has not', "hasn't"], ['have not', "haven't"], ['had not', "hadn't"],
  ['will not', "won't"], ['would not', "wouldn't"], ['should not', "shouldn't"],
  ['could not', "couldn't"], ['must not', "mustn't"], ['need not', "needn't"], ['might not', "mightn't"],
];
const NEG_KEY = (m: string) => `${m} escapes; expand n't to not (won't=will not).`;
function negContraction2(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  let hits = 0; let escaped = 0;
  let body = text.replace(/\b(?:do|does|did|is|are|was|were|has|have|had|will|would|should|could|must|need|might)n't\b/gi, x => { escaped++; return m + x; });
  for (const [full, short] of NEG) {
    for (const f of [full, full[0]!.toUpperCase() + full.slice(1)]) {
      const s = f[0] === f[0]!.toUpperCase() ? short[0]!.toUpperCase() + short.slice(1) : short;
      const parts = body.split(f); if (parts.length > 1) { hits += parts.length - 1; body = parts.join(s); }
    }
  }
  if (!hits) return no(text, 'no full negation');
  const wire = NEG_KEY(m) + '\n' + body;
  return check(text, wire, w => {
    const nl = w.indexOf('\n'); const key = w.slice(0, nl); const km = /^(\S) escapes; expand n't to not \(won't=will not\)\.$/.exec(key); if (!km) throw Error('bad neg key'); const mm = km[1]!;
    let b = w.slice(nl + 1);
    const stash: string[] = [];
    b = b.replace(new RegExp('\\' + mm + "(\\w+n't)", 'g'), (_x, p) => { stash.push(p); return '\u0000' + (stash.length - 1) + '\u0001'; });
    b = b.replace(/\b(do|does|did|is|are|was|were|has|have|had|would|should|could|must|need|might)n't\b/gi, (x, a) => x[0] === x[0]!.toUpperCase() ? a[0].toUpperCase() + a.slice(1) + ' not' : a + ' not');
    b = b.replace(/\bwon't\b/gi, x => x[0] === x[0]!.toUpperCase() ? 'Will not' : 'will not');
    b = b.replace(/\u0000(\d+)\u0001/g, (_x, i) => stash[Number(i)]!);
    return b;
  }, hits + escaped);
}

// B. Vertical affix residual: a field may copy a prefix OR suffix of the same
// field in one of the K lines above, transmitting only the other end. KOINE
// copies prefixes of the immediately previous line only; ANAPHORA copies whole
// head/tail fields. This is character-level, bidirectional, and multi-donor.
const AFF_KEY = (m: string) => `${m}k,p/rest = first p chars of field k lines above + rest; ${m}k,s/head = head + last p chars of that field.`;
function verticalAffix(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  const lines = text.split('\n'); const fields = lines.map(l => l.split(/(\s+)/)); let hits = 0;
  const out = lines.map((line, i) => {
    const parts = line.split(/(\s+)/); let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const f = parts[p]!; if (!f) continue;
      let best: { k: number; dir: 'p' | 's'; n: number; rep: string } | null = null;
      for (let k = 1; k <= Math.min(8, i); k++) {
        const prev = fields[i - k]!; let q = 0; let jj = 0;
        for (let pp = 0; pp < prev.length; pp += 2) { if (prev[pp] === '') continue; if (jj === j) { q = pp; break; } jj++; }
        const r = prev[q]; if (!r) { j++; continue; }
        let pre = 0; while (pre < f.length && pre < r.length && f[pre] === r[pre]) pre++;
        let suf = 0; while (suf < f.length - pre && suf < r.length - pre && f[f.length - 1 - suf] === r[r.length - 1 - suf]) suf++;
        if (pre >= 6 && pre > (best?.n ?? 0)) best = { k, dir: 'p', n: pre, rep: `${m}${k},p${pre}/${f.slice(pre)}` };
        if (suf >= 6 && suf > (best?.n ?? 0)) best = { k, dir: 's', n: suf, rep: `${m}${k},s${suf}/${f.slice(0, f.length - suf)}` };
      }
      if (best && T(best.rep) < T(f)) { parts[p] = best.rep; hits++; }
      j++;
    }
    return parts.join('');
  });
  if (!hits) return no(text, 'no profitable affix');
  const wire = AFF_KEY(m) + '\n' + out.join('\n');
  return check(text, wire, w => {
    const nl = w.indexOf('\n'); const mm = w[0]!; const ls = w.slice(nl + 1).split('\n'); const dec: string[] = [];
    for (const line of ls) {
      const parts = line.split(/(\s+)/); let j = 0;
      for (let p = 0; p < parts.length; p += 2) {
        const f = parts[p]!; if (!f) continue;
        const h = new RegExp('^\\' + mm + '(\\d+),([ps])(\\d+)/(.*)$').exec(f);
        if (h) {
          const k = +h[1]!, dir = h[2], n = +h[3]!, rest = h[4]!; const ref = dec[dec.length - k]; if (ref === undefined) throw Error('bad affix ref');
          const rf = ref.split(/(\s+)/).filter((s, idx) => idx % 2 === 0 && s !== ''); const src = rf[j]; if (src === undefined) throw Error('bad affix field');
          parts[p] = dir === 'p' ? src.slice(0, n) + rest : rest + src.slice(src.length - n);
        }
        j++;
      }
      dec.push(parts.join(''));
    }
    return dec.join('\n');
  }, hits);
}

// C. Unified-diff hunk counts: the two counts in @@ -a,b +c,d @@ are the
// numbers of old/new lines in the hunk body. They are recomputed, not repeated.
const HUNK_KEY = (m: string) => `${m} @@ -a +b @@: append ,old,new counts by counting hunk lines (-/space=old, +/space=new).`;
function hunkCounts(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  const lines = text.split('\n'); const heads: number[] = []; let hits = 0;
  const out = lines.map((l, i) => { const h = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@(.*)$/.exec(l); if (!h) return l; heads.push(i); hits++; return `${m} @@ -${h[1]} +${h[3]} @@${h[5]}`; });
  if (hits < 2) return no(text, 'few hunks');
  const wire = HUNK_KEY(m) + '\n' + out.join('\n');
  return check(text, wire, w => {
    const nl = w.indexOf('\n'); const mm = w[0]!; const ls = w.slice(nl + 1).split('\n'); const idx: number[] = [];
    ls.forEach((l, i) => { if (l.startsWith(mm + ' @@')) idx.push(i); });
    for (let q = 0; q < idx.length; q++) {
      const i = idx[q]!; const end = q + 1 < idx.length ? idx[q + 1]! : ls.length;
      let old = 0, neu = 0;
      for (let k = i + 1; k < end; k++) { const c = ls[k]![0]; if (c === ' ' || c === '-') old++; if (c === ' ' || c === '+') neu++; if (c === '\\') continue; if (c !== ' ' && c !== '-' && c !== '+' && c !== '\\') break; }
      ls[i] = ls[i]!.replace(/^(\S) @@ -(\d+) \+(\d+) @@/, `$1 @@ -$2,${old} +$3,${neu} @@`).slice(2);
    }
    return ls.join('\n');
  }, hits);
}

// D. Sentence-case channel: lowercase ASCII, restore predictable sentence
// initials and standalone I, transmit only unpredictable capitals as compact
// line.word coordinates. X114 used JSON triples; this prices a terser channel.
const CASE_KEY = (m: string) => `${m} ASCII-lower; capitalize line/after .!? starts and I; flip case at listed line.word.char.`;
function caseDefault(body: string): string {
  const fin = body.endsWith('\n'); const ls = (fin ? body.slice(0, -1) : body).split('\n');
  const r = ls.map(line => line.split(' ').map((w, wi) => {
    const prev = wi > 0 ? line.split(' ')[wi - 1] ?? '' : '';
    if (w && (wi === 0 || /[.!?]$/.test(prev) || w === 'i')) return w[0]!.toUpperCase() + w.slice(1);
    return w;
  }).join(' ')).join('\n');
  return r + (fin ? '\n' : '');
}
function sentenceCase(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  if (/[^\x00-\x7F]/.test(text)) return no(text, 'non-ascii');
  const body = text.replace(/[A-Z]/g, c => c.toLowerCase());
  const def = caseDefault(body);
  if (def === text) return no(text, 'case already default');
  // coords where default differs from original (flip semantics)
  const fin = text.endsWith('\n'); const ol = (fin ? text.slice(0, -1) : text).split('\n'); const dl = (fin ? def.slice(0, -1) : def).split('\n');
  const ex: string[] = [];
  for (let li = 0; li < ol.length; li++) { const ow = ol[li]!.split(' '), dw = dl[li]!.split(' '); for (let wi = 0; wi < ow.length; wi++) { const a = ow[wi]!, b = dw[wi] ?? ''; for (let ci = 0; ci < Math.max(a.length, b.length); ci++) if (a[ci] !== b[ci]) ex.push(`${li + 1}.${wi + 1}.${ci + 1}`); } }
  const wire = CASE_KEY(m) + '\n' + ex.join(',') + '\n' + body;
  return check(text, wire, w => {
    const a = w.indexOf('\n'), b = w.indexOf('\n', a + 1); const coords = w.slice(a + 1, b).split(',').filter(Boolean).map(x => x.split('.').map(Number));
    const rest = w.slice(b + 1); let d = caseDefault(rest);
    const fin = d.endsWith('\n'); const ls = (fin ? d.slice(0, -1) : d).split('\n').map(l => l.split(' '));
    for (const [li, wi, ci] of coords) { const x = ls[li! - 1]?.[wi! - 1]; if (x === undefined || ci! - 1 >= x.length) throw Error('bad case coord'); const ch = x[ci! - 1]!; const fl = ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase(); ls[li! - 1]![wi! - 1] = x.slice(0, ci! - 1) + fl + x.slice(ci!); }
    return ls.map(l => l.join(' ')).join('\n') + (fin ? '\n' : '');
  }, ex.length);
}

// E. Markdown separator-row entailment: a table's delimiter row is a function
// of the header column count and alignment colons. Transmit it as a rule.
const MD_KEY = (m: string) => `${m} after a | header line, insert |---| row with one --- per header cell.`;
function mdSeparator(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  const lines = text.split('\n'); let hits = 0;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l) && i > 0 && lines[i - 1]!.includes('|') && !/^\s*\|?\s*:?-/.test(lines[i - 1]!)) {
      const cells = l.split('|').filter(c => c.trim() !== '');
      if (cells.every(c => /^\s*-{3,}\s*$/.test(c))) { hits++; out.push(m); continue; }
    }
    out.push(l);
  }
  if (!hits) return no(text, 'no plain separator');
  const wire = MD_KEY(m) + '\n' + out.join('\n');
  return check(text, wire, w => {
    const nl = w.indexOf('\n'); const mm = w[0]!; const ls = w.slice(nl + 1).split('\n'); const r: string[] = [];
    for (let i = 0; i < ls.length; i++) { if (ls[i] === mm) { const prev = r[r.length - 1] ?? ''; const n = prev.split('|').filter(c => c.trim() !== '').length; r.push('|' + Array(n).fill('---').join('|') + '|'); } else r.push(ls[i]!); }
    return r.join('\n');
  }, hits);
}

// F. SQL row-count footer: "(N rows)" is the number of data rows in the table.
const ROWS_KEY = (m: string) => `${m}=(N rows), N=data rows between +--- borders.`;
function rowCount(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  const h = /\((\d+) rows\)/.exec(text); if (!h) return no(text, 'no row footer');
  const lines = text.split('\n'); const borders = lines.map((l, i) => /^\+[-+]+\+$/.test(l) ? i : -1).filter(i => i >= 0);
  if (borders.length < 3) return no(text, 'no table borders');
  const data = lines.slice(borders[1]! + 1, borders[borders.length - 1]!).filter(l => l.startsWith('|'));
  if (data.length !== Number(h[1])) return no(text, 'count mismatch');
  const wire = ROWS_KEY(m) + '\n' + text.replace(h[0], m);
  return check(text, wire, w => {
    const nl = w.indexOf('\n'); const mm = w[0]!; const b = w.slice(nl + 1); const ls = b.split('\n'); const bs = ls.map((l, i) => /^\+[-+]+\+$/.test(l) ? i : -1).filter(i => i >= 0);
    const n = ls.slice(bs[1]! + 1, bs[bs.length - 1]!).filter(l => l.startsWith('|')).length;
    return b.replace(mm, `(${n} rows)`);
  }, 1);
}

// G. Unified-diff derived headers: the b/ path equals the a/ path, and the
// ---/+++ file headers repeat the path already stated by `diff --git`.
// No hunk-count entailment: the fixture's counts are NOT body-consistent
// (measured: hunk2 header 6/18 vs body 5/15), so counts are left literal.
const DIFF_KEY = (m: string) => `${m} diff: drop b/P after a/P; ---/+++ lines keep only the prefix, path = the diff --git path.`;
function diffPaths(text: string): Trial {
  const m = pick(text); if (!m) return no(text, 'no marker');
  if (!/^diff --git /m.test(text)) return no(text, 'no diff header');
  const lines = text.split('\n'); let hits = 0; let cur = '';
  const out = lines.map(l => {
    let h = /^diff --git a\/(.+) b\/(.+)$/.exec(l);
    if (h) { if (h[1] !== h[2]) return l; cur = h[1]!; hits++; return `diff --git a/${cur}`; }
    h = /^--- a\/(.+)$/.exec(l);
    if (h && cur && h[1] === cur) { hits++; return `${m}---`; }
    h = /^\+\+\+ b\/(.+)$/.exec(l);
    if (h && cur && h[1] === cur) { hits++; return `${m}+++`; }
    return l;
  });
  if (!hits) return no(text, 'no derived header');
  const wire = DIFF_KEY(m) + '\n' + out.join('\n');
  return check(text, wire, w => {
    const nl = w.indexOf('\n'); const mm = w[0]!; let cur = '';
    return w.slice(nl + 1).split('\n').map(l => {
      const h = /^diff --git a\/(.+)$/.exec(l);
      if (h) { cur = h[1]!; return `diff --git a/${cur} b/${cur}`; }
      if (l === mm + '---') return `--- a/${cur}`;
      if (l === mm + '+++') return `+++ b/${cur}`;
      return l;
    }).join('\n');
  }, hits);
}

const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8'); const raw = T(text);
  const safe = (fn: () => Trial): Trial => { try { return fn(); } catch (e) { return no(text, 'inverse threw: ' + (e instanceof Error ? e.message : String(e))); } };
  const trials: Record<string, Trial> = {
    negation: safe(() => negContraction2(text)),
    verticalAffix: safe(() => verticalAffix(text)),
    hunkCounts: safe(() => hunkCounts(text)),
    sentenceCase: safe(() => sentenceCase(text)),
    mdSeparator: safe(() => mdSeparator(text)),
    rowCount: safe(() => rowCount(text)),
    diffPaths: safe(() => diffPaths(text)),
  };
  const row: any = { path: p, raw };
  for (const [k, v] of Object.entries(trials)) { row[k] = v.exact ? T(v.wire) : null; row[k + 'Exact'] = v.exact; row[k + 'Hits'] = v.hits; row[k + 'Note'] = v.note ?? null; }
  rows.push(row);
  console.log(p.split('/').pop()!.padEnd(22) + ' raw ' + String(raw).padStart(5) + ' ' + Object.keys(trials).map(k => k + ' ' + String(row[k] ?? '-').padStart(5) + (row[k + 'Exact'] ? '' : '!')).join(' '));
}
const keys = ['negation', 'verticalAffix', 'hunkCounts', 'sentenceCase', 'mdSeparator', 'rowCount', 'diffPaths'];
const totals: any = { raw: rows.reduce((n, r) => n + r.raw, 0) };
for (const k of keys) totals[k] = rows.reduce((n, r) => n + (r[k] ?? r.raw), 0);
fs.mkdirSync('bench/x118/receipts', { recursive: true });
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x118-raw-screen-v1', note: 'raw complete-key prices only; no parent/frontier gate; exact=false is refusal, not corruption', totals, rows }, null, 2) + '\n');
console.log('TOTALS', JSON.stringify(totals));
