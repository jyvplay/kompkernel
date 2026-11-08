/** frontier test on the high-distinctness lanes, 3 contract phrasings each */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const SEPS = ['-', ':', '.', '/', '_', ','];
const MIN = 6, DTHRESH = 0.5;
const cls = (c: string) => (/\d/.test(c) ? 'D' : 'L');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chRe = (k: string) => (k === 'D' ? '\\d' : '[A-Za-z]');
interface C { sep: string; sig: string; n: number; dist: number; raw: number; len: number; pats: string[]; }
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
      if (!by.has(sig)) by.set(sig, []); by.get(sig)!.push(t);
    }
    for (const [sig, grp] of by) {
      if (grp.length < MIN) continue;
      const lens = new Set(grp.map(g => g.split(sep).join('').length)); if (lens.size !== 1) continue;
      const len = [...lens][0];
      const before = countTokens(grp.join(' '), enc);
      const after = countTokens(grp.map(g => g.split(sep).join('')).join(' '), enc);
      const raw = after - before; if (raw >= -1) continue;
      const dist = new Set(grp).size / grp.length;
      if (dist < DTHRESH) continue;
      out.push({ sep, sig, n: grp.length, dist, raw, len, pats: sig.split('|') });
    }
  }
  return out.sort((a, b) => a.raw - b.raw);
}
const bodyRe = (c: C) => c.pats.map(p => `(?:${p.split('').map(chRe).join('')})`).join(esc(c.sep));
const capRe = (c: C) => c.pats.map(p => `(${p.split('').map(chRe).join('')})`).join('');
const pack = (S: string, cs: C[]) => { let T = S; for (const c of cs) T = T.replace(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g'), m => m.split(c.sep).join('')); return T; };
const unpack = (T: string, cs: C[]) => { let S = T; for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; S = S.replace(new RegExp(`(?<![A-Za-z0-9])${capRe(c)}(?![A-Za-z0-9])`, 'g'), (...a: any[]) => a.slice(1, 1 + c.pats.length).join(c.sep)); } return S; };
const pre = (S: string, c: C) => (S.match(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g')) ?? []).length > c.n * 2;

// three contract phrasings, terse -> explicit
const c1 = (cs: C[]) => `§X82 ${cs.map(c => `${c.len}d=${c.pats.map(p => p.split('').map(k => k === 'D' ? 'd' : 'a').join('').replace(/d+/, m => m)).join(c.sep)}`).join(' ')}.`;
const c2 = (cs: C[]) => `§X82 packed: ${cs.map(c => `${c.len} chars split ${c.pats.map(p => p.length).join('-')} joined '${c.sep}'`).join('; ')}.`;
const c3 = (cs: C[]) => `§X82 ${cs.map(c => `${c.len} digits = ${c.pats.map((p, i) => p.length).join(c.sep)}`).join('; ')}.`;

for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8'); const n = p.split('/').pop()!;
  const all = discover(S);
  const taken = new Set<number>(); const pick: C[] = [];
  for (const c of all) { if (taken.has(c.len) || pre(S, c)) continue; taken.add(c.len); pick.push(c); }
  if (!pick.length) { console.log(`\n### ${n}  no high-distinctness shape`); continue; }
  let T = S, ok: C[] = [];
  for (let k = pick.length; k >= 1; k--) { const tr = pick.slice(0, k); const Tt = pack(S, tr); if (unpack(Tt, tr) === S) { T = Tt; ok = tr; break; } }
  const rt = unpack(T, ok) === S;
  const raw = countTokens(T, enc) - countTokens(S, enc);
  const base: any = tagstackFrontier(S, enc);
  const fT: any = tagstackFrontier(T, enc);
  console.log(`\n### ${n}  raw ${countTokens(S, enc)}  rt=${rt} rawΔ ${raw}`);
  console.log(`    shapes ${ok.map(c => `${c.sig.replace(/\|/g, c.sep)}x${c.n}(len${c.len},d${c.dist.toFixed(2)})`).join(' ')}`);
  if (!rt) { console.log('    !!! RT FAILED'); continue; }
  for (const [nm, fn] of [['t1', c1], ['t2', c2], ['t3', c3]] as any) {
    const C = fn(ok); const ct = countTokens(C, enc);
    const f: any = tagstackFrontier(C + '\n' + T, enc);
    console.log(`    ${nm} contract ${String(ct).padStart(3)} | F(S)=${base.messageTokens} F(T)=${fT.messageTokens} => ${f.messageTokens} (${f.messageTokens - base.messageTokens >= 0 ? '+' : ''}${f.messageTokens - base.messageTokens})  «${C}»`);
  }
}
