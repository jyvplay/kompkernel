// Z32 diagnostic: candidate ORDER for the VERITAS-C greedy pass, measured on the lane groups and the fresh corpus.
//   tokfirst  = token-window candidates (VERITAS-U order), then character candidates   [shipped]
//   union     = one list ordered by the estimated saving hits*(tok-1)-(tok+1), desc
//   charfirst = character candidates (by estimate), then token-window candidates
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody, VXA_SENTINEL } from '@/lib/omega/veritas-a';
import { collectCandidates, orderCands, type Cand } from '@/lib/omega/veritas-u';
import { charCandidates, wireC } from '@/lib/omega/veritas-c';
const enc: EncodingName = 'o200k_base';
function run(text: string, order: 'tokfirst' | 'union' | 'charfirst'): number {
  const inTok = countTokens(text, enc);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, 240);
  const toks = tokenStrings(text, enc);
  const tm = new Map<string, Cand>();
  for (const W of [2, 3, 4] as const) collectCandidates(toks, W, tm);
  const tl = [...tm.values()]; orderCands(tl, 'old');
  const cl = charCandidates(text, enc);
  const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
  let list: Cand[];
  if (order === 'tokfirst') list = [...tl, ...cl];
  else if (order === 'charfirst') list = [...cl, ...tl];
  else list = [...tl, ...cl].sort((x, y) => score(y) - score(x));
  const seen = new Set<string>();
  list = list.filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)));
  let body = escBody(text); const entries: { key: string; phrase: string }[] = [];
  let cur = countTokens(body, enc);
  for (const cand of list) {
    if (entries.length >= pool.length) break;
    const key = pool[entries.length];
    const parts = body.split(escBody(cand.phrase));
    if (parts.length - 1 < 2) continue;
    const cb = parts.join(key);
    const ct = countTokens(wireC([...entries, { key, phrase: cand.phrase }], cb), enc);
    if (ct >= cur) continue;
    cur = ct; body = cb; entries.push({ key, phrase: cand.phrase });
  }
  const wire = entries.length ? wireC(entries, body) : text;
  void inTok; void VXA_SENTINEL;
  return entries.length ? countTokens(wire, enc) : inTok;
}
const groups: Record<string, string[]> = {};
for (const p of ['/home/user/z31/groups-list.tsv']) for (const l of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); (groups[g] ??= []).push(f.startsWith('/') ? f : '/home/user/kompkernel/' + f); }
const sets: Record<string, string[]> = { ...groups };
if (process.argv[2] === 'fresh') sets.fresh = fs.readFileSync('/home/user/z31/fresh-list.tsv', 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[1]);
for (const [g, files] of Object.entries(sets)) {
  const tot: Record<string, number> = { tokfirst: 0, union: 0, charfirst: 0 };
  for (const f of files) { const t = fs.readFileSync(f, 'utf8'); for (const o of ['tokfirst', 'union', 'charfirst'] as const) tot[o] += run(t, o); }
  console.log(g.padEnd(13), 'docs', String(files.length).padStart(3), 'tokfirst', tot.tokfirst, 'union', tot.union, `(${(tot.union - tot.tokfirst >= 0 ? '+' : '')}${tot.union - tot.tokfirst})`, 'charfirst', tot.charfirst, `(${(tot.charfirst - tot.tokfirst >= 0 ? '+' : '')}${tot.charfirst - tot.tokfirst})`);
}
