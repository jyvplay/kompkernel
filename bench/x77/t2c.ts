/**
 * X77 / t2c — the two variants that could still pay:
 *   A) per-RUN marker + greedy dictionary chosen to maximise fully-covered runs
 *   B) marker-free ids drawn from punctuation ABSENT from the source
 * Both priced in RAW tokens; anything that loses here cannot win through the frontier.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const RUN = /[A-Za-z0-9_./:+-]{8,}/g;
const IDCH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const seg = (r: string): string[] | null => {
  const parts = r.split(/([._/:+-])/).filter((x) => x !== '');
  if (parts.length < 2) return null;
  const o: string[] = [];
  for (let i = 0; i < parts.length; i += 2) o.push((parts[i] ?? '') + (parts[i + 1] ?? ''));
  return o.length >= 2 && o.some((s) => /[._/:+-]/.test(s)) ? o : null;
};
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const runsAll = S.match(RUN) ?? [];
  const keep: string[][] = [];
  for (const r of runsAll) { const ss = seg(r); if (ss) keep.push(ss); }
  if (keep.length < 4) continue;
  const occ = keep.reduce((a, s) => a + s.length, 0);
  const asIs = T(S, enc);
  const freq = new Map<string, number>();
  for (const ss of keep) for (const s of ss) freq.set(s, (freq.get(s) ?? 0) + 1);
  const cands = [...freq.keys()].sort((a, b) => (freq.get(b)! - freq.get(a)!) || (a < b ? -1 : 1)).slice(0, 240);

  // ---- A) greedy: maximise fully-covered runs, one marker per run ----
  const dictA: string[] = [];
  const inD = new Set<string>();
  for (let step = 0; step < 62; step++) {
    let bestS: string | null = null, bestGain = 0;
    for (const s of cands) {
      if (inD.has(s)) continue;
      let gain = 0;
      for (const ss of keep) {
        let miss = 0;
        for (const x of ss) if (!inD.has(x) && x !== s) { miss++; break; }
        if (miss === 0) gain += ss.length;
      }
      const cur = inD.size ? 0 : 0;
      if (gain - cur > bestGain) { bestGain = gain; bestS = s; }
    }
    if (!bestS) break;
    // does adding it actually improve the rendered token count? measured below
    dictA.push(bestS); inD.add(bestS);
  }
  const renderA = (list: string[]) => {
    const ix = new Map<string, string>(); list.forEach((s, i) => ix.set(s, IDCH[i] ?? '?'));
    const contract = '§MERISMOS ' + list.map((s, i) => `${IDCH[i] ?? '?'}=${s}`).join(' ');
    let cov = 0, nruns = 0;
    RUN.lastIndex = 0;
    const body = S.replace(RUN, (r) => {
      const ss = seg(r); if (!ss) return r;
      let o = '~';
      for (const x of ss) { const id = ix.get(x); if (!id) return r; o += id; }
      nruns++; cov += ss.length; return o;
    });
    return { tok: T(contract + '\n' + body, enc), cov, n: nruns, dict: list.length };
  };
  let bestA = renderA(dictA), curA = dictA.slice();
  for (let k = 0; k < 20 && curA.length > 3; k++) {
    const t = renderA(curA.slice(0, -1));
    if (t.tok >= bestA.tok) break;
    curA = curA.slice(0, -1); bestA = t;
  }

  // ---- B) marker-free punctuation ids absent from the source ----
  const POOL = '~^`@#$%&*!?{}[]|\\<>=+;,"\''.split('');
  const free = POOL.filter((c) => !S.includes(c));
  const dictB = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] * b[0].length - a[1] * a[0].length).slice(0, free.length).map(([s]) => s);
  let bestB: any = null;
  if (dictB.length >= 3) {
    const ix = new Map<string, string>(); dictB.forEach((s, i) => ix.set(s, free[i]));
    const contract = '§MERISMOS ' + dictB.map((s, i) => `${free[i]}=${s}`).join(' ');
    let cov = 0, nruns = 0;
    RUN.lastIndex = 0;
    const body = S.replace(RUN, (r) => {
      const ss = seg(r); if (!ss) return r;
      let o = ''; for (const x of ss) { const id = ix.get(x); if (!id) return r; o += id; }
      nruns++; cov += ss.length; return o;
    });
    bestB = { tok: T(contract + '\n' + body, enc), cov, n: nruns, dict: dictB.length };
  }
  const f = (x: any) => x ? `dict ${String(x.dict).padStart(3)} runs ${String(x.n).padStart(4)} cov ${(x.cov / occ).toFixed(3)} -> ${String(x.tok).padStart(5)} tok (${x.tok - asIs >= 0 ? '+' : ''}${x.tok - asIs})` : 'n/a';
  console.log(`${p.split('/').pop()!.padEnd(24)} asIs ${String(asIs).padStart(5)} | A ${f(bestA)} | B ${f(bestB)}`);
}
