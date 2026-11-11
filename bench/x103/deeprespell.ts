/**
 * X103 — ARE ΠΡΟΟΙΜΙΟΝ'S SEARCH BOUNDS BINDING?
 *
 * ΠΡΟΟΙΜΙΟΝ's `segmentations` is a DFS that stops after MAX_SEGMENTATIONS = 400
 * results and MAX_PARTS = 5 parts, and it walks factor lengths from LONGEST to
 * SHORTEST, so the first 400 results are biased toward long factors at the front.
 * If a value's cheapest interleaving has more than 5 parts, or is reached after
 * the 400th result, the search never sees it — and the stack ships a more
 * expensive wire without ever knowing.
 *
 * MEASURED HERE: on the shipped wire of six lanes, the best whole-message gain
 * obtainable by re-spelling ONE value, under the shipped bounds (400, 5) and under
 * deep bounds (2 000, 8).  Same re-speller, same gate, same pricing — only the
 * bounds differ.  If deep == bounded everywhere, the bounds are not the lever and
 * the idea is falsified rather than assumed.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const lanes = ['bench/holdout-x41/ps-aux-real.txt', 'bench/holdout/code-ts.txt', 'bench/holdout-x42/dpkg-l.txt', 'bench/holdout-x41/ls-real.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout-x41/apt-real.txt'];
function parseTape(msg: string) {
  const w = msg.indexOf(CHIRON_START); const t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = []; const values: string[] = [];
  const seen = new Set<string>(); let ck = ''; let cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values, body: msg.slice(t + CHIRON_SEP.length), contract: msg.slice(0, w) };
}
const serialise = (tp: any, keys: string[], values: string[]) =>
  tp.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + tp.body;
function segs(target: string, idx: Map<string, string[]>, maxSeg: number, maxParts: number): string[] {
  const out: string[] = [];
  const walk = (pos: number, acc: string, parts: number): void => {
    if (out.length >= maxSeg) return;
    if (pos === target.length) { out.push(acc); return; }
    if (parts >= maxParts) return;
    for (let L = target.length - pos; L >= 1; L--) {
      const sub = target.slice(pos, pos + L);
      const ks = idx.get(sub);
      if (ks !== undefined) { for (const k of ks) { walk(pos + L, acc + k, parts + 1); if (out.length >= maxSeg) return; } }
      walk(pos + L, acc + sub, parts + 1);
    }
  };
  walk(0, '', 0);
  return out;
}
let gB = 0, gD = 0, gCandB = 0, gCandD = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parseTape(String(R.message));
  const { keys, values } = tp;
  let bestB = 0, bestD = 0, candB = 0, candD = 0;
  for (let i = 0; i < keys.length; i++) {
    const idx = new Map<string, string[]>();
    for (let q = 0; q < i; q++) {
      const v = values[q]; if (v.length < 2) continue;
      const a = idx.get(v); if (a === undefined) idx.set(v, [keys[q]]); else a.push(keys[q]);
    }
    const target = values[i];
    if (target.length < 2) continue;
    for (const [ms, mp, isDeep] of [[400, 5, false], [2000, 8, true]] as Array<[number, number, boolean]>) {
      const cands = segs(target, idx, ms, mp);
      if (isDeep) candD += cands.length; else candB += cands.length;
      const saved = values[i];
      let best = 0;
      for (const c of cands) {
        if (c === saved) continue;
        values[i] = c;
        const t = countTokens(serialise(tp, keys, values), enc);
        const gain = R.messageTokens - t;
        if (gain > best) best = gain;
      }
      values[i] = saved;
      if (isDeep) { if (best > bestD) bestD = best; } else { if (best > bestB) bestB = best; }
    }
  }
  gB += bestB; gD += bestD; gCandB += candB; gCandD += candD;
  console.log(`${p.split('/').pop()!.padEnd(18)} rules=${String(keys.length).padStart(3)}  bounded(400,5) best single-value gain=${String(bestB).padStart(3)} tok  deep(2000,8) best=${String(bestD).padStart(3)} tok  cands ${candB} vs ${candD}`);
}
console.log(`\nΣ over 6 lanes: bounded best-gain ${gB} tok, deep best-gain ${gD} tok; candidates generated ${gCandB} vs ${gCandD}`);
console.log(gD > gB ? '  => THE BOUNDS ARE BINDING: the deep search finds re-spellings the shipped one cannot see.' : '  => the bounds are NOT the lever: deep == bounded.');
fs.writeFileSync('bench/x103/receipts/deeprespell.json', JSON.stringify({ note: 'X103: is PROOIMION search bound (MAX_SEGMENTATIONS 400, MAX_PARTS 5) binding? best single-value whole-message gain under shipped vs deep bounds', boundedBestGain: gB, deepBestGain: gD, candsBounded: gCandB, candsDeep: gCandD }, null, 1));
