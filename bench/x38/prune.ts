import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const enc: any = 'o200k_base';

type R = { glyph: string; raw: string };

/**
 * Rule-set auction.  The wire is a straight-line program: a tape of
 * (glyph -> expansion) pairs plus a body that references them.  Dropping a
 * rule costs nothing in the glossary and returns its expansion to the body as
 * literal text, so the whole rule SET can be scored exactly by re-tokenizing.
 */
function build(rules: R[], body: string, contract: string) {
  const n = rules.length;
  // exp[i] = the fully expanded (source-level) text of rule i.
  // A rule only references rules defined BEFORE it (topological tape order).
  const exp: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = rules[i].raw;
    for (let j = 0; j < i; j++) if (s.includes(rules[j].glyph)) s = s.split(rules[j].glyph).join(exp[j]);
    exp[i] = s;
  }
  const total = (kept: boolean[]) => {
    let tb = body, tt = '';
    // removed rules: literalise their glyph everywhere
    for (let i = n - 1; i >= 0; i--) {
      if (kept[i]) continue;
      tb = tb.split(rules[i].glyph).join(exp[i]);
    }
    for (let i = 0; i < n; i++) {
      if (!kept[i]) continue;
      let raw = rules[i].raw;
      for (let j = n - 1; j >= 0; j--) if (!kept[j]) raw = raw.split(rules[j].glyph).join(exp[j]);
      tt += rules[i].glyph + raw;
    }
    return countTokens(contract, enc) + countTokens('\u00a7' + tt + '\u00b6' + tb, enc);
  };
  return { total, exp };
}

for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const r: any = anadiplosisEncode(t, enc);
  const cut = r.wire.indexOf('\u00b6', 1);
  if (cut < 0) { console.log(p, 'no tape'); continue; }
  let rules: R[] | null = null;
  for (const s of CHIRON_SCRIPTS) { const rr = chironParseTape(r.wire.slice(1, cut), s); if (rr) { rules = rr; break; } }
  if (!rules) { console.log(p, 'unparsed'); continue; }
  const body = r.wire.slice(cut + 1);
  const { total } = build(rules, body, r.contract);

  const all = new Array(rules.length).fill(true);
  const start = total(all);
  const baseline = r.messageTokens;
  let kept = all.slice();
  let curTok = start;
  let removed = 0;
  for (let iter = 0; iter < 500; iter++) {
    let bestI = -1, bestTok = curTok;
    for (let i = 0; i < rules.length; i++) {
      if (!kept[i]) continue;
      kept[i] = false;
      const c = total(kept);
      kept[i] = true;
      if (c < bestTok) { bestTok = c; bestI = i; }
    }
    if (bestI < 0) break;
    kept[bestI] = false;
    curTok = bestTok;
    removed++;
  }
  const nKeep = kept.filter(Boolean).length;
  console.log(
    p.split('/').pop()!.padEnd(26),
    'baseline=' + String(baseline).padStart(5),
    'recomputed=' + String(start).padStart(5),
    'rules=' + String(rules.length).padStart(4) + '->' + String(nKeep).padStart(4),
    'afterPrune=' + String(curTok).padStart(5),
    'PRUNE_GAIN=' + String(curTok - start).padStart(5),
    'removed=' + removed,
  );
}
