/** X77 / t2b — re-price segment interning WITH the per-segment marker `~` + 1-char id. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const RUN = /[A-Za-z0-9_./:+-]{8,}/g;
const IDCH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const id = (n: number) => IDCH[n];
const seg = (r: string): string[] | null => {
  const parts = r.split(/([._/:+-])/).filter((x) => x !== '');
  if (parts.length < 2) return null;
  const o: string[] = [];
  for (let i = 0; i < parts.length; i += 2) o.push((parts[i] ?? '') + (parts[i + 1] ?? ''));
  return o.length >= 2 && o.some((s) => /[._/:+-]/.test(s)) ? o : null;
};
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const runs = (S.match(RUN) ?? []).filter((r) => seg(r) !== null);
  if (runs.length < 4) continue;
  const perRun = runs.map((r) => seg(r)!);
  const freq = new Map<string, number>();
  const runFreq = new Map<string, number>();
  for (const ss of perRun) { for (const s of ss) freq.set(s, (freq.get(s) ?? 0) + 1); for (const s of new Set(ss)) runFreq.set(s, (runFreq.get(s) ?? 0) + 1); }
  const occ = perRun.reduce((a, s) => a + s.length, 0);
  const asIs = T(S, enc);
  for (const [tag, rank] of [['occxl', (s: string) => (freq.get(s) ?? 0) * s.length], ['runfreq', (s: string) => (runFreq.get(s) ?? 0) * s.length]] as any) {
    const dict = [...freq.keys()].filter((s) => (freq.get(s) ?? 0) >= 2).sort((a, b) => rank(b) - rank(a) || (a < b ? -1 : 1)).slice(0, 62);
    if (dict.length < 3) continue;
    const ix = new Map<string, string>(); dict.forEach((s, i) => ix.set(s, id(i)));
    const contract = '§MERISMOS ' + dict.map((s, i) => `${id(i)}=${s}`).join(' ');
    RUN.lastIndex = 0;
    const body = S.replace(RUN, (r) => { const ss = seg(r); if (!ss) return r; return ss.map((s) => (ix.has(s) ? '~' + ix.get(s) : s)).join(''); });
    const full = T(contract + '\n' + body, enc);
    const covered = perRun.reduce((a, ss) => a + ss.filter((s) => ix.has(s)).length, 0);
    rows.push({ path: p, tag, dict: dict.length, cov: +(covered / occ).toFixed(3), asIs, full, save: asIs - full });
  }
}
const g = new Map<string, any[]>(); for (const r of rows) { const k = r.tag; if (!g.has(k)) g.set(k, []); g.get(k)!.push(r); }
for (const [tag, rs] of g) {
  console.log(`\n--- ${tag} ---`);
  for (const r of rs) console.log(`${r.path.split('/').pop()!.padEnd(24)} dict ${String(r.dict).padStart(3)} cov ${String(r.cov).padStart(5)} | raw ${String(r.asIs).padStart(5)} -> ${String(r.full).padStart(5)} = ${r.save >= 0 ? '+' : ''}${r.save}`);
  console.log(`TOTAL ${tag}: ${rs.reduce((a, r) => a + r.save, 0)} over ${rs.reduce((a, r) => a + r.asIs, 0)}`);
}
