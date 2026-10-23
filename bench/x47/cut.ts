/**
 * X47 screen 3 — DOES THE STACK ALREADY CAPTURE git-numstat's CONSTANT COLUMN?
 *
 * screen 2 classified the source instead of guessing at a mechanism, which is the
 * discipline X42's APOCOPE taught: it priced 756 raw tokens on vix and delivered
 * zero, because the dictionary had already hoisted what it removed.
 *
 * git-numstat is the weakest ops lane in the suite, 4,632 raw tokens down to 1,906,
 * only 2.4x against vix's 6.2x, and it is one of the largest, so tokens left there
 * are worth more than anywhere else. Its structure is extreme in two ways:
 *
 *   · the DELETE COLUMN IS CONSTANT. All 392 numstat rows carry dels = "0". One
 *     distinct value across 392 rows.
 *   · the PATHS ARE ALL DISTINCT but their DIRECTORIES ARE NOT. 392 unique paths
 *     over 15 distinct directories, "src/lib/omega" covering 152 rows and "bench"
 *     115, so 267 of 392 rows share one of two prefixes.
 *
 * A constant column is the purest possible case of redundancy and a directory prefix
 * repeated 152 times is the purest possible case for a dictionary rule, so if either
 * survives into the compressed wire it is a real and general gap -- tabular output is
 * everyday ops text, and `git log --numstat`, `git diff --stat`, CSV exports and
 * log listings all have constant or near-constant columns.
 *
 * The test is X42's screen10 pattern, which was the decisive measurement there: cut
 * the redundancy out of the SOURCE by hand and compare the compressed size of source
 * against cut. If the stack already captures it, the two come out equal and the idea
 * is dead before any code is written. Measured at the chiron and oikonomia levels
 * rather than the full stack, because the full stack takes minutes on this lane and
 * the question is only whether the redundancy is captured, not by which layer.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode, chironDecode } from '@/lib/omega/chiron';
import { oikonomiaEncode, oikonomiaDecode } from '@/lib/omega/oikonomia';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const src = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;

  // ---- CUT A: drop the constant delete column entirely ----
  const cutA = src.split('\n').map((l) => {
    const m = /^(\d+)\t(0)\t(.*)$/.exec(l);
    return m ? `${m[1]}\t${m[3]}` : l;
  }).join('\n');

  // ---- CUT B: also factor the two dominant directory prefixes ----
  const cutB = cutA
    .split('src/lib/omega/').join('@')
    .split('bench/').join('#');

  console.log(`\n=== ${nm}`);
  for (const [label, text] of [['SOURCE   ', src], ['CUT A (-const col)', cutA], ['CUT B (+dir prefix)', cutB]] as Array<[string, string]>) {
    const raw = countTokens(text, enc);
    const t0 = Date.now();
    const c = chironEncode(text, enc);
    const t1 = Date.now();
    const o = oikonomiaEncode(text, enc);
    const t2 = Date.now();
    const cOk = chironDecode(c.wire) === text;
    let oOk = false;
    try { oOk = oikonomiaDecode(o.wire, { stats: o.stats, order: o.order, undo: chironDecode } as any) === text; } catch { oOk = false; }
    console.log(`  ${label.padEnd(20)} ${String(text.length).padStart(6)} ch  raw=${String(raw).padStart(5)}  chiron=${String(c.messageTokens).padStart(5)} (${(t1 - t0)}ms,${cOk ? 'EXACT' : 'FAIL'})  oikonomia=${String(o.messageTokens).padStart(5)} (${(t2 - t1)}ms,${oOk ? 'EXACT' : 'FAIL'})`);
  }
  const baseRaw = countTokens(src, enc);
  const aRaw = countTokens(cutA, enc);
  const bRaw = countTokens(cutB, enc);
  console.log(`  raw deltas: source ${baseRaw} -> cutA ${aRaw} (${baseRaw - aRaw} removed) -> cutB ${bRaw} (${aRaw - bRaw} more removed)`);
  const cS = chironEncode(src, enc).messageTokens, cA = chironEncode(cutA, enc).messageTokens, cB = chironEncode(cutB, enc).messageTokens;
  console.log(`  chiron:     source ${cS} -> cutA ${cA} (delta ${cS - cA}) -> cutB ${cB} (delta ${cA - cB})`);
  const oS = oikonomiaEncode(src, enc).messageTokens, oA = oikonomiaEncode(cutA, enc).messageTokens, oB = oikonomiaEncode(cutB, enc).messageTokens;
  console.log(`  oikonomia:  source ${oS} -> cutA ${oA} (delta ${oS - oA}) -> cutB ${oB} (delta ${oA - oB})`);
  console.log(`  ATTENUATION: ${(baseRaw - aRaw)} raw tokens of constant column -> ${(oS - oA)} compressed; ${(aRaw - bRaw)} raw of dir prefix -> ${(oA - oB)} compressed`);
}
