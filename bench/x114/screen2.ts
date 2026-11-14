/**
 * X114 mechanism screen 2. Three further reversible candidates, each with its
 * own decoder and byte-exactness check. Raw o200k screen only: no parent gate.
 * The shapes are chosen to delete something a substring dictionary cannot
 * represent (a recomputable same-row value, tree geometry, a column numeric
 * template), not plain repetition. A raw win is necessary, not sufficient.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const T = (s: string) => countTokens(s, enc);
const MARK = '◇';

function cellsOf(line: string): Array<{ s: string; at: number }> {
  return [...line.matchAll(/\S+/g)].map(m => ({ s: m[0], at: m.index ?? 0 }));
}
function replaceCell(line: string, at: number, old: string, neu: string): string {
  return line.slice(0, at) + neu + line.slice(at + old.length);
}
function parseQty(s: string): number | null {
  const m = /^(\d+(?:\.\d+)?)([KMGTP]?)(?:i?B)?$/i.exec(s);
  if (!m) return null;
  const scale: Record<string, number> = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15 };
  const v = Number(m[1]) * (scale[m[2]!.toUpperCase()] ?? 1);
  return Number.isFinite(v) ? v : null;
}

// ---- 1. Recomputable same-row percentage: percent = round(100*A/(A+B)). ----
const PCT_CONTRACT = `${MARK} in C{p} = ROUND(100*C{a}/(C{a}+C{b}))% on {n}-cell lines; C# is 1-based whitespace cell, K/M/G/T/P scale; literal % cells unchanged.`;
function pctEncode(text: string): { wire: string; ok: boolean; fired: boolean } {
  if (!text || text.includes(MARK)) return { wire: text, ok: false, fired: false };
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const cells = lines.map(cellsOf);
  const arityCounts = new Map<number, number>();
  for (const cs of cells) if (cs.length >= 4) arityCounts.set(cs.length, (arityCounts.get(cs.length) ?? 0) + 1);
  let best: any = null;
  for (const [n] of arityCounts) {
    const idx = cells.map((cs, i) => cs.length === n ? i : -1).filter(i => i >= 0);
    if (idx.length < 4) continue;
    for (let p = 0; p < n; p++) {
      if (!idx.every(i => /^\d+(?:\.\d+)?%$/.test(cells[i]![p]!.s))) continue;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        if (a === p || b === p || a === b) continue;
        for (const round of ['ceil', 'round', 'floor'] as const) {
          let match = 0;
          for (const i of idx) {
            const va = parseQty(cells[i]![a]!.s), vb = parseQty(cells[i]![b]!.s);
            const want = Number(cells[i]![p]!.s.slice(0, -1));
            if (va === null || vb === null) continue;
            const den = va + vb;
            const got = den === 0 ? 0 : Math[round](100 * va / den);
            if (got === want) match++;
          }
          if (match >= 4 && match / idx.length >= 0.8) {
            const score = match;
            if (!best || score > best.match) best = { n, p, a, b, round, match, idx };
          }
        }
      }
    }
  }
  if (!best) return { wire: text, ok: false, fired: false };
  const out = lines.map((line, i) => {
    const cs = cells[i]!;
    if (cs.length !== best.n) return line;
    const va = parseQty(cs[best.a]!.s), vb = parseQty(cs[best.b]!.s);
    const want = Number(cs[best.p]!.s.slice(0, -1));
    if (va === null || vb === null) return line;
    const den = va + vb;
    const got = den === 0 ? 0 : Math[best.round](100 * va / den);
    if (got !== want) return line;
    return replaceCell(line, cs[best.p]!.at, cs[best.p]!.s, MARK);
  });
  const contract = PCT_CONTRACT.split('{p}').join(String(best.p + 1)).split('{a}').join(String(best.a + 1)).split('{b}').join(String(best.b + 1))
    .split('{n}').join(String(best.n)).replace('ROUND', best.round);
  const wire = contract + '\n' + out.join('\n') + (final ? '\n' : '');
  const ok = pctDecode(wire) === text;
  return { wire: ok ? wire : text, ok, fired: ok };
}
function pctDecode(wire: string): string {
  const nl = wire.indexOf('\n');
  if (nl < 0) return wire;
  const contract = wire.slice(0, nl);
  const m = new RegExp(`^${MARK} in C(\\d+) = (ceil|round|floor)\\(100\\*C(\\d+)/\\(C(\\d+)\\+C(\\d+)\\)\\)% on (\\d+)-cell lines`).exec(contract);
  if (!m) return wire;
  const p = Number(m[1]) - 1;
  const round = m[2] as 'ceil' | 'round' | 'floor';
  const a = Number(m[3]) - 1, b = Number(m[5]) - 1, n = Number(m[6]);
  if (Number(m[4]) - 1 !== a) return wire;
  const body = wire.slice(nl + 1);
  const final = body.endsWith('\n');
  const lines = (final ? body.slice(0, -1) : body).split('\n');
  const out = lines.map(line => {
    const cs = cellsOf(line);
    if (cs.length !== n || cs[p]?.s !== MARK) return line;
    const va = parseQty(cs[a]!.s), vb = parseQty(cs[b]!.s);
    if (va === null || vb === null) return line;
    const den = va + vb;
    const got = den === 0 ? 0 : Math[round](100 * va / den);
    return replaceCell(line, cs[p]!.at, MARK, `${got}%`);
  });
  return out.join('\n') + (final ? '\n' : '');
}

// ---- 2. Tree geometry: depth sequence reconstructs findmnt-style prefixes. ----
const TREE_CONTRACT = 'Tree: one depth char per line (0=none,1-9,a=10..z=35). For d>0, each level l<d uses nearest previous line at l: "  " if its next depth<=l else "| "; then "`-" if next depth<=d else "|-".';
const TREE_RE = /^((?:\| | {2})*)(\|-|`-)(.*)$/;
function depthChar(d: number): string | null {
  if (d < 10) return String(d);
  if (d < 36) return String.fromCharCode(87 + d);
  return null;
}
function charDepth(c: string): number {
  return c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 87;
}
function treeEncode(text: string): { wire: string; ok: boolean; fired: boolean } {
  if (!text) return { wire: text, ok: false, fired: false };
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const depths: number[] = []; const stripped: string[] = []; let any = false;
  for (const line of lines) {
    const m = TREE_RE.exec(line);
    if (!m) { depths.push(0); stripped.push(line); continue; }
    const d = m[1]!.length / 2 + 1;
    const ch = depthChar(d);
    if (ch === null) return { wire: text, ok: false, fired: false };
    depths.push(d); stripped.push(m[3]!); any = true;
  }
  if (!any) return { wire: text, ok: false, fired: false };
  const wire = TREE_CONTRACT + '\n' + depths.map(d => depthChar(d)!).join('') + '\n' + stripped.join('\n') + (final ? '\n' : '');
  const ok = treeDecode(wire) === text;
  return { wire: ok ? wire : text, ok, fired: ok };
}
function treeDecode(wire: string): string {
  if (!wire.startsWith(TREE_CONTRACT + '\n')) return wire;
  const rest = wire.slice(TREE_CONTRACT.length + 1);
  const nl = rest.indexOf('\n');
  if (nl < 0) return wire;
  const ds = rest.slice(0, nl); const body = rest.slice(nl + 1);
  const final = body.endsWith('\n');
  const lines = (final ? body.slice(0, -1) : body).split('\n');
  const depths = [...ds].map(charDepth);
  if (depths.length !== lines.length) return wire;
  const last = depths.map((d, i) => {
    if (d === 0) return true;
    let j = i + 1;
    while (j < depths.length && depths[j]! > d) j++;
    return j === depths.length || depths[j]! < d;
  });
  const out = lines.map((line, i) => {
    const d = depths[i]!;
    if (d === 0) return line;
    let prefix = '';
    for (let l = 1; l < d; l++) {
      let j = i - 1;
      while (j >= 0 && depths[j] !== l) j--;
      if (j < 0) return wire;
      prefix += last[j] ? '  ' : '| ';
    }
    prefix += last[i] ? '`-' : '|-';
    return prefix + line;
  });
  return out.join('\n') + (final ? '\n' : '');
}

// ---- 3. Column numeric template: a uniform unit suffix is declared once. ----
const UNIT_CONTRACT = 'Units: append the suffix to bare numbers in 1-based whitespace cells MAP on N-cell lines; other cells verbatim.';
const NUMSUF = /^(\d+(?:\.\d+)?)([A-Za-z%]+)$/;
const BARENUM = /^\d+(?:\.\d+)?$/;
function unitEncode(text: string): { wire: string; ok: boolean; fired: boolean } {
  if (!text) return { wire: text, ok: false, fired: false };
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  const cells = lines.map(cellsOf);
  const arityCounts = new Map<number, number>();
  for (const cs of cells) if (cs.length >= 3) arityCounts.set(cs.length, (arityCounts.get(cs.length) ?? 0) + 1);
  let best: { n: number; map: Map<number, string>; saved: number } | null = null;
  for (const [n] of arityCounts) {
    const idx = cells.map((cs, i) => cs.length === n ? i : -1).filter(i => i >= 0);
    if (idx.length < 4) continue;
    const map = new Map<number, string>(); let saved = 0;
    for (let c = 0; c < n; c++) {
      const suf = new Map<string, number>(); let bare = 0, count = 0;
      for (const i of idx) {
        const s = cells[i]![c]!.s;
        const m = NUMSUF.exec(s);
        if (m) { suf.set(m[2]!, (suf.get(m[2]!) ?? 0) + 1); count++; }
        else if (BARENUM.test(s)) bare++;
      }
      if (bare > 0 || count < 4 || suf.size !== 1) continue;
      const [suffix, cnt] = [...suf.entries()][0]!;
      if (cnt !== count) continue;
      map.set(c, suffix); saved += cnt * suffix.length;
    }
    if (map.size && (!best || saved > best.saved)) best = { n, map, saved };
  }
  if (!best) return { wire: text, ok: false, fired: false };
  // Replace right-to-left so earlier cell offsets stay valid.
  const out2 = lines.map((line, i) => {
    const cs = cells[i]!;
    if (cs.length !== best!.n) return line;
    let r = line; const edits: Array<{ at: number; old: string; neu: string }> = [];
    for (const [c, suffix] of best!.map) {
      const cell = cs[c]!; const m = NUMSUF.exec(cell.s);
      if (m && m[2] === suffix) edits.push({ at: cell.at, old: cell.s, neu: m[1]! });
    }
    for (const e of edits.sort((a, b) => b.at - a.at)) r = replaceCell(r, e.at, e.old, e.neu);
    return r;
  });
  const mapStr = [...best.map.entries()].map(([c, s]) => `${c + 1}:${s}`).join(',');
  const contract = UNIT_CONTRACT.replace('MAP', mapStr).replace('N', String(best.n));
  const wire = contract + '\n' + out2.join('\n') + (final ? '\n' : '');
  const ok = unitDecode(wire) === text;
  return { wire: ok ? wire : text, ok, fired: ok };
}
function unitDecode(wire: string): string {
  const nl = wire.indexOf('\n');
  if (nl < 0) return wire;
  const contract = wire.slice(0, nl);
  const m = /^Units: append the suffix to bare numbers in 1-based whitespace cells (.+) on (\d+)-cell lines/.exec(contract);
  if (!m) return wire;
  const n = Number(m[2]);
  const map = new Map<number, string>();
  for (const part of m[1]!.split(',')) {
    const [c, s] = part.split(':');
    map.set(Number(c) - 1, s!);
  }
  const body = wire.slice(nl + 1);
  const final = body.endsWith('\n');
  const lines = (final ? body.slice(0, -1) : body).split('\n');
  const out = lines.map(line => {
    const cs = cellsOf(line);
    if (cs.length !== n) return line;
    const edits: Array<{ at: number; old: string; neu: string }> = [];
    for (const [c, suffix] of map) {
      const cell = cs[c];
      if (cell && BARENUM.test(cell.s)) edits.push({ at: cell.at, old: cell.s, neu: cell.s + suffix });
    }
    let r = line;
    for (const e of edits.sort((a, b) => b.at - a.at)) r = replaceCell(r, e.at, e.old, e.neu);
    return r;
  });
  return out.join('\n') + (final ? '\n' : '');
}

const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const pct = pctEncode(text), tree = treeEncode(text), unit = unitEncode(text);
  const row = { path: p, raw,
    pct: pct.ok ? T(pct.wire) : null, pctFired: pct.fired, pctExact: pct.ok,
    tree: tree.ok ? T(tree.wire) : null, treeFired: tree.fired, treeExact: tree.ok,
    unit: unit.ok ? T(unit.wire) : null, unitFired: unit.fired, unitExact: unit.ok };
  rows.push(row);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(5)}  pct ${String(row.pct ?? '-').padStart(5)}  tree ${String(row.tree ?? '-').padStart(5)}  unit ${String(row.unit ?? '-').padStart(5)}  fired ${pct.fired}/${tree.fired}/${unit.fired} exact ${pct.ok}/${tree.ok}/${unit.ok}`);
}
const sum = (k: string) => rows.reduce((a, r) => a + (r[k] ?? r.raw), 0);
const fired = (k: string) => rows.filter(r => r[k + 'Fired']).length;
const exactFired = (k: string) => rows.filter(r => r[k + 'Fired'] && r[k + 'Exact']).length;
console.log(`TOTAL raw ${sum('raw')} pct ${sum('pct')} tree ${sum('tree')} unit ${sum('unit')}`);
console.log(`FIRED/EXACT pct ${fired('pct')}/${exactFired('pct')} tree ${fired('tree')}/${exactFired('tree')} unit ${fired('unit')}/${exactFired('unit')}`);
fs.mkdirSync('bench/x114/receipts', { recursive: true });
fs.writeFileSync('bench/x114/receipts/screen2.json', JSON.stringify({
  schema: 'kompkernel-x114-screen2-v1', date: '2026-11-14', note: 'raw-token screen only; no parent gate; exact flags are meaningful only where fired',
  totals: { raw: sum('raw'), pct: sum('pct'), tree: sum('tree'), unit: sum('unit') },
  fired: { pct: fired('pct'), tree: fired('tree'), unit: fired('unit') },
  exactWhenFired: { pct: exactFired('pct'), tree: exactFired('tree'), unit: exactFired('unit') },
  rows,
}, null, 2) + '\n');
