// Z31: current PHALANX-A5 (six-width tournament, each width a full A4 encode) vs a single-pass width rule.
// Single-pass rule (non-tournament): W* = the width in [20,200] whose greedyWrap explains the most LINES of multi-line
// paragraphs (ties -> larger W); one wrapEncode at W*; one A4 encode; kept iff cheaper than the plain A4 wire (o200k).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA4Encode, phalanxA4Decode } from '@/lib/omega/phalanx-a4';
import { phalanxA5Encode, phalanxA5Decode } from '@/lib/omega/phalanx-a5';
import { greedyWrap, wrapEncode, wrapPickKeep } from '@/lib/omega/wrapcanon';
const enc = 'o200k_base' as const;
const [listFile, outFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
function pickWidth(text: string): number {
  const lines = text.split('\n');
  const paras: string[][] = []; let cur: string[] = [];
  for (const l of lines) { if (l.trim() === '') { if (cur.length) paras.push(cur); cur = []; } else cur.push(l); }
  if (cur.length) paras.push(cur);
  const multi = paras.filter((p) => p.length >= 2);
  let bestW = 0, bestL = -1;
  for (let W = 20; W <= 200; W++) {
    let L = 0;
    for (const p of multi) if (greedyWrap(p.join(' '), W).join('\n') === p.join('\n')) L += p.length;
    if (L >= bestL) { bestL = L; bestW = W; }
  }
  return bestL > 0 ? bestW : 0;
}
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const rec: Record<string, unknown> = { file: f, inT: countTokens(t, enc) };
  let t0 = performance.now();
  const cur = phalanxA5Encode(t, enc);
  rec.curT = cur.outTokens; rec.curLayer = cur.layer; rec.curW = cur.width; rec.curMs = Math.round(performance.now() - t0);
  rec.curOk = phalanxA5Decode(cur.wire) === t;
  t0 = performance.now();
  const keep = wrapPickKeep(t);
  const a4 = phalanxA4Encode(t, enc);
  let wire = a4.wire, layer = 'a4', W = 0;
  if (keep !== null) {
    const Wstar = pickWidth(t);
    const e = Wstar > 0 ? wrapEncode(t, Wstar, keep) : null;
    if (e !== null) {
      const w = '[[WRP\n# WRP: width=' + Wstar + ' keep=' + keep + ' a line starting with ' + keep + ' is kept as it is; a single line longer than ' + Wstar + ' is re-wrapped greedily at ' + Wstar + ' columns; the rest is the A4 wire of that text.\n' + phalanxA4Encode(e, enc).wire;
      if (countTokens(w, enc) < countTokens(a4.wire, enc)) { wire = w; layer = 'wrp'; W = Wstar; }
    }
  }
  rec.singT = countTokens(wire, enc); rec.singLayer = layer; rec.singW = W; rec.singMs = Math.round(performance.now() - t0);
  rec.singOk = phalanxA5Decode(wire) === t;
  fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
}
console.log('done', files.length);
