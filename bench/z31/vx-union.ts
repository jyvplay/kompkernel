// Z31: single-pass VX over the UNION of the W in {2,3,4} candidate phrases (no window tournament).
// Candidate generation mirrors veritas-a.ts veritasAEncode (anchors of W tokens, extension while >=2 non-overlapping hits).
// Ordering A (old):  anchorHits*(win-2) desc, then win desc.   Ordering B (net gain): anchorHits*(win-1) - (win+2) desc.
// Acceptance: identical to VX (greedy, exact whole-wire o200k count, decoder-checked).
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_LEGEND_V2, VXA_SENTINEL } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const K_RADIX = 200_100, MAX_MINE_TOKENS = 220_000, MAX_ANCHORS = 240, MAX_EXT = 32, MAX_POS = 8, POOL_SIZE = 240;
interface Cand { phrase: string; win: number; c: number }
function cands(text: string, toks: { id: number; s: string }[], W: number, out: Map<string, Cand>) {
  const T = Math.min(toks.length, MAX_MINE_TOKENS);
  const anchors = new Map<number, { c: number; pos: number[] }>();
  if (T >= W) for (let i = 0; i + W <= T; i++) {
    let key = 0, skip = false;
    for (let t = 0; t < W; t++) { const id = toks[i + t].id; if (id >= K_RADIX) { skip = true; break; } key = key * K_RADIX + id; }
    if (skip) continue;
    const cur = anchors.get(key);
    if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); } else anchors.set(key, { c: 1, pos: [i] });
  }
  const hot = [...anchors.values()].filter((a) => a.c >= 2).sort((x, y) => y.c - x.c).slice(0, MAX_ANCHORS);
  for (const a of hot) {
    const p0 = a.pos[0];
    let bestLen = W;
    for (let len = W + 1; len <= MAX_EXT && p0 + len <= T; len++) {
      let share = 1;
      for (let j = 1; j < a.pos.length; j++) {
        const pj = a.pos[j];
        if (pj + len > T || pj < p0 + len) continue;
        let eq = true;
        for (let t = W; t < len; t++) if (toks[p0 + t].id !== toks[pj + t].id) { eq = false; break; }
        if (eq) share++;
      }
      if (share >= 2) bestLen = len; else break;
    }
    for (const len of bestLen === W ? [W] : [bestLen, W]) {
      let phrase = '';
      for (let t = 0; t < len; t++) phrase += toks[p0 + t].s;
      if (phrase.length < 4) continue;
      const prev = out.get(phrase);
      if (!prev || prev.c < a.c) out.set(phrase, { phrase, win: len, c: a.c });
    }
  }
}
function run(text: string, order: string, Ws: number[]): { wire: string; outTokens: number; entries: number } {
  const toks = tokenStrings(text, enc);
  const union = new Map<string, Cand>();
  for (const W of Ws) cands(text, toks, W, union);
  const list = [...union.values()];
  if (order === 'old' || order === 'prune') list.sort((x, y) => y.c * (y.win - 2) - x.c * (x.win - 2) || y.win - x.win);
  else if (order === 'hits') list.sort((x, y) => y.c - x.c || y.win - x.win);
  else if (order === 'cw') list.sort((x, y) => y.c * y.win - x.c * x.win || y.win - x.win);
  else list.sort((x, y) => (y.c * (y.win - 1) - (y.win + 2)) - (x.c * (x.win - 1) - (x.win + 2)) || y.win - x.win);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_SIZE);
  const wireOf = (entries: { key: string; phrase: string }[], body: string) =>
    VXA_SENTINEL + VXA_LEGEND_V2 + '\n' + entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n') + '\n]]\n' + body;
  let body = escBody(text);
  const entries: { key: string; phrase: string }[] = [];
  let curTok = countTokens(body, enc);
  for (const cand of list) {
    if (entries.length >= pool.length) break;
    const key = pool[entries.length];
    const parts = body.split(escBody(cand.phrase));
    if (parts.length - 1 < 2) continue;
    const candBody = parts.join(key);
    const candTok = countTokens(wireOf([...entries, { key, phrase: cand.phrase }], candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok; body = candBody; entries.push({ key, phrase: cand.phrase });
  }
  if (order === 'prune') {
    // local search: try removing each accepted entry (expand its alias back to the escaped phrase); keep if the exact total drops.
    for (let k = entries.length - 1; k >= 0; k--) {
      const e = entries[k];
      const expanded = body.split(e.key).join(escBody(e.phrase));
      const rest = entries.filter((_, i) => i !== k);
      const tokNow = countTokens(wireOf(entries, body), enc);
      const tokRm = countTokens(wireOf(rest, expanded), enc);
      if (tokRm < tokNow) { entries.splice(k, 1); body = expanded; }
    }
  }
  if (entries.length === 0) return { wire: text, outTokens: countTokens(text, enc), entries: 0 };
  const wire = wireOf(entries, body);
  return { wire, outTokens: countTokens(wire, enc), entries: entries.length };
}
const [listFile, outFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const rec: Record<string, unknown> = { file: f, inT: countTokens(t, enc) };
  for (const [name, order, Ws] of [['uHits', 'hits', [2, 3, 4]], ['uCW', 'cw', [2, 3, 4]]] as const) {
    const t0 = performance.now();
    const r = run(t, order, [...Ws]);
    rec[name + '_T'] = Math.min(r.outTokens, rec.inT as number);
    rec[name + '_ms'] = Math.round(performance.now() - t0);
    rec[name + '_ok'] = (r.entries === 0 ? r.wire : veritasADecode(r.wire)) === t;
  }
  fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
}
console.log('done', files.length);
