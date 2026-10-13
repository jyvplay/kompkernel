// Z34: post-search local refinement of a VERITAS-S state (prune entries, reassign keys). Exactness checked.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { searchS, wireS, veritasSDecode, type VeritasSEntry } from '@/lib/omega/veritas-s';
const enc = 'o200k_base' as const;
type St = { entries: VeritasSEntry[]; body: string };
const cost = (s: St) => countTokens(wireS(s.entries, s.body), enc);
function removeEntry(s: St, i: number): St {
  const K = s.entries[i].key, P = s.entries[i].phrase;
  const entries = s.entries.filter((_, j) => j !== i).map((e, j) => (j >= i ? { key: e.key, phrase: e.phrase.split(K).join(P) } : e));
  return { entries, body: s.body.split(K).join(escBody(P)) };
}
function rekey(s: St, i: number, nk: string): St {
  const K = s.entries[i].key;
  const entries = s.entries.map((e, j) => (j === i ? { key: nk, phrase: e.phrase } : j > i ? { key: e.key, phrase: e.phrase.split(K).join(nk) } : e));
  return { entries, body: s.body.split(K).join(nk) };
}
export function refine(text: string, s0: St, log = false): { st: St; cur: number; prunes: number; rekeys: number } {
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, 240);
  let st = s0, cur = cost(st), prunes = 0, rekeys = 0, improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < st.entries.length; i++) {
      const c = removeEntry(st, i); const t = cost(c);
      if (t < cur) { st = c; cur = t; prunes++; improved = true; i--; }
    }
    for (let i = 0; i < st.entries.length && !improved; i++) {
      const used = new Set(st.entries.map((e) => e.key));
      for (const k of pool) {
        if (used.has(k)) continue;
        const c = rekey(st, i, k); const t = cost(c);
        if (t < cur) { st = c; cur = t; rekeys++; improved = true; break; }
      }
    }
  }
  return { st, cur, prunes, rekeys };
}
if (process.argv[2]) {
  for (const f of process.argv.slice(2)) {
    const text = fs.readFileSync(f, 'utf8');
    const t0 = Date.now();
    const s = searchS(text, enc);
    const base = countTokens(wireS(s.entries, s.body), enc);
    const r = refine(text, { entries: s.entries, body: s.body });
    const wire = wireS(r.st.entries, r.st.body);
    const exact = veritasSDecode(wire) === text;
    console.log(JSON.stringify({ file: f, base, refined: r.cur, gainPct: +((r.cur / base - 1) * 100).toFixed(2), entriesBase: s.entries.length, entriesFinal: r.st.entries.length, prunes: r.prunes, rekeys: r.rekeys, exact, ms: Date.now() - t0 }));
  }
}
