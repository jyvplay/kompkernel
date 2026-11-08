/** X82 SHAPE-PACK (corrected). Discover (separator, shape) groups; delete the separator.
 *  Decode is unambiguous iff PACKED LENGTH uniquely identifies the shape among the set
 *  used, and no bare run of that length already occurs in the source. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const SEPS = ['-', ':', '.', '/', '_', ','];
const MIN = 6;
const cls = (c: string) => (/\d/.test(c) ? 'D' : 'L');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chRe = (k: string) => (k === 'D' ? '\\d' : '[A-Za-z]');

interface Cand { sep: string; sig: string; n: number; raw: number; len: number; sample: string; pats: string[]; }

function discover(S: string): Cand[] {
  const out: Cand[] = [];
  for (const sep of SEPS) {
    const re = new RegExp(`[A-Za-z0-9]+(?:\\${sep}[A-Za-z0-9]+)+`, 'g');
    const byShape = new Map<string, string[]>();
    for (const t of (S.match(re) ?? [])) {
      if (!t.includes(sep)) continue;
      const g = t.split(sep);
      if (g.length < 2 || g.some(x => !/^[A-Za-z0-9]+$/.test(x) || x === '')) continue;
      const sig = g.map(x => x.split('').map(cls).join('')).join('|');   // e.g. D|DD|D
      if (!byShape.has(sig)) byShape.set(sig, []);
      byShape.get(sig)!.push(t);
    }
    for (const [sig, grp] of byShape) {
      if (grp.length < MIN) continue;
      const lens = new Set(grp.map(g => g.split(sep).join('').length));
      if (lens.size !== 1) continue;
      const len = [...lens][0];
      const before = countTokens(grp.join(' '), enc);
      const after = countTokens(grp.map(g => g.split(sep).join('')).join(' '), enc);
      const raw = after - before;
      if (raw >= -1) continue;
      out.push({ sep, sig, n: grp.length, raw, len, sample: grp[0], pats: sig.split('|') });
    }
  }
  return out.sort((a, b) => a.raw - b.raw);
}
const bodyRe = (c: Cand) => c.pats.map(p => `(?:${p.split('').map(chRe).join('')})`).join(esc(c.sep));
const capRe = (c: Cand) => c.pats.map(p => `(${p.split('').map(chRe).join('')})`).join('');

function pack(S: string, cs: Cand[]): string {
  let T = S;
  for (const c of cs) T = T.replace(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g'), m => m.split(c.sep).join(''));
  return T;
}
function unpack(T: string, cs: Cand[]): string {
  let S = T;
  for (let i = cs.length - 1; i >= 0; i--) {
    const c = cs[i];
    S = S.replace(new RegExp(`(?<![A-Za-z0-9])${capRe(c)}(?![A-Za-z0-9])`, 'g'),
      (...a: any[]) => a.slice(1, 1 + c.pats.length).join(c.sep));
  }
  return S;
}
/** G1: does a bare run of this exact shape already occur more often than the group? */
function preexists(S: string, c: Cand): boolean {
  const all = S.match(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c).replace(/\(\?:/g, '(')}(?![A-Za-z0-9])`, 'g')) ?? [];
  return all.length > c.n * 2;
}
const clause = (c: Cand) => `${c.len} chars split ${c.pats.map(p => p.length).join('-')} joined by '${c.sep}'`;

for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = p.split('/').pop()!;
  const all = discover(S);
  const taken = new Set<number>(); const pick: Cand[] = [];
  for (const c of all) { if (taken.has(c.len) || preexists(S, c)) continue; taken.add(c.len); pick.push(c); }
  console.log(`\n### ${n}  raw ${countTokens(S, enc)}  cand ${all.length}  picked ${pick.length}`);
  if (!pick.length) continue;
  let T = S, ok: Cand[] = [];
  for (let k = pick.length; k >= 1; k--) {
    const trial = pick.slice(0, k);
    const Tt = pack(S, trial);
    if (unpack(Tt, trial) === S) { T = Tt; ok = trial; break; }
  }
  const rt = unpack(T, ok) === S;
  const raw = countTokens(T, enc) - countTokens(S, enc);
  const C = `§X82 packed: ` + ok.map(clause).join('; ') + `.`;
  const ct = countTokens(C, enc);
  const base: any = tagstackFrontier(S, enc);
  const fT: any = tagstackFrontier(T, enc);
  const f: any = tagstackFrontier(C + '\n' + T, enc);
  console.log(`   shapes ${ok.map(c => `${c.sig.replace(/\|/g, c.sep)}x${c.n}(${c.len})`).join(' ')}`);
  console.log(`   rt=${rt} rawΔ ${raw} contract ${ct} | F(S)=${base.messageTokens} F(T)=${fT.messageTokens} => ${f.messageTokens} (${f.messageTokens - base.messageTokens >= 0 ? '+' : ''}${f.messageTokens - base.messageTokens})`);
  if (!rt) console.log('   !!! ROUND TRIP FAILED');
}
