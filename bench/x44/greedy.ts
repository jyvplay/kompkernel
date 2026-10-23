/**
 * X44 screen 5 — TWO DECISIVE QUESTIONS ON THE RESIDUAL BODY.
 *
 * screen 3 pruned rules by an APPROXIMATE criterion (one-token phrase) and lost
 * 19-36 tokens per lane. The economics say the criterion was too blunt: with a
 * reference costing about 0.6-0.75 tokens and a definition about 2, a one-token
 * phrase pays for itself only above roughly eight uses, so " a" at 17 uses should
 * stay and " discovered" at 2 uses should go. That predicts a real but partial
 * win, and the only way to know is to measure each removal exactly.
 *
 * Q1: greedy rule pruning by EXACT measured delta. Remove one rule at a time,
 *     whichever actually reduces countTokens of the whole frame most, re-measure,
 *     repeat until nothing helps. Then decode the result to prove it is still a
 *     valid wire for the same source.
 *
 * Q2: is there any repeated multi-token phrase LEFT in the body? X42 recorded
 *     that phrase-level n-gram dictionaries are exhausted on prose (saturation
 *     ratio above 1 on every prose lane), which would mean no augmentation pass
 *     can find anything. This checks that directly on the shipped body rather
 *     than on the source.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { krisisEncode } from '@/lib/omega/krisis';
import { chironParseTape, chironDecode, CHIRON_SCRIPTS, chironInScript, type ChironScript } from '@/lib/omega/chiron';

const enc = 'o200k_base' as EncodingName;
const scriptOf = (ch: string): ChironScript | null => {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
};
const REP = '\u00d7', LIST = '\u2026';

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const src = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const r: any = krisisEncode(src, enc);
  const wire: string = r.wire;
  const i = wire.indexOf('§');
  const frame = wire.slice(i);                  // INCLUDES the leading §
  const sepIdx = frame.indexOf('¶');
  let tape = frame.slice(1, sepIdx), body = frame.slice(sepIdx + 1);
  const script = scriptOf(tape[0]);
  const parsed = script ? chironParseTape(tape, script) : null;
  if (!parsed) { console.log(`${nm}: no tape`); continue; }

  const raws = new Map<string, string>();
  for (const rule of parsed) raws.set(rule.glyph, rule.raw);
  const expanded = new Map<string, string>();
  for (const [g, raw] of raws) {
    let t = raw;
    if (raw[0] !== REP && raw[0] !== LIST) for (const [h, v] of expanded) t = t.split(h).join(v);
    expanded.set(g, t);
  }

  const rebuild = (keep: Set<string>) => {
    let t = '';
    for (const [g, raw] of raws) {
      if (!keep.has(g)) continue;
      let x = raw;
      for (const h of raws.keys()) if (!keep.has(h)) x = x.split(h).join(expanded.get(h) ?? h);
      t += g + x;
    }
    let b = body;
    for (const h of raws.keys()) if (!keep.has(h)) b = b.split(h).join(expanded.get(h) ?? h);
    return '§' + t + '¶' + b;
  };

  // ---------------- Q1: exact greedy pruning ----------------
  const base = countTokens(frame, enc);
  let keep = new Set(raws.keys());
  let cur = base, removed: string[] = [];
  for (let iter = 0; iter < raws.size; iter++) {
    let bestG = '', bestTk = cur;
    for (const g of keep) {
      const trial = new Set(keep); trial.delete(g);
      const tk = countTokens(rebuild(trial), enc);
      if (tk < bestTk) { bestTk = tk; bestG = g; }
    }
    if (!bestG) break;
    keep.delete(bestG); removed.push(bestG); cur = bestTk;
  }
  const prunedWire = rebuild(keep);
  let dec = '';
  try { dec = chironDecode(prunedWire); } catch { dec = ''; }
  console.log(`\n=== ${nm}`);
  console.log(`  Q1 exact greedy prune: rules ${raws.size} -> ${keep.size}; frame ${base} -> ${cur} tok   GAIN ${base - cur}`);
  console.log(`     message ${r.messageTokens} -> ${r.messageTokens - (base - cur)}`);
  console.log(`     removed: ${removed.map((g) => JSON.stringify(expanded.get(g))).join(' ')}`);
  console.log(`     pruned wire decodes to source: ${dec === src ? 'YES (byte-exact)' : '*** NO ***'}`);

  // ---------------- Q2: repeated phrases left in the body ----------------
  const b = body;
  for (const L of [8, 12, 16, 24]) {
    const seen = new Map<string, number>();
    for (let k = 0; k + L <= b.length; k++) {
      const s = b.slice(k, k + L);
      seen.set(s, (seen.get(s) ?? 0) + 1);
    }
    const reps = [...seen.entries()].filter(([, n]) => n >= 2);
    // collapse overlapping hits: count distinct maximal repeated phrases crudely
    const uniq = reps.filter(([s]) => !reps.some(([t]) => t !== s && t.includes(s)));
    const top = uniq.sort((x, y) => y[1] - x[1]).slice(0, 4);
    const mass = uniq.reduce((m, [s, n]) => m + (n - 1) * (countTokens(s, enc) - 1), 0);
    console.log(`  Q2 body repeats L=${String(L).padStart(2)}: ${String(uniq.length).padStart(4)} distinct repeated phrases, best-case token mass ${String(mass).padStart(4)}${top.length ? '  top: ' + top.map(([s, n]) => `${n}x ${JSON.stringify(s.slice(0, 26))}`).join('  ') : ''}`);
  }
}
