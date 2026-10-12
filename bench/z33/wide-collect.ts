// Z33 diagnostic: VERITAS-U token-window candidate collector with the anchor cap, position cap, extension cap and
// token-mining cap as parameters (copy of collectCandidates; no other change).
import type { Cand } from '@/lib/omega/veritas-u';
export function collectCandidatesWide(toks: { id: number; s: string }[], W: number, out: Map<string, Cand>, MAX_ANCHORS: number, MAX_POS: number, MAX_EXT: number, MAX_MINE_TOKENS: number, K_RADIX: number): void {
  const T = Math.min(toks.length, MAX_MINE_TOKENS);
  const anchors = new Map<number, { c: number; pos: number[] }>();
  if (T >= W) {
    for (let i = 0; i + W <= T; i++) {
      let key = 0;
      let skip = false;
      for (let t = 0; t < W; t++) {
        const id = toks[i + t].id;
        if (id >= K_RADIX) { skip = true; break; }
        key = key * K_RADIX + id;
      }
      if (skip) continue;
      const cur = anchors.get(key);
      if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); } else anchors.set(key, { c: 1, pos: [i] });
    }
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
      if (!prev || prev.anchorHits < a.c) out.set(phrase, { phrase, win: len, anchorHits: a.c });
    }
  }
}

