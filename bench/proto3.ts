/** PRISM prototype: partition-DP x exhaustive-cascade + global post-pass. */
import { corpus } from './fixtures';
import { countTokens } from '../src/lib/omega/bpe';
import { mosaicEncode, mosaicDecode } from '../src/lib/omega/mosaic';
import { signetEncode, signetDecode } from '../src/lib/omega/signet';
import { helixEncode, helixDecode } from '../src/lib/omega/helix';
import { pulseEncode, pulseDecode } from '../src/lib/omega/pulse';
import { anaphoraEncode, anaphoraDecode } from '../src/lib/omega/anaphora';
import { praxisEncode, praxisDecode } from '../src/lib/omega/praxis';
import { lumenEncode, lumenDecode } from '../src/lib/omega/lumen';

const enc = 'o200k_base' as const;
interface Lane { t: string; e: (s: string) => { wire: string; applied: boolean }; d: (w: string) => string }
const LANES: Lane[] = [
  { t: 'g', e: (s) => { const r = signetEncode(s, enc); return { wire: r.wire, applied: r.mode === 'signet' }; }, d: signetDecode },
  { t: 'h', e: (s) => { const r = helixEncode(s, enc); return { wire: r.wire, applied: r.mode === 'factored' }; }, d: helixDecode },
  { t: 'p', e: (s) => { const r = pulseEncode(s, enc); return { wire: r.wire, applied: r.mode === 'pulse' }; }, d: pulseDecode },
  { t: 'a', e: (s) => { const r = anaphoraEncode(s, enc); return { wire: r.wire, applied: r.mode === 'anaphoric' }; }, d: anaphoraDecode },
  { t: 'x', e: (s) => { const r = praxisEncode(s, enc); return { wire: r.wire, applied: r.mode === 'praxis' }; }, d: praxisDecode },
];
const BY = new Map(LANES.map((l) => [l.t, l]));
function decCascade(wire: string, tags: string) { let w = wire; for (let i = tags.length - 1; i >= 0; i--) w = BY.get(tags[i])!.d(w); return w; }

function exhaustive(src: string, maxd: number) {
  let best = { tags: '', wire: src, tok: countTokens(src, enc) };
  const rec = (wire: string, tags: string) => {
    if (tags.length >= maxd) return;
    for (const lane of LANES) {
      if (tags.indexOf(lane.t) !== -1) continue;
      let r; try { r = lane.e(wire); } catch { continue; }
      if (!r.applied) continue;
      const nt = tags + lane.t;
      let ok = false; try { ok = decCascade(r.wire, nt) === src; } catch { ok = false; }
      if (ok) { const tk = countTokens(r.wire, enc); if (tk < best.tok) best = { tags: nt, wire: r.wire, tok: tk }; }
      rec(r.wire, nt);
    }
  };
  rec(src, '');
  return best;
}

function classOf(c: number) { return c >= 48 && c <= 57 ? 1 : (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ? 2 : 3; }
function lineRegime(line: string) { let s = ''; let i = 0; const n = Math.min(line.length, 200); while (i < n) { const c = classOf(line.charCodeAt(i)); let j = i + 1; while (j < n && classOf(line.charCodeAt(j)) === c) j++; s += c; i = j; if (s.length >= 48) break; } return s; }
function bounds(lines: string[], MAXB: number) {
  let b = [0]; for (let i = 1; i < lines.length; i++) if (lineRegime(lines[i]) !== lineRegime(lines[i - 1])) b.push(i); b.push(lines.length);
  const cum = new Float64Array(lines.length + 1); for (let i = 0; i < lines.length; i++) cum[i + 1] = cum[i] + lines[i].length + 1;
  while (b.length - 1 > 512) { const m = [b[0]]; for (let i = 2; i < b.length; i += 2) m.push(b[i]); if (m[m.length - 1] !== lines.length) m.push(lines.length); if (m.length >= b.length) break; b = m; }
  while (b.length - 1 > MAXB) { let v = 1, c = Infinity; for (let i = 1; i < b.length - 1; i++) { const s = cum[b[i + 1]] - cum[b[i - 1]]; if (s < c) { c = s; v = i; } } b.splice(v, 1); }
  return b;
}

function prism(text: string, MAXB: number, maxd: number) {
  const t0 = Date.now();
  const lines = text.split('\n');
  const bs = bounds(lines, MAXB);
  const B = bs.length - 1;
  const memo = new Map<string, any>();
  const span = (i: number, j: number) => { const k = i + ':' + j; let h = memo.get(k); if (!h) { h = exhaustive(lines.slice(bs[i], bs[j]).join('\n'), maxd); memo.set(k, h); } return h; };
  const whole = span(0, B);
  const best = new Float64Array(B + 1).fill(Infinity); const from = new Int32Array(B + 1).fill(-1); const pick: any[] = new Array(B + 1).fill(null);
  best[0] = 0;
  for (let j = 1; j <= B; j++) for (let i = 0; i < j; i++) {
    if (!Number.isFinite(best[i])) continue; const sb = span(i, j);
    const c = best[i] + sb.tok + 1 + Math.max(1, sb.tags.length);
    if (c < best[j]) { best[j] = c; from[j] = i; pick[j] = sb; }
  }
  return { dp: Math.min(best[B], whole.tok), whole: whole.tok, wtags: whole.tags, ms: Date.now() - t0, B };
}

/** post-pass: global lane applied on top of MOSAIC's finished wire */
function postpass(text: string) {
  const m = mosaicEncode(text, enc);
  let best = m.outTokens; let tag = '-';
  for (const lane of LANES) {
    let r; try { r = lane.e(m.wire); } catch { continue; }
    if (!r.applied) continue;
    let ok = false; try { ok = mosaicDecode(lane.d(r.wire)) === text; } catch { ok = false; }
    if (!ok) continue;
    const tk = countTokens(r.wire, enc);
    if (tk < best) { best = tk; tag = lane.t; }
  }
  return { best, tag, base: m.outTokens };
}

const c = corpus();
let sumM = 0, sumP = 0;
for (const [name, text] of Object.entries(c)) {
  const m = mosaicEncode(text, enc);
  const p = prism(text, 10, 3);
  const pp = postpass(text);
  const combined = Math.min(p.dp, pp.best);
  sumM += m.outTokens; sumP += combined;
  console.log(`${name.padEnd(11)} MOSAIC=${String(m.outTokens).padEnd(5)} PRISM-dp=${String(p.dp).padEnd(5)} whole=${String(p.whole).padEnd(5)}[${p.wtags}] post=${String(pp.best).padEnd(5)}[${pp.tag}] BEST=${String(combined).padEnd(5)} ${((1 - combined / m.outTokens) * 100).toFixed(1)}% ${p.ms}ms`);
}
console.log(`TOTAL mosaic=${sumM} prism=${sumP} gain=${((1 - sumP / sumM) * 100).toFixed(2)}%`);
