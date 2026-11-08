/** CHEAP SWEEP over all lanes: raw saving + DISTINCTNESS. No frontier calls.
 *  Hypothesis: the frontier absorbs savings on shapes whose values REPEAT (it can
 *  dictionary them). It only fails on shapes whose values are mostly DISTINCT. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const SEPS = ['-', ':', '.', '/', '_', ','];
const MIN = 6;
const cls = (c: string) => (/\d/.test(c) ? 'D' : 'L');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chRe = (k: string) => (k === 'D' ? '\\d' : '[A-Za-z]');
interface C { sep: string; sig: string; n: number; dist: number; raw: number; len: number; sample: string; pats: string[]; }
function discover(S: string): C[] {
  const out: C[] = [];
  for (const sep of SEPS) {
    const re = new RegExp(`[A-Za-z0-9]+(?:\\${sep}[A-Za-z0-9]+)+`, 'g');
    const by = new Map<string, string[]>();
    for (const t of (S.match(re) ?? [])) {
      if (!t.includes(sep)) continue;
      const g = t.split(sep);
      if (g.length < 2 || g.some(x => !/^[A-Za-z0-9]+$/.test(x) || x === '')) continue;
      const sig = g.map(x => x.split('').map(cls).join('')).join('|');
      if (!by.has(sig)) by.set(sig, []);
      by.get(sig)!.push(t);
    }
    for (const [sig, grp] of by) {
      if (grp.length < MIN) continue;
      const lens = new Set(grp.map(g => g.split(sep).join('').length));
      if (lens.size !== 1) continue;
      const len = [...lens][0];
      const before = countTokens(grp.join(' '), enc);
      const after = countTokens(grp.map(g => g.split(sep).join('')).join(' '), enc);
      const raw = after - before;
      if (raw >= -1) continue;
      out.push({ sep, sig, n: grp.length, dist: new Set(grp).size, raw, len, sample: grp[0], pats: sig.split('|') });
    }
  }
  return out.sort((a, b) => a.raw - b.raw);
}
const bodyRe = (c: C) => c.pats.map(p => `(?:${p.split('').map(chRe).join('')})`).join(esc(c.sep));
const capRe = (c: C) => c.pats.map(p => `(${p.split('').map(chRe).join('')})`).join('');
function pack(S: string, cs: C[]) { let T = S; for (const c of cs) T = T.replace(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g'), m => m.split(c.sep).join('')); return T; }
function unpack(T: string, cs: C[]) { let S = T; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; S = S.replace(new RegExp(`(?<![A-Za-z0-9])${capRe(c)}(?![A-Za-z0-9])`, 'g'), (...a: any[]) => a.slice(1, 1 + c.pats.length).join(c.sep)); } return S; }
function preexists(S: string, c: C) { const all = S.match(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g')) ?? []; return all.length > c.n * 2; }

const rows: string[] = [];
for (const p of process.argv.slice(2)) {
  let S: string; try { S = fs.readFileSync(p, 'utf8'); } catch { continue; }
  if (S.length > 60000) { rows.push(`${p.split('/').pop()!.padEnd(26)} SKIP (large ${S.length})`); continue; }
  const n = p.split('/').pop()!;
  const all = discover(S);
  const taken = new Set<number>(); const pick: C[] = [];
  for (const c of all) { if (taken.has(c.len) || preexists(S, c)) continue; taken.add(c.len); pick.push(c); }
  let T = S, ok: C[] = [];
  for (let k = pick.length; k >= 1; k--) { const tr = pick.slice(0, k); const Tt = pack(S, tr); if (unpack(Tt, tr) === S) { T = Tt; ok = tr; break; } }
  const raw = countTokens(T, enc) - countTokens(S, enc);
  const rawTok = countTokens(S, enc);
  const dist = ok.length ? (ok.reduce((s, c) => s + c.dist, 0) / ok.reduce((s, c) => s + c.n, 0)) : 0;
  if (raw <= -20) rows.push(`${n.padEnd(26)} raw ${String(rawTok).padStart(5)} rawΔ ${String(raw).padStart(5)} (${((-raw / rawTok) * 100).toFixed(1)}%) distinctness ${dist.toFixed(2)} shapes ${ok.map(c => `${c.sig.replace(/\|/g, c.sep)}x${c.n}`).join(' ')}`);
}
console.log(rows.join('\n'));
